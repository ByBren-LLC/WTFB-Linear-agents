#!/bin/bash

# =========================================================
# WIP Folder Count Updater Script
# =========================================================
# This script automatically counts files in each WIP folder
# and updates the README.md files with accurate counts.
# 
# Usage: ./scripts/update-wip-counts.sh
# =========================================================

echo "🔍 Updating WIP folder counts..."

# Function to count .md files excluding README.md
count_md_files() {
    local dir=$1
    if [ -d "$dir" ]; then
        find "$dir" -maxdepth 1 -name "*.md" ! -name "README.md" | wc -l
    else
        echo "0"
    fi
}

# Count files in each folder
TODO_COUNT=$(count_md_files "specs/todo")
DOING_COUNT=$(count_md_files "specs/doing")
DONE_COUNT=$(count_md_files "specs/done")
BLOCKED_COUNT=$(count_md_files "specs/blocked")
ARCHIVE_COUNT=$(count_md_files "specs/archive")
TEMPLATES_COUNT=$(count_md_files "specs/templates")
KICKOFF_COUNT=$(find specs/kickoff_notes -maxdepth 1 -name "*.md" | wc -l)

echo "📊 Current counts:"
echo "  Todo: $TODO_COUNT files"
echo "  Doing: $DOING_COUNT files"
echo "  Done: $DONE_COUNT files"
echo "  Blocked: $BLOCKED_COUNT files"
echo "  Archive: $ARCHIVE_COUNT files"
echo "  Templates: $TEMPLATES_COUNT files"
echo "  Kickoff Notes: $KICKOFF_COUNT files"

# Update main specs/README.md
if [ -f "specs/README.md" ]; then
    echo "📝 Updating specs/README.md..."
    
    # Update the counts in the main README
    sed -i "s/- \*\*[0-9]* files\*\* ready for immediate assignment/- **$TODO_COUNT files** ready for immediate assignment/" specs/README.md
    sed -i "s/- \*\*[0-9]* completed implementations\*\*/- **$DONE_COUNT completed implementations**/" specs/README.md
    sed -i "s/- \*\*[0-9]* OAuth-dependent files\*\*/- **$BLOCKED_COUNT blocked files**/" specs/README.md
    sed -i "s/- \*\*[0-9]* reusable templates\*\*/- **$TEMPLATES_COUNT reusable templates**/" specs/README.md
    sed -i "s/- \*\*[0-9]*+ detailed agent instructions\*\*/- **$KICKOFF_COUNT detailed agent instructions**/" specs/README.md
    
    # Update the current status section
    sed -i "s/- \*\*Todo\*\*: [0-9]* files ready for assignment/- **Todo**: $TODO_COUNT files ready for assignment/" specs/README.md
    sed -i "s/- \*\*Doing\*\*: [0-9]* files (ready for active work)/- **Doing**: $DOING_COUNT files (ready for active work)/" specs/README.md
    sed -i "s/- \*\*Done\*\*: [0-9]* completed implementations/- **Done**: $DONE_COUNT completed implementations/" specs/README.md
    sed -i "s/- \*\*Blocked\*\*: [0-9]* OAuth-dependent files/- **Blocked**: $BLOCKED_COUNT blocked files/" specs/README.md
    sed -i "s/- \*\*Templates\*\*: [0-9]* reusable templates/- **Templates**: $TEMPLATES_COUNT reusable templates/" specs/README.md
    sed -i "s/- \*\*Kickoff Notes\*\*: [0-9]*+ detailed agent instructions/- **Kickoff Notes**: $KICKOFF_COUNT detailed agent instructions/" specs/README.md
fi

# Update specs/todo/README.md
if [ -f "specs/todo/README.md" ]; then
    echo "📝 Updating specs/todo/README.md..."
    sed -i "s/- \*\*[0-9]* files\*\* ready for assignment/- **$TODO_COUNT files** ready for assignment/" specs/todo/README.md
fi

echo "✅ WIP folder counts updated successfully!"
echo ""
echo "📋 Summary:"
echo "  📁 specs/README.md - Updated main counts"
echo "  📁 specs/todo/README.md - Updated todo counts"
echo ""
echo "🔄 To commit these changes:"
echo "  git add specs/README.md specs/todo/README.md"
echo "  git commit -m 'docs: update WIP folder counts programmatically'"
