import { SAFeHierarchyManager } from '../../src/safe/hierarchy-manager';
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../../src/planning/models';

// Mock the dependencies
jest.mock('@linear/sdk');
jest.mock('../../src/linear/issue-finder');
jest.mock('../../src/linear/issue-updater');
jest.mock('../../src/safe/safe_linear_implementation');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('SAFeHierarchyManager', () => {
  let hierarchyManager: SAFeHierarchyManager;

  const accessToken = 'test-token';
  const teamId = 'test-team-id';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create the hierarchy manager
    hierarchyManager = new SAFeHierarchyManager(accessToken, teamId);
  });

  describe('Type Completeness Tests', () => {
    it('should handle complete Epic objects', () => {
      const epic: Epic = {
        id: 'epic1',
        type: 'epic',
        title: 'Epic 1',
        description: 'Epic 1 description',
        features: [],
        attributes: {}
      };

      expect(epic.type).toBe('epic');
      expect(epic.features).toEqual([]);
      expect(epic.attributes).toEqual({});
    });

    it('should handle complete Feature objects', () => {
      const feature: Feature = {
        id: 'feature1',
        type: 'feature',
        title: 'Feature 1',
        description: 'Feature 1 description',
        epicId: 'epic1',
        stories: [],
        enablers: [],
        attributes: {}
      };

      expect(feature.type).toBe('feature');
      expect(feature.stories).toEqual([]);
      expect(feature.enablers).toEqual([]);
      expect(feature.attributes).toEqual({});
    });

    it('should handle complete Story objects', () => {
      const story: Story = {
        id: 'story1',
        type: 'story',
        title: 'Story 1',
        description: 'Story 1 description',
        featureId: 'feature1',
        acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
        attributes: {}
      };

      expect(story.type).toBe('story');
      expect(story.acceptanceCriteria).toEqual(['Criteria 1', 'Criteria 2']);
      expect(story.attributes).toEqual({});
    });

    it('should handle complete Enabler objects with correct enum values', () => {
      const enabler1: Enabler = {
        id: 'enabler1',
        type: 'enabler',
        title: 'Enabler 1',
        description: 'Enabler 1 description',
        featureId: 'feature1',
        enablerType: 'architecture',
        attributes: {}
      };

      const enabler2: Enabler = {
        id: 'enabler2',
        type: 'enabler',
        title: 'Enabler 2',
        description: 'Enabler 2 description',
        enablerType: 'infrastructure',
        attributes: {}
      };

      const enabler3: Enabler = {
        id: 'enabler3',
        type: 'enabler',
        title: 'Enabler 3',
        description: 'Enabler 3 description',
        enablerType: 'technical_debt',
        attributes: {}
      };

      const enabler4: Enabler = {
        id: 'enabler4',
        type: 'enabler',
        title: 'Enabler 4',
        description: 'Enabler 4 description',
        enablerType: 'research',
        attributes: {}
      };

      expect(enabler1.enablerType).toBe('architecture');
      expect(enabler2.enablerType).toBe('infrastructure');
      expect(enabler3.enablerType).toBe('technical_debt');
      expect(enabler4.enablerType).toBe('research');
    });

    it('should handle complete PlanningDocument objects', () => {
      const epic: Epic = {
        id: 'epic1',
        type: 'epic',
        title: 'Epic 1',
        description: 'Epic 1 description',
        features: [],
        attributes: {}
      };

      const feature: Feature = {
        id: 'feature1',
        type: 'feature',
        title: 'Feature 1',
        description: 'Feature 1 description',
        epicId: 'epic1',
        stories: [],
        enablers: [],
        attributes: {}
      };

      const story: Story = {
        id: 'story1',
        type: 'story',
        title: 'Story 1',
        description: 'Story 1 description',
        featureId: 'feature1',
        acceptanceCriteria: [],
        attributes: {}
      };

      const enabler: Enabler = {
        id: 'enabler1',
        type: 'enabler',
        title: 'Enabler 1',
        description: 'Enabler 1 description',
        featureId: 'feature1',
        enablerType: 'architecture',
        attributes: {}
      };

      const planningDocument: PlanningDocument = {
        id: 'test-planning-document',
        title: 'Test Planning Document',
        epics: [epic],
        features: [feature],
        stories: [story],
        enablers: [enabler]
      };

      expect(planningDocument.epics).toHaveLength(1);
      expect(planningDocument.features).toHaveLength(1);
      expect(planningDocument.stories).toHaveLength(1);
      expect(planningDocument.enablers).toHaveLength(1);
    });

    it('should handle array relationships with proper object types', () => {
      const story: Story = {
        id: 'story1',
        type: 'story',
        title: 'Story 1',
        description: 'Story 1 description',
        featureId: 'feature1',
        acceptanceCriteria: [],
        attributes: {}
      };

      const enabler: Enabler = {
        id: 'enabler1',
        type: 'enabler',
        title: 'Enabler 1',
        description: 'Enabler 1 description',
        featureId: 'feature1',
        enablerType: 'architecture',
        attributes: {}
      };

      const feature: Feature = {
        id: 'feature1',
        type: 'feature',
        title: 'Feature 1',
        description: 'Feature 1 description',
        stories: [story],
        enablers: [enabler],
        attributes: {}
      };

      const epic: Epic = {
        id: 'epic1',
        type: 'epic',
        title: 'Epic 1',
        description: 'Epic 1 description',
        features: [feature],
        attributes: {}
      };

      expect(epic.features[0]).toBe(feature);
      expect(feature.stories[0]).toBe(story);
      expect(feature.enablers[0]).toBe(enabler);
    });
  });
});
