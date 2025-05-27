# WTFB Linear Agents Specifications

This directory contains all specifications, documentation, and workflow management for the WTFB Linear Agents project, organized using a Work-In-Progress (WIP) methodology.

## WIP Organization Structure

### 📋 `todo/` - Ready to Assign
Implementation specifications and stories ready for remote agent assignment.
- **11 files** ready for immediate assignment
- Implementation documents for features and technical enablers
- User stories and technical specifications

### 🔄 `doing/` - Currently In Progress
Work items currently being implemented by remote agents.
- Move files here when agents start working
- Track active development progress
- Monitor for completion

### ✅ `done/` - Completed Work
Successfully implemented and merged specifications.
- **7 completed implementations**
- Reference materials for completed features
- Historical record of delivered work

### 🚫 `blocked/` - Waiting on Dependencies
Work items blocked by external dependencies.
- **4 OAuth-dependent files** waiting on authentication infrastructure
- Clear dependency documentation
- Ready to move to `todo/` when unblocked

### 📚 `templates/` - Reusable Templates
Standard templates for consistent documentation.
- Planning templates for SAFe methodology
- Remote agent workflow templates
- User story and technical enabler templates

### 📝 `kickoff_notes/` - Reference Materials
Detailed kickoff instructions for remote agents.
- Comprehensive task context and requirements
- Linear issue creation instructions
- Implementation guidance and dependencies

### 🎯 `remote_agent_assignments/` - Assignment Management
Copy-paste ready assignments for remote agents.
- Current active assignments
- Historical assignment tracking
- Assignment templates for future use

### 📦 `archive/` - Superseded Documents
Old planning documents and superseded specifications.
- Historical planning materials
- Deprecated documentation
- Reference for project evolution

## Workflow Usage

### For Project Managers
1. **Assign Work**: Copy assignments from `remote_agent_assignments/current.md`
2. **Track Progress**: Monitor files moving through `todo/` → `doing/` → `done/`
3. **Manage Blockers**: Review `blocked/` folder for dependency issues

### For Remote Agents
1. **Get Assignment**: Receive copy-paste assignment with all necessary links
2. **Read Kickoff**: Follow kickoff note for detailed context
3. **Study Implementation**: Review implementation document in appropriate WIP folder
4. **Move Files**: Update file location as work progresses through WIP stages

### For ARCHitect-in-the-IDE
1. **Review Progress**: Monitor WIP folder transitions
2. **Unblock Work**: Move items from `blocked/` to `todo/` when dependencies resolve
3. **Quality Control**: Ensure completed work moves to `done/` folder

## File Movement Guidelines

### Moving to `doing/`
When an agent starts work:
```bash
git mv specs/todo/[filename] specs/doing/[filename]
```

### Moving to `done/`
When work is completed and merged:
```bash
git mv specs/doing/[filename] specs/done/[filename]
```

### Unblocking Work
When dependencies are resolved:
```bash
git mv specs/blocked/[filename] specs/todo/[filename]
```

## Current Status

- **Todo**: 11 files ready for assignment
- **Doing**: 0 files (ready for active work)
- **Done**: 7 completed implementations
- **Blocked**: 4 OAuth-dependent files
- **Templates**: 5 reusable templates
- **Kickoff Notes**: 25+ detailed agent instructions

## Integration with Tools

### Linear Integration
- All kickoff notes include Linear issue creation instructions
- Implementation documents reference Linear team and project structure
- WIP status aligns with Linear issue states

### GitHub Integration
- All file references use `dev` branch
- PR workflow supports WIP folder transitions
- Branch naming follows WIP organization

### Remote Agent Workflow
- Copy-paste assignments include all necessary file links
- Agents work with local files to reduce API calls
- Clear progression through WIP stages
