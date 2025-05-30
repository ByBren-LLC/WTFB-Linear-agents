import { HierarchySynchronizer } from '../../src/safe/hierarchy-synchronizer';
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../../src/planning/models';

// Mock the dependencies
jest.mock('../../src/safe/hierarchy-manager');
jest.mock('../../src/safe/hierarchy-validator');
jest.mock('../../src/linear/issue-finder');
jest.mock('../../src/linear/issue-creator');
jest.mock('../../src/linear/issue-updater');
jest.mock('../../src/safe/conflict-resolver');
jest.mock('@linear/sdk');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('HierarchySynchronizer', () => {
  let synchronizer: HierarchySynchronizer;

  const accessToken = 'test-token';
  const teamId = 'test-team-id';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create the synchronizer
    synchronizer = new HierarchySynchronizer(accessToken, teamId);
  });

  describe('Type Completeness Tests', () => {
    it('should handle complete SAFe model objects in planning documents', () => {
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
        acceptanceCriteria: ['Acceptance criteria 1'],
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

      // Verify all objects have required properties
      expect(planningDocument.epics[0].type).toBe('epic');
      expect(planningDocument.features![0].type).toBe('feature');
      expect(planningDocument.stories![0].type).toBe('story');
      expect(planningDocument.enablers![0].type).toBe('enabler');
      expect(planningDocument.enablers![0].enablerType).toBe('architecture');
    });

    it('should handle all enabler types correctly', () => {
      const enablers: Enabler[] = [
        {
          id: 'enabler1',
          type: 'enabler',
          title: 'Architecture Enabler',
          description: 'Architecture enabler description',
          enablerType: 'architecture',
          attributes: {}
        },
        {
          id: 'enabler2',
          type: 'enabler',
          title: 'Infrastructure Enabler',
          description: 'Infrastructure enabler description',
          enablerType: 'infrastructure',
          attributes: {}
        },
        {
          id: 'enabler3',
          type: 'enabler',
          title: 'Technical Debt Enabler',
          description: 'Technical debt enabler description',
          enablerType: 'technical_debt',
          attributes: {}
        },
        {
          id: 'enabler4',
          type: 'enabler',
          title: 'Research Enabler',
          description: 'Research enabler description',
          enablerType: 'research',
          attributes: {}
        }
      ];

      enablers.forEach(enabler => {
        expect(enabler.type).toBe('enabler');
        expect(['architecture', 'infrastructure', 'technical_debt', 'research']).toContain(enabler.enablerType);
      });
    });

    it('should handle nested relationships correctly', () => {
      const story: Story = {
        id: 'story1',
        type: 'story',
        title: 'Story 1',
        description: 'Story 1 description',
        featureId: 'feature1',
        acceptanceCriteria: ['Story acceptance criteria'],
        attributes: {}
      };

      const enabler: Enabler = {
        id: 'enabler1',
        type: 'enabler',
        title: 'Enabler 1',
        description: 'Enabler 1 description',
        featureId: 'feature1',
        enablerType: 'infrastructure',
        attributes: {}
      };

      const feature: Feature = {
        id: 'feature1',
        type: 'feature',
        title: 'Feature 1',
        description: 'Feature 1 description',
        epicId: 'epic1',
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

      // Verify relationships
      expect(epic.features[0]).toBe(feature);
      expect(feature.stories[0]).toBe(story);
      expect(feature.enablers[0]).toBe(enabler);
      expect(story.featureId).toBe(feature.id);
      expect(enabler.featureId).toBe(feature.id);
      expect(feature.epicId).toBe(epic.id);
    });

    it('should handle optional properties correctly', () => {
      const minimalEpic: Epic = {
        id: 'epic1',
        type: 'epic',
        title: 'Minimal Epic',
        description: 'Minimal epic description',
        features: [],
        attributes: {}
      };

      const minimalFeature: Feature = {
        id: 'feature1',
        type: 'feature',
        title: 'Minimal Feature',
        description: 'Minimal feature description',
        stories: [],
        enablers: [],
        attributes: {}
      };

      const minimalStory: Story = {
        id: 'story1',
        type: 'story',
        title: 'Minimal Story',
        description: 'Minimal story description',
        acceptanceCriteria: [],
        attributes: {}
      };

      const minimalEnabler: Enabler = {
        id: 'enabler1',
        type: 'enabler',
        title: 'Minimal Enabler',
        description: 'Minimal enabler description',
        enablerType: 'research',
        attributes: {}
      };

      // Verify all objects are valid without optional properties
      expect(minimalEpic.type).toBe('epic');
      expect(minimalFeature.type).toBe('feature');
      expect(minimalStory.type).toBe('story');
      expect(minimalEnabler.type).toBe('enabler');
    });
  });
});
