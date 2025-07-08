/**
 * Test data factory for creating properly typed test objects
 * Ensures all test objects conform to the actual interfaces
 */

import { Story, Feature, Epic, Enabler } from '../../src/planning/models';
import { 
  AllocatedWorkItem, 
  IterationPlan, 
  Iteration,
  IterationCapacity,
  DeliverableValue,
  PlanningWorkItem
} from '../../src/types/art-planning-types';

/**
 * Creates a properly typed Story object for tests
 */
export function createTestStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'test-story-1',
    type: 'story',
    title: 'Test Story',
    description: 'Test story description',
    parentId: undefined,
    attributes: {},
    acceptanceCriteria: ['Test criteria 1', 'Test criteria 2'],
    storyPoints: 3,
    priority: 1,
    ...overrides
  };
}

/**
 * Creates a properly typed Feature object for tests
 */
export function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'test-feature-1',
    type: 'feature',
    title: 'Test Feature',
    description: 'Test feature description',
    parentId: undefined,
    attributes: {},
    stories: [],
    enablers: [],
    ...overrides
  };
}

/**
 * Creates a properly typed Epic object for tests
 */
export function createTestEpic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 'test-epic-1',
    type: 'epic',
    title: 'Test Epic',
    description: 'Test epic description',
    parentId: undefined,
    attributes: {},
    features: [],
    ...overrides
  };
}

/**
 * Creates a properly typed Enabler object for tests
 */
export function createTestEnabler(overrides: Partial<Enabler> = {}): Enabler {
  return {
    id: 'test-enabler-1',
    type: 'enabler',
    title: 'Test Enabler',
    description: 'Test enabler description',
    parentId: undefined,
    attributes: {},
    enablerType: 'architecture',
    acceptanceCriteria: ['Enabler criteria 1', 'Enabler criteria 2'],
    ...overrides
  };
}

/**
 * Creates a properly typed AllocatedWorkItem for tests
 */
export function createTestAllocatedWorkItem(
  workItem: PlanningWorkItem,
  overrides: Partial<AllocatedWorkItem> = {}
): AllocatedWorkItem {
  return {
    workItem,
    assignedTeam: 'test-team',
    allocatedPoints: workItem.type === 'story' ? (workItem.storyPoints || 3) : 5,
    isComplete: false,
    estimatedEffort: 8,
    dependencies: [],
    riskLevel: 'low',
    valueContribution: 0.8,
    confidence: 0.9,
    rationale: 'Test allocation rationale',
    blockedBy: [],
    enables: [],
    ...overrides
  };
}

/**
 * Creates a properly typed IterationCapacity for tests
 */
export function createTestIterationCapacity(overrides: Partial<IterationCapacity> = {}): IterationCapacity {
  return {
    teamId: 'test-team',
    teamName: 'Test Team',
    totalCapacity: 40,
    availableCapacity: 35,
    teamSize: 5,
    averageVelocity: 25,
    confidenceFactor: 0.9,
    ...overrides
  };
}

/**
 * Creates a properly typed Iteration for tests
 */
export function createTestIteration(overrides: Partial<Iteration> = {}): Iteration {
  return {
    id: 'test-iteration-1',
    name: 'Test Iteration 1',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-14'),
    duration: 14,
    teams: ['test-team'],
    goals: ['Test goal 1', 'Test goal 2'],
    capacity: [createTestIterationCapacity()],
    ...overrides
  };
}

/**
 * Creates a properly typed DeliverableValue for tests
 */
export function createTestDeliverableValue(overrides: Partial<DeliverableValue> = {}): DeliverableValue {
  return {
    canDeliverWorkingSoftware: true,
    primaryValue: 'Customer value delivery',
    secondaryValues: ['Efficiency improvement', 'Technical debt reduction'],
    valueConfidence: 0.8,
    valueDeliveryStories: ['story-1', 'story-2'],
    valuePrerequisites: [],
    valueRisks: [],
    ...overrides
  };
}

/**
 * Creates a properly typed IterationPlan for tests
 */
export function createTestIterationPlan(overrides: Partial<IterationPlan> = {}): IterationPlan {
  const iteration = createTestIteration();
  const story = createTestStory();
  const allocatedWork = [createTestAllocatedWorkItem(story)];
  
  return {
    iteration,
    allocatedWork,
    totalPoints: 3,
    totalCapacity: 40,
    capacityUtilization: [{
      teamId: 'test-team',
      totalCapacity: 40,
      allocatedCapacity: 30,
      utilizationRate: 0.75,
      isOverAllocated: false,
      bufferCapacity: 10
    }],
    riskLevel: 'low',
    dependencies: [],
    deliverableValue: createTestDeliverableValue(),
    prerequisites: [],
    enables: [],
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      validationScore: 0.95
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      algorithmVersion: '1.0',
      planningConfidence: 0.85
    },
    ...overrides
  };
}
