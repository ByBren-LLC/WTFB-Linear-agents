#!/bin/bash

# =========================================================
# Agent Assignment Script
# =========================================================
# This script manages the complete agent assignment workflow:
# 1. Lists available work in /todo
# 2. Generates assignment messages from templates
# 3. Updates current assignments
# 4. Moves files through WIP workflow
# 5. Updates documentation
#
# Usage: ./scripts/assign-agents.sh [command] [options]
# Commands:
#   list     - List available work in /todo
#   status   - Show current assignment status
#   prepare  - Prepare assignments for a work package
#   move     - Move files through WIP workflow
#   help     - Show detailed help
# =========================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}=========================================================="
    echo -e "$1"
    echo -e "==========================================================${NC}"
}

print_section() {
    echo -e "${CYAN}$1${NC}"
    echo "-----------------------------------------------------------"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Command functions
list_available_work() {
    print_header "📋 Available Work in /todo"
    
    if [ ! -d "specs/todo" ]; then
        print_error "specs/todo directory not found"
        exit 1
    fi
    
    local count=0
    for file in specs/todo/*.md; do
        if [ "$file" != "specs/todo/README.md" ]; then
            count=$((count + 1))
            local basename=$(basename "$file" .md)

            # Handle different naming patterns for kickoff files
            local kickoff_file=""
            if [ -f "specs/kickoff_notes/${basename}_kickoff.md" ]; then
                kickoff_file="specs/kickoff_notes/${basename}_kickoff.md"
            elif [ -f "specs/kickoff_notes/$(echo $basename | tr '-' '_')_kickoff.md" ]; then
                kickoff_file="specs/kickoff_notes/$(echo $basename | tr '-' '_')_kickoff.md"
            fi

            local assignment_file="specs/todo/${basename}.md"
            
            echo -e "${PURPLE}$count.${NC} $(basename "$file")"
            
            # Check for supporting files
            if [ -n "$kickoff_file" ] && [ -f "$kickoff_file" ]; then
                echo -e "   ${GREEN}✅ Kickoff note: $(basename "$kickoff_file")${NC}"
            else
                echo -e "   ${RED}❌ Missing kickoff note${NC}"
            fi

            # Check if this is an assignment file itself
            if [[ "$basename" == *"assignments"* ]]; then
                echo -e "   ${BLUE}📋 This IS an assignment template file${NC}"
            else
                echo -e "   ${YELLOW}⚠️  Individual assignment template not found${NC}"
            fi
            echo ""
        fi
    done
    
    if [ $count -eq 0 ]; then
        print_warning "No work items available in /todo"
    else
        print_success "$count work items available for assignment"
    fi
}

show_assignment_status() {
    print_header "📊 Current Assignment Status"
    
    # Count files in each folder
    local todo_count=$(find specs/todo -maxdepth 1 -name "*.md" ! -name "README.md" | wc -l)
    local doing_count=$(find specs/doing -maxdepth 1 -name "*.md" ! -name "README.md" | wc -l)
    local done_count=$(find specs/done -maxdepth 1 -name "*.md" ! -name "README.md" | wc -l)
    
    echo -e "${CYAN}WIP Status:${NC}"
    echo "  📋 Todo: $todo_count files ready for assignment"
    echo "  🔄 Doing: $doing_count files currently in progress"
    echo "  ✅ Done: $done_count files completed"
    echo ""
    
    # Show current assignments if any
    if [ -f "specs/remote_agent_assignments/current.md" ]; then
        echo -e "${CYAN}Current Assignments:${NC}"
        grep -E "^## Agent #[0-9]+ Assignment" specs/remote_agent_assignments/current.md | sed 's/## /  /'
    else
        print_warning "No current assignments file found"
    fi
}

prepare_assignments() {
    print_header "🚀 Preparing Agent Assignments"

    # Check if Slack integration assignments exist
    local slack_assignments="specs/todo/agent_operations_slack_integration_assignments.md"

    if [ ! -f "$slack_assignments" ]; then
        print_error "Slack integration assignments file not found: $slack_assignments"
        exit 1
    fi

    print_section "📋 Current Slack Integration Work Package"
    echo "The following assignments are ready to deploy:"
    echo ""

    # Extract assignment summaries
    grep -A 1 "^## Agent #" "$slack_assignments" | grep -v "^--$" | while read line; do
        if [[ "$line" =~ ^##\ Agent\ #([0-9]+)\ Assignment$ ]]; then
            echo -e "${PURPLE}Agent #${BASH_REMATCH[1]}${NC}"
        elif [[ "$line" =~ ^#\ Remote\ Agent\ Assignment:\ (.+)$ ]]; then
            echo -e "  ${CYAN}Task: ${BASH_REMATCH[1]}${NC}"
        fi
    done
    echo ""

    print_section "📝 Next Steps"
    echo "1. Copy assignments from: $slack_assignments"
    echo "2. Send to remote agents (Augment Code Remote, Claude CLI, etc.)"
    echo "3. When agents start work, run: ./scripts/assign-agents.sh move [filename] doing"
    echo "4. Update current assignments: ./scripts/assign-agents.sh update-current"
    echo ""

    print_success "Slack integration work package ready for deployment!"
}

move_file() {
    local filename="$1"
    local target_folder="$2"

    if [ -z "$filename" ] || [ -z "$target_folder" ]; then
        print_error "Usage: ./scripts/assign-agents.sh move [filename] [target_folder]"
        echo "Example: ./scripts/assign-agents.sh move enhanced-slack-notifier-story.md doing"
        exit 1
    fi

    local source_file=""
    local target_file=""

    # Find the file in WIP folders
    for folder in todo doing done blocked; do
        if [ -f "specs/$folder/$filename" ]; then
            source_file="specs/$folder/$filename"
            break
        fi
    done

    if [ -z "$source_file" ]; then
        print_error "File not found: $filename"
        exit 1
    fi

    target_file="specs/$target_folder/$filename"

    if [ ! -d "specs/$target_folder" ]; then
        print_error "Target folder does not exist: specs/$target_folder"
        exit 1
    fi

    print_section "📁 Moving File Through WIP Workflow"
    echo "Source: $source_file"
    echo "Target: $target_file"
    echo ""

    # Move the file
    git mv "$source_file" "$target_file"

    print_success "File moved successfully!"
    echo ""
    echo "🔄 To commit this change:"
    echo "  git commit -m 'workflow: move $(basename $filename .md) to $target_folder'"
    echo ""
    echo "📊 Updated WIP status:"
    ./scripts/assign-agents.sh status
}

update_current_assignments() {
    print_header "📝 Updating Current Assignments"

    local slack_assignments="specs/todo/agent_operations_slack_integration_assignments.md"
    local current_assignments="specs/remote_agent_assignments/current.md"

    if [ ! -f "$slack_assignments" ]; then
        print_error "Source assignments file not found: $slack_assignments"
        exit 1
    fi

    # Create backup
    if [ -f "$current_assignments" ]; then
        cp "$current_assignments" "${current_assignments}.backup"
        print_success "Created backup: ${current_assignments}.backup"
    fi

    # Copy the Slack assignments to current
    cp "$slack_assignments" "$current_assignments"

    # Update branch references from main to dev
    sed -i 's|/main/|/dev/|g' "$current_assignments"
    sed -i 's|main branch|dev branch|g' "$current_assignments"

    print_success "Updated current assignments with Slack integration work package"
    print_success "Fixed branch references (main → dev)"

    echo ""
    echo "🔄 To commit this change:"
    echo "  git add $current_assignments"
    echo "  git commit -m 'docs: update current assignments with Slack integration work package'"
}

# Main command handling
case "${1:-help}" in
    "list")
        list_available_work
        ;;
    "status")
        show_assignment_status
        ;;
    "prepare")
        prepare_assignments
        ;;
    "move")
        move_file "$2" "$3"
        ;;
    "update-current")
        update_current_assignments
        ;;
    "help"|*)
        print_header "🤖 Agent Assignment Script Help"
        echo "Available commands:"
        echo ""
        echo -e "${CYAN}./scripts/assign-agents.sh list${NC}"
        echo "  List all available work items in /todo with their status"
        echo ""
        echo -e "${CYAN}./scripts/assign-agents.sh status${NC}"
        echo "  Show current assignment status and WIP counts"
        echo ""
        echo -e "${CYAN}./scripts/assign-agents.sh prepare${NC}"
        echo "  Prepare current work package for agent assignment"
        echo ""
        echo -e "${CYAN}./scripts/assign-agents.sh move [filename] [target]${NC}"
        echo "  Move files through WIP workflow (todo→doing→done)"
        echo "  Example: ./scripts/assign-agents.sh move enhanced-slack-notifier-story.md doing"
        echo ""
        echo -e "${CYAN}./scripts/assign-agents.sh update-current${NC}"
        echo "  Update current assignments with latest work package"
        echo ""
        echo -e "${CYAN}./scripts/assign-agents.sh help${NC}"
        echo "  Show this help message"
        echo ""
        echo "📚 For detailed workflow documentation, see:"
        echo "  specs/templates/remote_agent_workflow.md"
        echo "  specs/README.md"
        echo ""
        echo "🔄 Complete Workflow Example:"
        echo "  1. ./scripts/assign-agents.sh list              # See available work"
        echo "  2. ./scripts/assign-agents.sh prepare           # Prepare assignments"
        echo "  3. ./scripts/assign-agents.sh update-current    # Update current assignments"
        echo "  4. [Send assignments to agents]"
        echo "  5. ./scripts/assign-agents.sh move [file] doing # When agent starts"
        echo "  6. ./scripts/assign-agents.sh move [file] done  # When agent completes"
        ;;
esac
