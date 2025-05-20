import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlanningIssueMapper } from '../../src/linear/planning-issue-mapper';
import { LinearIssueCreator } from '../../src/linear/issue-creator';
import { LinearIssueFinder } from '../../src/linear/issue-finder';
import { SAFeHierarchyManager } from '../../src/safe/hierarchy-manager';

// Mock dependencies
jest.mock('../../src/linear/issue-creator');
jest.mock('../../src/linear/issue-finder');
jest.mock('../../src/safe/hierarchy-manager');

describe('PlanningIssueMapper', () => {
  let mapper: PlanningIssueMapper;
  let mockIssueCreator: jest.Mocked<LinearIssueCreator>;
  let mockIssueFinder: jest.Mocked<LinearIssueFinder>;
  let mockHierarchyManager: jest.Mocked<SAFeHierarchyManager>;

  const accessToken = 'access-token';
  const teamId = 'team-id';
  const organizationId = 'org-id';

  const mockPlanningDocument = {
    id: 'doc-id',
    title: 'Planning Document',
    epics: [
      {
        id: 'epic-1',
        type: 'epic',
        title: 'Epic 1',
        description: 'Epic 1 description',
        features: [],
        attributes: {}
      }
    ],
    features: [
      {
        id: 'feature-1',
        type: 'feature',
        title: 'Feature 1',
        description: 'Feature 1 description',
        epicId: 'epic-1',
        stories: [],
        enablers: [],
        attributes: {}
      }
    ],
    stories: [
      {
        id: 'story-1',
        type: 'story',
        title: 'Story 1',
        description: 'Story 1 description',
        featureId: 'feature-1',
        acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
        attributes: {}
      }
    ],
    enablers: [
      {
        id: 'enabler-1',
        type: 'enabler',
        title: 'Enabler 1',
        description: 'Enabler 1 description',
        featureId: 'feature-1',
        enablerType: 'architecture',
        attributes: {}
      }
    ]
  };

  const mockEpicIssue = { id: 'linear-epic-1', title: 'Epic 1' };
  const mockFeatureIssue = { id: 'linear-feature-1', title: 'Feature 1' };
  const mockStoryIssue = { id: 'linear-story-1', title: 'Story 1' };
  const mockEnablerIssue = { id: 'linear-enabler-1', title: 'Enabler 1' };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    (LinearIssueCreator as jest.Mock).mockImplementation(() => ({
      createEpic: jest.fn().mockResolvedValue(mockEpicIssue),
      createFeature: jest.fn().mockResolvedValue(mockFeatureIssue),
      createStory: jest.fn().mockResolvedValue(mockStoryIssue),
      createEnabler: jest.fn().mockResolvedValue(mockEnablerIssue)
    }));

    (LinearIssueFinder as jest.Mock).mockImplementation(() => ({
      findIssueByExternalId: jest.fn().mockResolvedValue(null)
    }));

    (SAFeHierarchyManager as jest.Mock).mockImplementation(() => ({
      updateHierarchy: jest.fn().mockResolvedValue(undefined)
    }));

    // Create instance with mocked dependencies
    mapper = new PlanningIssueMapper(accessToken, teamId, organizationId);
    
    // Get mock instances
    mockIssueCreator = (LinearIssueCreator as unknown) as jest.Mocked<LinearIssueCreator>;
    mockIssueFinder = (LinearIssueFinder as unknown) as jest.Mocked<LinearIssueFinder>;
    mockHierarchyManager = (SAFeHierarchyManager as unknown) as jest.Mocked<SAFeHierarchyManager>;
  });

  describe('mapToLinear', () => {
    it('should map planning data to Linear issues', async () => {
      // Arrange
      (mockIssueFinder.findIssueByExternalId as jest.Mock)
        .mockResolvedValueOnce(null) // Epic not found
        .mockResolvedValueOnce(null) // Feature not found
        .mockResolvedValueOnce(null) // Story not found
        .mockResolvedValueOnce(null); // Enabler not found

      // Act
      const result = await mapper.mapToLinear(mockPlanningDocument);

      // Assert
      expect(mockIssueCreator.createEpic).toHaveBeenCalledWith(
        'Epic 1',
        'Epic 1 description',
        expect.objectContaining({
          externalId: 'epic-1'
        })
      );

      expect(mockIssueCreator.createFeature).toHaveBeenCalledWith(
        'Feature 1',
        'Feature 1 description',
        'linear-epic-1',
        true,
        expect.objectContaining({
          externalId: 'feature-1'
        })
      );

      expect(mockIssueCreator.createStory).toHaveBeenCalledWith(
        'Story 1',
        expect.stringContaining('Story 1 description'),
        'linear-feature-1',
        expect.objectContaining({
          externalId: 'story-1'
        })
      );

      expect(mockIssueCreator.createEnabler).toHaveBeenCalledWith(
        'Enabler 1',
        'Enabler 1 description',
        'Architecture',
        'linear-feature-1',
        expect.objectContaining({
          externalId: 'enabler-1'
        })
      );

      expect(mockHierarchyManager.updateHierarchy).toHaveBeenCalledWith(
        mockPlanningDocument,
        expect.objectContaining({
          epics: { 'epic-1': 'linear-epic-1' },
          features: { 'feature-1': 'linear-feature-1' },
          stories: { 'story-1': 'linear-story-1' },
          enablers: { 'enabler-1': 'linear-enabler-1' }
        })
      );

      expect(result).toEqual({
        epics: { 'epic-1': 'linear-epic-1' },
        features: { 'feature-1': 'linear-feature-1' },
        stories: { 'story-1': 'linear-story-1' },
        enablers: { 'enabler-1': 'linear-enabler-1' },
        createdCount: 0,
        updatedCount: 4,
        errorCount: 0,
        errors: []
      });
    });

    it('should update existing issues', async () => {
      // Arrange
      (mockIssueFinder.findIssueByExternalId as jest.Mock)
        .mockResolvedValueOnce(mockEpicIssue) // Epic found
        .mockResolvedValueOnce(mockFeatureIssue) // Feature found
        .mockResolvedValueOnce(mockStoryIssue) // Story found
        .mockResolvedValueOnce(mockEnablerIssue); // Enabler found

      // Act
      const result = await mapper.mapToLinear(mockPlanningDocument);

      // Assert
      expect(mockIssueCreator.createEpic).not.toHaveBeenCalled();
      expect(mockIssueCreator.createFeature).not.toHaveBeenCalled();
      expect(mockIssueCreator.createStory).not.toHaveBeenCalled();
      expect(mockIssueCreator.createEnabler).not.toHaveBeenCalled();

      expect(mockHierarchyManager.updateHierarchy).toHaveBeenCalledWith(
        mockPlanningDocument,
        expect.objectContaining({
          epics: { 'epic-1': 'linear-epic-1' },
          features: { 'feature-1': 'linear-feature-1' },
          stories: { 'story-1': 'linear-story-1' },
          enablers: { 'enabler-1': 'linear-enabler-1' }
        })
      );

      expect(result).toEqual({
        epics: { 'epic-1': 'linear-epic-1' },
        features: { 'feature-1': 'linear-feature-1' },
        stories: { 'story-1': 'linear-story-1' },
        enablers: { 'enabler-1': 'linear-enabler-1' },
        createdCount: 0,
        updatedCount: 4,
        errorCount: 0,
        errors: []
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      (mockIssueCreator.createEpic as jest.Mock).mockRejectedValue(error);

      // Act
      const result = await mapper.mapToLinear(mockPlanningDocument);

      // Assert
      expect(result.errorCount).toBe(1);
      expect(result.errors[0]).toEqual({
        id: 'epic-1',
        type: 'epic',
        error: 'Test error'
      });
    });
  });
});
