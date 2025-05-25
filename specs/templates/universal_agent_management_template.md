# Universal Agent Management Template

## Project Information
- **Project Name**: [Project Name]
- **Project Code**: [PROJECT] (3-4 letters: LIN, WOR, AUG, API, WEB, MOB)
- **Current Sprint**: S[N] (e.g., S01, S02, S03)
- **Repository**: [Repository URL]
- **Linear Project**: [Linear Project URL]

## Agent Naming Convention: `PROJECT-ROLE-NN-SN`

### Format Components:
- **PROJECT**: 3-4 letter project code
- **ROLE**: Agent specialization role
- **NN**: Sequential number (01, 02, 03, etc.)
- **SN**: Sprint number (S01, S02, S03, etc.)

### Universal Role Codes:
- **ARCH**: Architecture Enablers
- **DEBT**: Technical Debt Resolution
- **TYPE**: Type Definition & Interface Fixes
- **INFRA**: Infrastructure & Database
- **SDK**: SDK/API Integration & Compatibility
- **SYNC**: Synchronization Features
- **AUTH**: Authentication & Authorization
- **PLAN**: Planning & Project Management
- **TEST**: Testing & QA
- **DOC**: Documentation
- **SEC**: Security Implementation
- **PERF**: Performance Optimization
- **UI**: User Interface Development
- **DATA**: Data Processing & Analytics

## Active Agents (Sprint [SN])

### [PROJECT]-[ROLE]-01-S[N] ([Task Name])
- **Role**: [Role Description]
- **Priority**: [High/Medium/Low]
- **Story Points**: [Number]
- **Timeline**: [Duration]
- **Status**: [Assigned/In Progress/Review/Complete/Blocked]
- **Container ID**: [Container ID if available]
- **GitHub Issues**: [Issue Numbers]
- **Linear Issues**: [Linear Issue IDs]
- **PRs**: [PR Numbers and Status]
- **Notes**: [Any special notes or status updates]

### [PROJECT]-[ROLE]-02-S[N] ([Task Name])
- **Role**: [Role Description]
- **Priority**: [High/Medium/Low]
- **Story Points**: [Number]
- **Timeline**: [Duration]
- **Status**: [Assigned/In Progress/Review/Complete/Blocked]
- **Container ID**: [Container ID if available]
- **GitHub Issues**: [Issue Numbers]
- **Linear Issues**: [Linear Issue IDs]
- **PRs**: [PR Numbers and Status]
- **Notes**: [Any special notes or status updates]

## Agent Assignment Template

### Assignment Message Template:
```markdown
## Agent #[N] Assignment (ID: [PROJECT]-[ROLE]-[NN]-S[N])

# Remote Agent Assignment: [Task Name]

**Agent ID**: [PROJECT]-[ROLE]-[NN]-S[N] - Please include this in all commits and PR descriptions using format: `[Agent-ID: PROJECT-ROLE-NN-SN]`

I'm assigning you to implement the [Task Name] [User Story/Technical Enabler/Spike] for our [Project Name] project. This is a [priority level] component that will [brief description of purpose].

**CRITICAL**: You must include your Agent ID in ALL commits and PR descriptions using format: `[Agent-ID: PROJECT-ROLE-NN-SN]`

Please:
1. Pull the latest code from the dev branch of our repository: [Repository URL]
2. Read your kickoff note: [Kickoff Note URL]
3. Create a Linear issue as instructed in the kickoff note
4. Study the implementation document referenced in the kickoff note
5. Implement the task according to the specifications
6. Create a branch named `feature/[branch-name]`
7. **Include your Agent ID in ALL commits**: `[Agent-ID: PROJECT-ROLE-NN-SN] commit message`
8. **Include your Agent ID in PR title or description**
9. Submit a PR when complete

This is a [priority level] task [mention any dependencies if applicable]. Please let me know if you have any questions or need clarification on any aspect of the implementation.
```

## Agent Performance Tracking

### Sprint [SN] Summary
- **Total Agents**: [Number]
- **Total Story Points**: [Number]
- **Critical Path**: [Agent ID]
- **Blocked**: [Agent IDs and reasons]
- **Excellent**: [Agent IDs and achievements]

### Quality Metrics
- **Architecture Compliance**: [Percentage] ([Compliant]/[Total] agents)
- **Stop-the-Line Events**: [Number] ([Descriptions])
- **Excellent Work Recognition**: [Number] ([Descriptions])

## Communication Protocols

### Agent ID Requirements
All agents must include their agent ID in:
- **Commit messages**: `[Agent-ID: PROJECT-ROLE-NN-SN] commit message`
- **PR descriptions**: Include agent ID in title or description
- **Linear issue updates**: Reference agent ID in comments
- **GitHub comments**: Sign with agent ID

### Escalation Process
1. **Technical Issues**: Comment on GitHub PR/issue
2. **Architecture Concerns**: ARCHitect stop-the-line authority
3. **Blocking Issues**: Update Linear issue with blocker status
4. **Excellent Work**: Recognition in tracking and assignments

## Future Sprints

### Sprint [SN+1] Planned Roles
- **[PROJECT]-[ROLE]-01-S[N+1]**: [Planned work description]
- **[PROJECT]-[ROLE]-02-S[N+1]**: [Planned work description]
- **[PROJECT]-[ROLE]-03-S[N+1]**: [Planned work description]

### Scaling Strategy
- **Role specialization**: Agents develop expertise in specific areas
- **Cross-training**: Agents can work across roles when needed
- **Performance tracking**: Monitor agent effectiveness by role
- **Quality gates**: Architecture compliance requirements

## Agent ID Validation Checklist

### For ARCHitects:
- [ ] Agent ID follows PROJECT-ROLE-NN-SN format
- [ ] Project code matches current project
- [ ] Role code matches agent specialization
- [ ] Sequential number is unique within role/sprint
- [ ] Sprint number matches current sprint
- [ ] Agent ID included in assignment message
- [ ] Agent ID requirements communicated clearly

### For Agents:
- [ ] Agent ID included in all commits
- [ ] Agent ID included in PR title or description
- [ ] Agent ID referenced in Linear issue comments
- [ ] Agent ID used when signing GitHub comments
- [ ] Format exactly matches: `[Agent-ID: PROJECT-ROLE-NN-SN]`

---

**Template Version**: 1.0
**Last Updated**: [Date]
**ARCHitect**: [ARCHitect Name]
**POPM**: [POPM Name]
