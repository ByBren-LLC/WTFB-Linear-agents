# Doing - Currently In Progress

This folder contains work items that are **currently being implemented** by remote agents.

## Current Status
- **0 files** (ready for active work)
- Folder prepared for incoming assignments
- Monitoring and tracking ready

## Purpose

This folder serves as the active workspace for:
- **Remote Agent Work**: Files being actively implemented
- **Progress Tracking**: Monitor development progress
- **Quality Control**: Ensure work stays on track
- **Completion Preparation**: Ready files for `done/` transition

## Workflow

### When Agent Starts Work
1. **File Movement**: Agent moves file from `../todo/` to this folder
2. **Linear Update**: Agent updates Linear issue status to "In Progress"
3. **Branch Creation**: Agent creates feature branch for implementation
4. **Active Development**: Agent implements according to specifications

### During Development
- **Progress Updates**: Regular Linear issue updates
- **ARCHitect Monitoring**: Periodic check-ins and guidance
- **Blocker Resolution**: Quick resolution of any impediments
- **Quality Assurance**: Ongoing review of implementation approach

### File Movement Commands

#### Moving from Todo
```bash
git mv specs/todo/[filename] specs/doing/[filename]
git commit -m "start: begin implementation of [task-name]

Agent [AGENT-ID] starting work on [task-name]
Linear issue: [ISSUE-ID]
Branch: feature/[branch-name]

[Agent-ID: AGENT-ID]"
```

#### Moving to Done
```bash
git mv specs/doing/[filename] specs/done/[filename]
git commit -m "complete: finish implementation of [task-name]

Implementation completed and merged
PR: #[PR-NUMBER]
Linear issue: [ISSUE-ID] → Done

[Agent-ID: AGENT-ID]"
```

## Monitoring Guidelines

### For ARCHitect-in-the-IDE
1. **Daily Review**: Check files in this folder for progress
2. **Agent Support**: Provide guidance when requested
3. **Blocker Resolution**: Help resolve any impediments
4. **Quality Gates**: Ensure implementation follows specifications

### For Project Managers
1. **Progress Tracking**: Monitor Linear issue updates
2. **Timeline Management**: Track against estimated completion dates
3. **Resource Allocation**: Ensure agents have necessary support
4. **Stakeholder Updates**: Provide progress reports to stakeholders

### For Remote Agents
1. **Regular Updates**: Update Linear issues with progress
2. **Blocker Communication**: Flag any blockers immediately
3. **Quality Focus**: Follow implementation specifications carefully
4. **Completion Preparation**: Prepare for PR submission and review

## Expected Contents

When files are in this folder, expect to see:
- **Active Implementation**: Code being written and tested
- **Linear Issues**: "In Progress" status with regular updates
- **Feature Branches**: Active development branches
- **PR Preparation**: Work toward PR submission

## Quality Standards

### Implementation Requirements
- Follow implementation document specifications exactly
- Maintain code quality standards
- Include comprehensive tests
- Document code with JSDoc comments

### Communication Requirements
- Regular Linear issue updates (at least daily)
- Immediate blocker communication
- Clear progress indicators
- Proactive status reporting

## Completion Criteria

### Ready for Done Transition
- [ ] All acceptance criteria met
- [ ] Implementation complete and tested
- [ ] PR submitted and approved
- [ ] Code merged to dev branch
- [ ] Linear issue updated to "Done"
- [ ] Documentation updated

### File Movement to Done
Only move files to `../done/` when:
1. **Implementation Complete**: All code written and tested
2. **PR Merged**: Changes successfully merged to dev branch
3. **Quality Verified**: ARCHitect approval received
4. **Linear Updated**: Issue status reflects completion

## Troubleshooting

### Common Issues
- **Blocked Dependencies**: Move to `../blocked/` if dependencies discovered
- **Scope Changes**: Consult ARCHitect before making significant changes
- **Technical Challenges**: Request ARCHitect guidance immediately
- **Timeline Concerns**: Communicate delays proactively

### Escalation Process
1. **Agent Level**: Try to resolve independently first
2. **ARCHitect Level**: Request technical guidance
3. **Project Manager Level**: Escalate timeline or resource issues
4. **Team Level**: Involve broader team for complex decisions

## Success Metrics

- **Completion Rate**: Files successfully moved to `done/`
- **Quality Score**: PR approval rate and review feedback
- **Timeline Adherence**: Completion within estimated timeframes
- **Communication Quality**: Regular and clear progress updates
