# Kick-off: Story Decomposition Engine

## Assignment Overview
You are assigned to implement the Story Decomposition Engine user story for the Linear Planning Agent project. This is a **foundational sub-story** of the ART Planning capability (LIN-46) that enables automatic breakdown of large stories into implementable sub-stories.

## Linear Project Information
- **Linear Project**: [SAFe Agents](https://linear.app/wordstofilmby/project/safe-agents-41505bde79df/overview)
- **Linear Team**: [Linear Agents](https://linear.app/wordstofilmby/team/LIN/all)
- **Parent Story**: LIN-46 (Agile Release Train Planning and Story Decomposition)
- **This Story**: LIN-47 (Story Decomposition Engine)

## Story Context
This is **Sub-Story 1 of 4** in the ART Planning decomposition:
- ✅ **LIN-47**: Story Decomposition Engine (3 points) - **YOUR ASSIGNMENT**
- ⏳ **LIN-48**: Dependency Mapping System (5 points) - Depends on LIN-47
- ⏳ **LIN-49**: ART Iteration Planning (5 points) - Depends on LIN-47, LIN-48
- ⏳ **LIN-50**: Story Scoring and Prioritization (3 points) - Can run parallel

## Linear Issue Details
- **Issue**: LIN-47 - Story Decomposition Engine
- **Priority**: High (1)
- **Story Points**: 3
- **Status**: Backlog → Todo (when you start)

## Project Context
The Linear Planning Agent currently can extract stories from Confluence documents and create PI planning, but it lacks the ability to ensure stories are properly sized for implementation. This story implements the foundational capability to automatically decompose large stories (>5 points) into implementable sub-stories (≤5 points each).

### Your Mission
Implement an automated story decomposition engine that:
1. **Detects** stories with >5 story points
2. **Decomposes** them into 2-4 sub-stories of ≤5 points each
3. **Distributes** acceptance criteria across sub-stories logically
4. **Creates** Linear parent/child relationships
5. **Maintains** traceability and audit trail

## Technical Implementation Guide

### Existing Files to Understand
- `src/planning/structure-analyzer.ts`: Story extraction logic (integration point)
- `src/planning/pattern-recognition.ts`: Story points extraction (extend this)
- `src/planning/models.ts`: Story interface definitions
- `src/agent/planning.ts`: Main planning agent (integration point)

### New Files to Create
- `src/safe/story-decomposition-engine.ts`: Main decomposition engine
- `src/types/decomposition-types.ts`: Type definitions for decomposition
- `tests/safe/story-decomposition-engine.test.ts`: Comprehensive unit tests

### Key Implementation Components

#### 1. StoryDecompositionEngine Class
```typescript
export class StoryDecompositionEngine {
  async decomposeStory(story: Story): Promise<DecompositionResult>
  private calculatePointsDistribution(totalPoints: number, subStoryCount: number): number[]
  private distributeAcceptanceCriteria(criteria: string[], subStories: Story[]): AcceptanceCriteriaMapping[]
  private generateSubStoryContent(parentStory: Story, subStoryIndex: number): { title: string; description: string }
}
```

#### 2. Linear Integration
```typescript
export class LinearStoryDecomposer {
  async createDecomposedStories(decomposition: DecompositionResult): Promise<LinearIssue[]>
  async updateParentStory(parentStory: Story, subStories: LinearIssue[]): Promise<void>
}
```

#### 3. Planning Agent Integration
Extend the existing `PlanningAgent` to use the decomposition engine when processing stories.

## Implementation Phases

### Phase 1: Core Decomposition Logic (1 point)
**Goal**: Implement basic story decomposition algorithms

**Tasks**:
- Create `StoryDecompositionEngine` class
- Implement story size detection (>5 points)
- Add basic decomposition algorithms (2-4 sub-stories)
- Implement points distribution logic
- Add comprehensive unit tests

**Success Criteria**:
- Stories >5 points are detected correctly
- Decomposition produces 2-4 sub-stories of ≤5 points each
- Points distribution is logical and complete

### Phase 2: Acceptance Criteria Distribution (1 point)
**Goal**: Intelligently distribute acceptance criteria across sub-stories

**Tasks**:
- Implement AC analysis and mapping logic
- Add criteria distribution algorithms
- Ensure complete coverage (no AC lost)
- Add traceability mapping
- Test with various AC patterns

**Success Criteria**:
- All original AC are preserved in sub-stories
- AC distribution is logical and testable
- Traceability is maintained from sub-story AC to parent AC

### Phase 3: Linear Integration (1 point)
**Goal**: Create Linear issues and relationships for decomposed stories

**Tasks**:
- Implement `LinearStoryDecomposer` class
- Add Linear issue creation for sub-stories
- Implement parent/child relationship creation
- Add error handling and rollback capabilities
- Test with real Linear API

**Success Criteria**:
- Sub-stories created as Linear issues
- Parent/child relationships established correctly
- Proper labels and metadata applied
- Error handling prevents partial decompositions

## Testing Strategy

### Unit Tests (Required)
- Test decomposition with various story sizes (6, 8, 13, 21 points)
- Test points distribution algorithms
- Test AC distribution and mapping
- Test edge cases (exactly 5 points, very large stories)
- Test error conditions and validation

### Integration Tests (Required)
- Test Linear API integration
- Test with real story data from planning documents
- Test parent/child relationship creation
- Test rollback on failures

### Manual Testing
- Test with actual planning scenarios
- Validate business logic preservation
- Verify SAFe compliance

## Definition of Done

### Functional Requirements
- [ ] All acceptance criteria implemented and tested
- [ ] Story decomposition works for all story types >5 points
- [ ] AC distribution maintains complete coverage
- [ ] Linear integration creates proper relationships
- [ ] Traceability and audit trail maintained

### Technical Requirements
- [ ] Code follows existing project patterns and standards
- [ ] Comprehensive unit tests (>90% coverage)
- [ ] Integration tests for Linear API
- [ ] Error handling for all failure scenarios
- [ ] Performance acceptable (decomposition completes <30 seconds)

### Documentation Requirements
- [ ] JSDoc comments for all public methods
- [ ] README section for decomposition engine
- [ ] Usage examples and configuration guide

## Dependencies

### Technical Dependencies
- ✅ **Linear SDK**: Available for issue creation and relationships
- ✅ **Story Models**: Existing story interfaces and types
- ✅ **Planning Agent**: Integration point ready

### Business Dependencies
- **Story Point Standards**: Use existing 1-5 point scale
- **Decomposition Rules**: Follow SAFe guidelines for story breakdown
- **AC Standards**: Maintain existing acceptance criteria format

## Communication Protocol
- **Questions**: Comment on Linear issue LIN-47
- **Progress Updates**: Update Linear issue status regularly
- **Blockers**: Flag blockers immediately in Linear issue
- **Code Reviews**: Request review when ready for PR

## Timeline and Effort
- **Story Points**: 3
- **Estimated Timeline**: 3-4 days
- **Complexity**: Medium (algorithmic logic + Linear integration)
- **Priority**: High (foundational for other ART planning features)

## Success Impact
This implementation provides the foundational capability for the entire ART planning system. Once complete, it enables:
- Proper story sizing for all planning scenarios
- Foundation for dependency mapping (LIN-48)
- Prerequisite for iteration planning (LIN-49)
- Better story management and SAFe compliance

**This is the first critical piece of the ART planning puzzle!** 🎯

Please let me know if you have any questions or need clarification on any aspect of the implementation.
