import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LinearIssueCreatorFromPlanning } from '../../src/planning/linear-issue-creator';
import { PlanningIssueMapper } from '../../src/linear/planning-issue-mapper';
import { ConfluenceClient } from '../../src/confluence/client';
import { PlanningExtractor } from '../../src/planning/extractor';
import { mockResolvedValue, mockRejectedValue, mockReturnValue } from '../types/mock-types';

// Mock dependencies
jest.mock('../../src/linear/planning-issue-mapper');
jest.mock('../../src/confluence/client');
jest.mock('../../src/planning/extractor');

describe('LinearIssueCreatorFromPlanning', () => {
  let issueCreator: LinearIssueCreatorFromPlanning;
  let mockPlanningIssueMapper: jest.Mocked<PlanningIssueMapper>;
  let mockConfluenceClient: jest.Mocked<ConfluenceClient>;
  let mockPlanningExtractor: jest.Mocked<PlanningExtractor>;

  const options = {
    linearAccessToken: 'linear-token',
    linearTeamId: 'team-id',
    linearOrganizationId: 'org-id',
    confluenceAccessToken: 'confluence-token',
    confluenceBaseUrl: 'https://example.atlassian.net',
    confluencePageIdOrUrl: 'page-id'
  };

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
    features: [],
    stories: [],
    enablers: []
  };

  const mockMappingResult = {
    epics: { 'epic-1': 'linear-epic-1' },
    features: {},
    stories: {},
    enablers: {},
    createdCount: 1,
    updatedCount: 0,
    errorCount: 0,
    errors: []
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    (PlanningIssueMapper as jest.Mock).mockImplementation(() => ({
      mapToLinear: mockResolvedValue(mockMappingResult)
    }));

    (ConfluenceClient as jest.Mock).mockImplementation(() => ({
      parsePage: mockResolvedValue({}),
      parsePageByUrl: mockResolvedValue({})
    }));

    (PlanningExtractor as jest.Mock).mockImplementation(() => ({
      getPlanningDocument: mockReturnValue(mockPlanningDocument)
    }));

    // Create instance with mocked dependencies
    issueCreator = new LinearIssueCreatorFromPlanning(options);
    
    // Get mock instances
    mockPlanningIssueMapper = (PlanningIssueMapper as unknown) as jest.Mocked<PlanningIssueMapper>;
    mockConfluenceClient = (ConfluenceClient as unknown) as jest.Mocked<ConfluenceClient>;
    mockPlanningExtractor = (PlanningExtractor as unknown) as jest.Mocked<PlanningExtractor>;
  });

  describe('createIssuesFromConfluence', () => {
    it('should create issues from Confluence planning data', async () => {
      // Arrange
      const mockDocument = {};
      (mockConfluenceClient.parsePage as jest.Mock).mockResolvedValue(mockDocument);
      (mockPlanningExtractor.getPlanningDocument as jest.Mock).mockReturnValue(mockPlanningDocument);
      (mockPlanningIssueMapper.mapToLinear as jest.Mock).mockResolvedValue(mockMappingResult);

      // Act
      const result = await issueCreator.createIssuesFromConfluence();

      // Assert
      expect(mockConfluenceClient.parsePage).toHaveBeenCalledWith(options.confluencePageIdOrUrl);
      expect(mockPlanningIssueMapper.mapToLinear).toHaveBeenCalledWith(mockPlanningDocument);
      expect(result).toEqual({
        ...mockMappingResult,
        planningDocument: mockPlanningDocument
      });
    });

    it('should handle Confluence page URLs', async () => {
      // Arrange
      const urlOptions = {
        ...options,
        confluencePageIdOrUrl: 'https://example.atlassian.net/wiki/spaces/SPACE/pages/123456789'
      };
      const urlIssueCreator = new LinearIssueCreatorFromPlanning(urlOptions);
      const mockDocument = {};
      (mockConfluenceClient.parsePageByUrl as jest.Mock).mockResolvedValue(mockDocument);
      (mockPlanningExtractor.getPlanningDocument as jest.Mock).mockReturnValue(mockPlanningDocument);
      (mockPlanningIssueMapper.mapToLinear as jest.Mock).mockResolvedValue(mockMappingResult);

      // Act
      const result = await urlIssueCreator.createIssuesFromConfluence();

      // Assert
      expect(mockConfluenceClient.parsePageByUrl).toHaveBeenCalledWith(urlOptions.confluencePageIdOrUrl);
      expect(mockPlanningIssueMapper.mapToLinear).toHaveBeenCalledWith(mockPlanningDocument);
      expect(result).toEqual({
        ...mockMappingResult,
        planningDocument: mockPlanningDocument
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      (mockConfluenceClient.parsePage as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(issueCreator.createIssuesFromConfluence()).rejects.toThrow(error);
    });
  });

  describe('createIssuesFromPlanningDocument', () => {
    it('should create issues from a planning document', async () => {
      // Arrange
      (mockPlanningIssueMapper.mapToLinear as jest.Mock).mockResolvedValue(mockMappingResult);

      // Act
      const result = await issueCreator.createIssuesFromPlanningDocument(mockPlanningDocument as any);

      // Assert
      expect(mockPlanningIssueMapper.mapToLinear).toHaveBeenCalledWith(mockPlanningDocument);
      expect(result).toEqual({
        ...mockMappingResult,
        planningDocument: mockPlanningDocument
      });
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Test error');
      (mockPlanningIssueMapper.mapToLinear as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(issueCreator.createIssuesFromPlanningDocument(mockPlanningDocument as any)).rejects.toThrow(error);
    });
  });
});
