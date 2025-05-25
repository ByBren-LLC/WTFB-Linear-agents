#!/bin/bash

# OAuth Environment Configuration Validation Script
# This script validates that all required OAuth environment variables are properly configured

set -e

echo "🔍 Validating OAuth Environment Configuration..."

# Check if .env.template exists
if [ ! -f ".env.template" ]; then
    echo "❌ .env.template file not found"
    exit 1
fi

echo "✅ .env.template file exists"

# Check for required OAuth environment variables in template
required_vars=(
    "CONFLUENCE_CLIENT_ID"
    "CONFLUENCE_CLIENT_SECRET"
    "APP_URL"
    "SESSION_SECRET"
)

echo "🔍 Checking required OAuth variables in .env.template..."

for var in "${required_vars[@]}"; do
    if grep -q "^${var}=" .env.template; then
        echo "✅ $var found in .env.template"
    else
        echo "❌ $var missing from .env.template"
        exit 1
    fi
done

# Check Docker Compose configuration
echo "🔍 Checking Docker Compose environment variables..."

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml file not found"
    exit 1
fi

for var in "${required_vars[@]}"; do
    if grep -q "\- ${var}=\${${var}}" docker-compose.yml; then
        echo "✅ $var properly mapped in docker-compose.yml"
    else
        echo "❌ $var missing from docker-compose.yml environment section"
        exit 1
    fi
done

# Check backward compatibility
echo "🔍 Checking backward compatibility..."

legacy_vars=(
    "CONFLUENCE_USERNAME"
    "CONFLUENCE_API_TOKEN"
    "CONFLUENCE_BASE_URL"
)

for var in "${legacy_vars[@]}"; do
    if grep -q "^${var}=" .env.template; then
        echo "✅ Legacy variable $var maintained for backward compatibility"
    else
        echo "❌ Legacy variable $var missing - backward compatibility broken"
        exit 1
    fi
done

# Test .env file creation from template
echo "🔍 Testing .env file creation from template..."

if [ -f ".env" ]; then
    echo "⚠️  .env file already exists, backing up as .env.backup"
    mv .env .env.backup
fi

cp .env.template .env.test

# Fill in test values
sed -i 's/your_confluence_client_id/test_confluence_client_id/' .env.test
sed -i 's/your_confluence_client_secret/test_confluence_client_secret/' .env.test
sed -i 's/generate_a_random_session_secret_at_least_32_chars/test_session_secret_at_least_32_characters_long/' .env.test

echo "✅ Test .env file created successfully"

# Validate all required variables are set
echo "🔍 Validating test environment variables..."

for var in "${required_vars[@]}"; do
    if grep -q "^${var}=.*[^=]$" .env.test; then
        echo "✅ $var has a value in test .env"
    else
        echo "❌ $var is empty or missing in test .env"
        exit 1
    fi
done

# Clean up test file
rm .env.test

# Restore backup if it existed
if [ -f ".env.backup" ]; then
    mv .env.backup .env
    echo "✅ Original .env file restored"
fi

echo ""
echo "🎉 OAuth Environment Configuration Validation Complete!"
echo ""
echo "✅ All required OAuth environment variables are present"
echo "✅ Docker Compose configuration is correct"
echo "✅ Backward compatibility is maintained"
echo "✅ Environment file creation works correctly"
echo ""
echo "Next steps:"
echo "1. Copy .env.template to .env: cp .env.template .env"
echo "2. Fill in your actual OAuth credentials"
echo "3. Generate a secure session secret: openssl rand -base64 32"
echo "4. Test your OAuth configuration"
