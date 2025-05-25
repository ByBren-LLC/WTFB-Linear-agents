#!/bin/bash

# OAuth Flow Testing Script
# This script tests the OAuth flows for both Linear and Confluence

set -e

echo "🔐 OAuth Flow Testing Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:3000"
TIMEOUT=30

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2
    
    print_status "Checking if $service_name is running..."
    
    if curl -s --max-time 5 "$url" > /dev/null; then
        print_success "$service_name is running"
        return 0
    else
        print_error "$service_name is not running"
        return 1
    fi
}

# Function to check environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    local missing_vars=()
    
    # Check Linear OAuth variables
    if [ -z "$LINEAR_CLIENT_ID" ]; then
        missing_vars+=("LINEAR_CLIENT_ID")
    fi
    
    if [ -z "$LINEAR_CLIENT_SECRET" ]; then
        missing_vars+=("LINEAR_CLIENT_SECRET")
    fi
    
    # Check Confluence OAuth variables
    if [ -z "$CONFLUENCE_CLIENT_ID" ]; then
        missing_vars+=("CONFLUENCE_CLIENT_ID")
    fi
    
    if [ -z "$CONFLUENCE_CLIENT_SECRET" ]; then
        missing_vars+=("CONFLUENCE_CLIENT_SECRET")
    fi
    
    # Check application variables
    if [ -z "$APP_URL" ]; then
        missing_vars+=("APP_URL")
    fi
    
    if [ -z "$SESSION_SECRET" ]; then
        missing_vars+=("SESSION_SECRET")
    fi
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All required environment variables are set"
        return 0
    else
        print_error "Missing environment variables: ${missing_vars[*]}"
        return 1
    fi
}

# Function to test OAuth endpoint accessibility
test_oauth_endpoints() {
    print_status "Testing OAuth endpoint accessibility..."
    
    local endpoints=(
        "/auth"
        "/auth/confluence"
        "/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="$APP_URL$endpoint"
        print_status "Testing $url..."
        
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
        
        if [ "$response_code" = "302" ] || [ "$response_code" = "200" ]; then
            print_success "✓ $endpoint responds correctly (HTTP $response_code)"
        else
            print_error "✗ $endpoint failed (HTTP $response_code)"
        fi
    done
}

# Function to test database connectivity
test_database() {
    print_status "Testing database connectivity..."
    
    # Try to connect to the database using docker
    if docker-compose exec -T db psql -U postgres -d linear_agent -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
        
        # Check if required tables exist
        print_status "Checking database tables..."
        
        local tables=("linear_tokens" "confluence_tokens")
        for table in "${tables[@]}"; do
            if docker-compose exec -T db psql -U postgres -d linear_agent -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
                print_success "✓ Table $table exists and is accessible"
            else
                print_warning "⚠ Table $table may not exist or is not accessible"
            fi
        done
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Function to display OAuth URLs for manual testing
display_oauth_urls() {
    print_status "OAuth URLs for manual testing:"
    echo ""
    echo -e "${BLUE}Linear OAuth:${NC}"
    echo "  $APP_URL/auth"
    echo ""
    echo -e "${BLUE}Confluence OAuth:${NC}"
    echo "  $APP_URL/auth/confluence"
    echo ""
    echo -e "${YELLOW}Instructions:${NC}"
    echo "1. Open the URLs above in your browser"
    echo "2. Complete the OAuth authorization process"
    echo "3. Verify you see the success page"
    echo "4. Check the application logs for token storage confirmation"
    echo ""
}

# Function to check Docker containers
check_docker_containers() {
    print_status "Checking Docker containers..."
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed"
        return 1
    fi
    
    # Check if containers are running
    local app_status=$(docker-compose ps -q app 2>/dev/null)
    local db_status=$(docker-compose ps -q db 2>/dev/null)
    
    if [ -n "$app_status" ] && [ -n "$db_status" ]; then
        print_success "Docker containers are running"
        
        # Show container status
        print_status "Container status:"
        docker-compose ps
    else
        print_error "Docker containers are not running"
        print_status "Starting Docker containers..."
        docker-compose up -d
        
        # Wait for containers to start
        print_status "Waiting for containers to start..."
        sleep 10
    fi
}

# Function to show application logs
show_logs() {
    print_status "Recent application logs:"
    echo ""
    docker-compose logs --tail=20 app
    echo ""
}

# Main testing function
run_tests() {
    echo ""
    print_status "Starting OAuth flow tests..."
    echo ""
    
    # Check Docker containers
    if ! check_docker_containers; then
        print_error "Docker container check failed"
        exit 1
    fi
    
    # Wait for application to start
    print_status "Waiting for application to start..."
    sleep 5
    
    # Check if application is running
    if ! check_service "$APP_URL/health" "Application"; then
        print_error "Application health check failed"
        show_logs
        exit 1
    fi
    
    # Check environment variables
    if ! check_env_vars; then
        print_error "Environment variable check failed"
        exit 1
    fi
    
    # Test OAuth endpoints
    test_oauth_endpoints
    
    # Test database
    test_database
    
    # Display OAuth URLs for manual testing
    display_oauth_urls
    
    print_success "OAuth flow tests completed!"
    print_status "You can now manually test the OAuth flows using the URLs above."
}

# Function to clean up test environment
cleanup() {
    print_status "Cleaning up test environment..."
    
    # Stop containers
    docker-compose down
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "OAuth Flow Testing Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  test      Run OAuth flow tests (default)"
    echo "  cleanup   Stop Docker containers and clean up"
    echo "  logs      Show application logs"
    echo "  help      Show this help message"
    echo ""
    echo "Environment Variables Required:"
    echo "  LINEAR_CLIENT_ID"
    echo "  LINEAR_CLIENT_SECRET"
    echo "  CONFLUENCE_CLIENT_ID"
    echo "  CONFLUENCE_CLIENT_SECRET"
    echo "  APP_URL (default: http://localhost:3000)"
    echo "  SESSION_SECRET"
    echo ""
}

# Parse command line arguments
case "${1:-test}" in
    "test")
        run_tests
        ;;
    "cleanup")
        cleanup
        ;;
    "logs")
        show_logs
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
