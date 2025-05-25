import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PlanningSessionManager, PlanningSessionStatus } from '../../src/planning/session-manager';
import { LinearIssueCreator } from '../../src/linear/issue-creator';
import { LinearIssueFinder } from '../../src/linear/issue-finder';
import { LinearIssueUpdater } from '../../src/linear/issue-updater';
import { PlanningDocument } from '../../src/planning/models';

// Mock the dependencies
jest.mock('../../src/linear/issue-creator');
jest.mock('../../src/linear/issue-finder');
jest.mock('../../src/linear/issue-updater');

describe('PlanningSessionManager', () => {
  let sessionManager: PlanningSessionManager;
  let mockIssueCreator: jest.Mocked<LinearIssueCreator>;
  let mockIssueFinder: jest.Mocked<LinearIssueFinder>;
  let mockIssueUpdater: jest.Mocked<LinearIssueUpdater>;
  let planningDocument: PlanningDocument;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockIssueCreator = new LinearIssueCreator('token', 'team-id') as jest.Mocked<LinearIssueCreator>;
    mockIssueFinder = new LinearIssueFinder('token', 'team-id') as jest.Mocked<LinearIssueFinder>;
    mockIssueUpdater = new LinearIssueUpdater('token') as jest.Mocked<LinearIssueUpdater>;
    
    // Set up mock implementations
    (LinearIssueCreator as jest.Mock).mockImplementation(() => mockIssueCreator);
    (LinearIssueFinder as jest.Mock).mockImplementation(() => mockIssueFinder);
    (LinearIssueUpdater as jest.Mock).mockImplementation(() => mockIssueUpdater);
    
    // Create a planning document
    planningDocument = {
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
              ]
            }
          ]
        }
      ]
    };
    
    // Create the session manager
    sessionManager = new PlanningSessionManager(
      planningDocument,
      'token',
      'team-id',
      'session-1'
    );
    
    // Mock the createIssuesFromPlanningDocument method
    mockIssueCreator.createIssuesFromPlanningDocument.mockResolvedValue({
      epics: { 'epic-1': 'linear-epic-1' },
      features: { 'feature-1': 'linear-feature-1' },
      stories: { 'story-1': 'linear-story-1' },
      enablers: {}
    });
  });
  
  describe('createIssues', () => {
    it('should create issues and return a successful result', async () => {
      const result = await sessionManager.createIssues();
      
      expect(result.sessionId).toBe('session-1');
      expect(result.status).toBe(PlanningSessionStatus.COMPLETED);
      expect(result.progress).toBe(100);
      expect(result.errors).toEqual([]);
      expect(result.result).toEqual({
        epics: { 'epic-1': 'linear-epic-1' },
        features: { 'feature-1': 'linear-feature-1' },
        stories: { 'story-1': 'linear-story-1' },
        enablers: {}
      });
      
      expect(mockIssueCreator.createIssuesFromPlanningDocument).toHaveBeenCalledWith(planningDocument);
    });
    
    it('should handle errors and return a failed result', async () => {
      // Mock the createIssuesFromPlanningDocument method to throw an error
      mockIssueCreator.createIssuesFromPlanningDocument.mockRejectedValue(new Error('Test error'));
      
      const result = await sessionManager.createIssues();
      
      expect(result.sessionId).toBe('session-1');
      expect(result.status).toBe(PlanningSessionStatus.FAILED);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toBe('Test error');
      expect(result.errors[0].item).toBe(planningDocument);
      
      expect(mockIssueCreator.createIssuesFromPlanningDocument).toHaveBeenCalledWith(planningDocument);
    });
  });
  
  describe('updateProgress', () => {
    it('should update the progress', async () => {
      await sessionManager.updateProgress(50);
      
      const result = sessionManager.getSessionResult();
      
      expect(result.progress).toBe(50);
    });
  });
  
  describe('handleError', () => {
    it('should add an error to the errors array', async () => {
      const error = new Error('Test error');
      const item = { id: 'item-1' };
      
      await sessionManager.handleError(error, item);
      
      const result = sessionManager.getSessionResult();
      
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toBe('Test error');
      expect(result.errors[0].item).toBe(item);
    });
  });
  
  describe('getSessionResult', () => {
    it('should return the current session result', () => {
      const result = sessionManager.getSessionResult();
      
      expect(result.sessionId).toBe('session-1');
      expect(result.status).toBe(PlanningSessionStatus.PENDING);
      expect(result.progress).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.result).toBeUndefined();
    });
  });
  
  describe('calculateTotalItems', () => {
    it('should calculate the total number of items in the planning document', () => {
      // Create a planning document with various items
      const document: PlanningDocument = {
        id: 'doc-1',
        title: 'Test Planning Document',
        description: 'Test Planning Document Description',
        epics: [
          {
            id: 'epic-1',
            title: 'Epic 1',
            description: 'Epic 1 Description',
            features: [
              {
                id: 'feature-1',
                title: 'Feature 1',
                description: 'Feature 1 Description',
                stories: [
                  {
                    id: 'story-1',
                    title: 'Story 1',
                    description: 'Story 1 Description'
                  },
                  {
                    id: 'story-2',
                    title: 'Story 2',
                    description: 'Story 2 Description'
                  }
                ],
                enablers: [
                  {
                    id: 'enabler-1',
                    title: 'Enabler 1',
                    description: 'Enabler 1 Description',
                    enablerType: 'architecture'
                  }
                ]
              }
            ]
          },
          {
            id: 'epic-2',
            title: 'Epic 2',
            description: 'Epic 2 Description'
          }
        ],
        features: [
          {
            id: 'feature-2',
            title: 'Feature 2',
            description: 'Feature 2 Description',
            stories: [
              {
                id: 'story-3',
                title: 'Story 3',
                description: 'Story 3 Description'
              }
            ]
          }
        ],
        stories: [
          {
            id: 'story-4',
            title: 'Story 4',
            description: 'Story 4 Description'
          }
        ],
        enablers: [
          {
            id: 'enabler-2',
            title: 'Enabler 2',
            description: 'Enabler 2 Description',
            enablerType: 'technical debt'
          }
        ]
      };
      
      // Create a session manager with this document
      const manager = new PlanningSessionManager(
        document,
        'token',
        'team-id',
        'session-1'
      );
      
      // Call the private method using any type assertion
      const totalItems = (manager as any).calculateTotalItems();
      
      // The total should be:
      // 2 epics + 1 feature in epic 1 + 2 stories in feature 1 + 1 enabler in feature 1 +
      // 1 standalone feature + 1 story in feature 2 + 1 standalone story + 1 standalone enabler
      // = 10 items
      expect(totalItems).toBe(10);
    });
  });
});
