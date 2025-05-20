import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LinearIssueCreator } from '../../src/linear/issue-creator';
import { LinearIssueFinder } from '../../src/linear/issue-finder';
import { LinearIssueUpdater } from '../../src/linear/issue-updater';
import { SAFeLinearImplementation } from '../../src/safe/safe_linear_implementation';
import { PlanningDocument, Epic, Feature, Story, Enabler } from '../../src/planning/models';

// Mock the dependencies
jest.mock('@linear/sdk', () => {
  return {
    LinearClient: jest.fn().mockImplementation(() => ({
      issueCreate: jest.fn().mockImplementation(async (input) => ({
        success: true,
        issue: {
          id: `linear-${Math.random().toString(36).substring(7)}`,
          title: input.title,
          description: input.description
        }
      })),
      issueUpdate: jest.fn().mockImplementation(async (id, input) => ({
        success: true,
        issue: {
          id,
          title: input.title || 'Updated Title',
          description: input.description || 'Updated Description'
        }
      })),
      issueLabels: jest.fn().mockImplementation(async () => ({
        nodes: [
          { id: 'label-epic', name: 'Epic' },
          { id: 'label-feature', name: 'Feature' },
          { id: 'label-enabler', name: 'Enabler' },
          { id: 'label-business', name: 'Business' },
          { id: 'label-architecture', name: 'Architecture' },
          { id: 'label-infrastructure', name: 'Infrastructure' },
          { id: 'label-technical-debt', name: 'Technical Debt' },
          { id: 'label-research', name: 'Research' }
        ]
      })),
      issueLabelCreate: jest.fn().mockImplementation(async (input) => ({
        success: true,
        issueLabel: {
          id: `label-${input.name.toLowerCase()}`,
          name: input.name,
          color: input.color
        }
      }))
    }))
  };
});

jest.mock('../../src/linear/issue-finder');
jest.mock('../../src/linear/issue-updater');
jest.mock('../../src/safe/safe_linear_implementation');

describe('LinearIssueCreator', () => {
  let issueCreator: LinearIssueCreator;
  let mockIssueFinder: jest.Mocked<LinearIssueFinder>;
  let mockIssueUpdater: jest.Mocked<LinearIssueUpdater>;
  let mockSafeImplementation: jest.Mocked<SAFeLinearImplementation>;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockIssueFinder = new LinearIssueFinder('token', 'team-id') as jest.Mocked<LinearIssueFinder>;
    mockIssueUpdater = new LinearIssueUpdater('token') as jest.Mocked<LinearIssueUpdater>;
    mockSafeImplementation = new SAFeLinearImplementation('token') as jest.Mocked<SAFeLinearImplementation>;
    
    // Set up mock implementations
    (LinearIssueFinder as jest.Mock).mockImplementation(() => mockIssueFinder);
    (LinearIssueUpdater as jest.Mock).mockImplementation(() => mockIssueUpdater);
    (SAFeLinearImplementation as jest.Mock).mockImplementation(() => mockSafeImplementation);
    
    // Create the issue creator
    issueCreator = new LinearIssueCreator('token', 'team-id');
  });
  
  describe('createIssuesFromPlanningDocument', () => {
    it('should create issues from a planning document', async () => {
      // Mock the issue finder to return null (no existing issues)
      mockIssueFinder.findEpic.mockResolvedValue(null);
      mockIssueFinder.findFeature.mockResolvedValue(null);
      mockIssueFinder.findStory.mockResolvedValue(null);
      mockIssueFinder.findEnabler.mockResolvedValue(null);
      
      // Create a planning document
      const planningDocument: PlanningDocument = {
        id: 'doc-1',
        title: 'Test Planning Document',
        description: 'Test Planning Document Description',
        epics: [
          {
            id: 'epic-1',
            title: 'Test Epic',
            description: 'Test Epic Description',
            features: [
              {
                id: 'feature-1',
                title: 'Test Feature',
                description: 'Test Feature Description',
                stories: [
                  {
                    id: 'story-1',
                    title: 'Test Story',
                    description: 'Test Story Description'
                  }
                ],
                enablers: [
                  {
                    id: 'enabler-1',
                    title: 'Test Enabler',
                    description: 'Test Enabler Description',
                    enablerType: 'architecture'
                  }
                ]
              }
            ]
          }
        ],
        features: [
          {
            id: 'feature-2',
            title: 'Standalone Feature',
            description: 'Standalone Feature Description'
          }
        ],
        stories: [
          {
            id: 'story-2',
            title: 'Standalone Story',
            description: 'Standalone Story Description'
          }
        ],
        enablers: [
          {
            id: 'enabler-2',
            title: 'Standalone Enabler',
            description: 'Standalone Enabler Description',
            enablerType: 'technical debt'
          }
        ]
      };
      
      // Call the method
      const result = await issueCreator.createIssuesFromPlanningDocument(planningDocument);
      
      // Verify the result
      expect(result.epics).toHaveProperty('epic-1');
      expect(result.features).toHaveProperty('feature-1');
      expect(result.features).toHaveProperty('feature-2');
      expect(result.stories).toHaveProperty('story-1');
      expect(result.stories).toHaveProperty('story-2');
      expect(result.enablers).toHaveProperty('enabler-1');
      expect(result.enablers).toHaveProperty('enabler-2');
      
      // Verify the issue finder was called
      expect(mockIssueFinder.findEpic).toHaveBeenCalledWith(planningDocument.epics[0]);
      expect(mockIssueFinder.findFeature).toHaveBeenCalledWith(planningDocument.epics[0].features![0]);
      expect(mockIssueFinder.findFeature).toHaveBeenCalledWith(planningDocument.features![0]);
      expect(mockIssueFinder.findStory).toHaveBeenCalledWith(planningDocument.epics[0].features![0].stories![0]);
      expect(mockIssueFinder.findStory).toHaveBeenCalledWith(planningDocument.stories![0]);
      expect(mockIssueFinder.findEnabler).toHaveBeenCalledWith(planningDocument.epics[0].features![0].enablers![0]);
      expect(mockIssueFinder.findEnabler).toHaveBeenCalledWith(planningDocument.enablers![0]);
    });
    
    it('should update existing issues', async () => {
      // Mock the issue finder to return existing issues
      mockIssueFinder.findEpic.mockResolvedValue({
        id: 'linear-epic-1',
        title: 'Existing Epic',
        description: 'Existing Epic Description'
      } as any);
      
      mockIssueFinder.findFeature.mockResolvedValue({
        id: 'linear-feature-1',
        title: 'Existing Feature',
        description: 'Existing Feature Description'
      } as any);
      
      mockIssueFinder.findStory.mockResolvedValue({
        id: 'linear-story-1',
        title: 'Existing Story',
        description: 'Existing Story Description'
      } as any);
      
      mockIssueFinder.findEnabler.mockResolvedValue({
        id: 'linear-enabler-1',
        title: 'Existing Enabler',
        description: 'Existing Enabler Description'
      } as any);
      
      // Create a planning document
      const planningDocument: PlanningDocument = {
        id: 'doc-1',
        title: 'Test Planning Document',
        description: 'Test Planning Document Description',
        epics: [
          {
            id: 'epic-1',
            title: 'Updated Epic',
            description: 'Updated Epic Description'
          }
        ],
        features: [
          {
            id: 'feature-1',
            title: 'Updated Feature',
            description: 'Updated Feature Description'
          }
        ],
        stories: [
          {
            id: 'story-1',
            title: 'Updated Story',
            description: 'Updated Story Description'
          }
        ],
        enablers: [
          {
            id: 'enabler-1',
            title: 'Updated Enabler',
            description: 'Updated Enabler Description',
            enablerType: 'technical debt'
          }
        ]
      };
      
      // Call the method
      const result = await issueCreator.createIssuesFromPlanningDocument(planningDocument);
      
      // Verify the result
      expect(result.epics).toHaveProperty('epic-1');
      expect(result.features).toHaveProperty('feature-1');
      expect(result.stories).toHaveProperty('story-1');
      expect(result.enablers).toHaveProperty('enabler-1');
      
      // Verify the issue updater was called
      expect(mockIssueUpdater.updateEpic).toHaveBeenCalledWith('linear-epic-1', planningDocument.epics[0]);
      expect(mockIssueUpdater.updateFeature).toHaveBeenCalledWith('linear-feature-1', planningDocument.features![0]);
      expect(mockIssueUpdater.updateStory).toHaveBeenCalledWith('linear-story-1', planningDocument.stories![0]);
      expect(mockIssueUpdater.updateEnabler).toHaveBeenCalledWith('linear-enabler-1', planningDocument.enablers![0]);
    });
  });
  
  describe('createEpic', () => {
    it('should create an epic', async () => {
      const epic: Epic = {
        id: 'epic-1',
        title: 'Test Epic',
        description: 'Test Epic Description'
      };
      
      const result = await issueCreator.createEpic(epic);
      
      expect(result).toBeTruthy();
    });
  });
  
  describe('createFeature', () => {
    it('should create a feature with parent epic', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test Feature',
        description: 'Test Feature Description'
      };
      
      const epicId = 'epic-1';
      
      const result = await issueCreator.createFeature(feature, epicId);
      
      expect(result).toBeTruthy();
    });
    
    it('should create a feature without parent epic', async () => {
      const feature: Feature = {
        id: 'feature-1',
        title: 'Test Feature',
        description: 'Test Feature Description'
      };
      
      const result = await issueCreator.createFeature(feature);
      
      expect(result).toBeTruthy();
    });
  });
  
  describe('createStory', () => {
    it('should create a story with parent feature', async () => {
      const story: Story = {
        id: 'story-1',
        title: 'Test Story',
        description: 'Test Story Description'
      };
      
      const featureId = 'feature-1';
      
      const result = await issueCreator.createStory(story, featureId);
      
      expect(result).toBeTruthy();
    });
    
    it('should create a story without parent feature', async () => {
      const story: Story = {
        id: 'story-1',
        title: 'Test Story',
        description: 'Test Story Description'
      };
      
      const result = await issueCreator.createStory(story);
      
      expect(result).toBeTruthy();
    });
  });
  
  describe('createEnabler', () => {
    it('should create an enabler with parent feature', async () => {
      const enabler: Enabler = {
        id: 'enabler-1',
        title: 'Test Enabler',
        description: 'Test Enabler Description',
        enablerType: 'architecture'
      };
      
      const featureId = 'feature-1';
      
      const result = await issueCreator.createEnabler(enabler, featureId);
      
      expect(result).toBeTruthy();
    });
    
    it('should create an enabler without parent feature', async () => {
      const enabler: Enabler = {
        id: 'enabler-1',
        title: 'Test Enabler',
        description: 'Test Enabler Description',
        enablerType: 'technical debt'
      };
      
      const result = await issueCreator.createEnabler(enabler);
      
      expect(result).toBeTruthy();
    });
  });
});
