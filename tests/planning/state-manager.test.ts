/**
 * Tests for the PlanningSessionStateManager class
 */

import { PlanningSessionStateManager } from '../../src/planning/state-manager';
import { PlanningSessionStatus } from '../../src/planning/state';
import * as dbModels from '../../src/db/models';

// Mock the database models
jest.mock('../../src/db/models');

describe('PlanningSessionStateManager', () => {
  // Mock data
  const mockSession = {
    id: 1,
    organization_id: 'org-123',
    confluence_page_url: 'https://confluence.example.com/page/123',
    planning_title: 'Test Planning Session',
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the state from the database', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      const state = await stateManager.initialize();

      // Check that the state was initialized correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PENDING,
        progress: 0,
        errors: [],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: mockSession.updated_at
      });

      // Check that getPlanningSession was called with the correct ID
      expect(dbModels.getPlanningSession).toHaveBeenCalledWith(1);
    });

    it('should throw an error if the planning session is not found', async () => {
      // Mock the getPlanningSession function to return null
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(null);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await expect(stateManager.initialize()).rejects.toThrow('Planning session not found: 1');

      // Check that getPlanningSession was called with the correct ID
      expect(dbModels.getPlanningSession).toHaveBeenCalledWith(1);
    });
  });

  describe('getState', () => {
    it('should return the state if it is already initialized', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Reset the mock to check that it's not called again
      (dbModels.getPlanningSession as jest.Mock).mockReset();

      // Get the state
      const state = await stateManager.getState();

      // Check that the state was returned correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PENDING,
        progress: 0,
        errors: [],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: mockSession.updated_at
      });

      // Check that getPlanningSession was not called again
      expect(dbModels.getPlanningSession).not.toHaveBeenCalled();
    });

    it('should initialize the state if it is not already initialized', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Get the state
      const state = await stateManager.getState();

      // Check that the state was initialized correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PENDING,
        progress: 0,
        errors: [],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: mockSession.updated_at
      });

      // Check that getPlanningSession was called with the correct ID
      expect(dbModels.getPlanningSession).toHaveBeenCalledWith(1);
    });
  });

  describe('updateState', () => {
    it('should update the state and persist it to the database', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Update the state
      const state = await stateManager.updateState({
        status: PlanningSessionStatus.PROCESSING,
        progress: 50,
        progressMessage: 'Processing'
      });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PROCESSING,
        progress: 50,
        progressMessage: 'Processing',
        errors: [],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.PROCESSING
      });
    });

    it('should initialize the state if it is not already initialized', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Update the state
      const state = await stateManager.updateState({
        status: PlanningSessionStatus.PROCESSING,
        progress: 50,
        progressMessage: 'Processing'
      });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PROCESSING,
        progress: 50,
        progressMessage: 'Processing',
        errors: [],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that getPlanningSession was called with the correct ID
      expect(dbModels.getPlanningSession).toHaveBeenCalledWith(1);
      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.PROCESSING
      });
    });

    it('should add an error to the state and set the status to failed', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Update the state
      const state = await stateManager.updateState({
        error: {
          message: 'Test error',
          timestamp: new Date()
        }
      });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.FAILED,
        progress: 0,
        errors: [
          {
            message: 'Test error',
            timestamp: expect.any(Date)
          }
        ],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.FAILED
      });
    });

    it('should add a warning to the state', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Update the state
      const state = await stateManager.updateState({
        warning: {
          message: 'Test warning',
          timestamp: new Date()
        }
      });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PENDING,
        progress: 0,
        errors: [],
        warnings: [
          {
            message: 'Test warning',
            timestamp: expect.any(Date)
          }
        ],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.PENDING
      });
    });

    it('should set the result and set the status to completed', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Update the state
      const state = await stateManager.updateState({
        result: {
          epics: { 'epic-1': 'linear-epic-1' },
          features: { 'feature-1': 'linear-feature-1' },
          stories: { 'story-1': 'linear-story-1' },
          enablers: { 'enabler-1': 'linear-enabler-1' }
        }
      });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.COMPLETED,
        progress: 0,
        errors: [],
        warnings: [],
        result: {
          epics: { 'epic-1': 'linear-epic-1' },
          features: { 'feature-1': 'linear-feature-1' },
          stories: { 'story-1': 'linear-story-1' },
          enablers: { 'enabler-1': 'linear-enabler-1' }
        },
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.COMPLETED
      });
    });
  });

  describe('setProgress', () => {
    it('should update the progress and progress message', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Set the progress
      const state = await stateManager.setProgress(50, 'Processing');

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PENDING,
        progress: 50,
        progressMessage: 'Processing',
        errors: [],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.PENDING
      });
    });
  });

  describe('setStatus', () => {
    it('should update the status', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Set the status
      const state = await stateManager.setStatus(PlanningSessionStatus.PROCESSING);

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PROCESSING,
        progress: 0,
        errors: [],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.PROCESSING
      });
    });
  });

  describe('addError', () => {
    it('should add an error to the state and set the status to failed', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Add an error
      const state = await stateManager.addError('Test error', 'TEST_ERROR', { foo: 'bar' });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.FAILED,
        progress: 0,
        errors: [
          {
            message: 'Test error',
            code: 'TEST_ERROR',
            details: { foo: 'bar' },
            timestamp: expect.any(Date)
          }
        ],
        warnings: [],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.FAILED
      });
    });
  });

  describe('addWarning', () => {
    it('should add a warning to the state', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Add a warning
      const state = await stateManager.addWarning('Test warning', 'TEST_WARNING', { foo: 'bar' });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.PENDING,
        progress: 0,
        errors: [],
        warnings: [
          {
            message: 'Test warning',
            code: 'TEST_WARNING',
            details: { foo: 'bar' },
            timestamp: expect.any(Date)
          }
        ],
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.PENDING
      });
    });
  });

  describe('setResult', () => {
    it('should set the result and set the status to completed', async () => {
      // Mock the getPlanningSession function
      (dbModels.getPlanningSession as jest.Mock).mockResolvedValue(mockSession);
      // Mock the updatePlanningSession function
      (dbModels.updatePlanningSession as jest.Mock).mockResolvedValue(mockSession);

      // Create a state manager
      const stateManager = new PlanningSessionStateManager('1');

      // Initialize the state
      await stateManager.initialize();

      // Set the result
      const state = await stateManager.setResult({
        epics: { 'epic-1': 'linear-epic-1' },
        features: { 'feature-1': 'linear-feature-1' },
        stories: { 'story-1': 'linear-story-1' },
        enablers: { 'enabler-1': 'linear-enabler-1' }
      });

      // Check that the state was updated correctly
      expect(state).toEqual({
        id: '1',
        organizationId: 'org-123',
        confluencePageUrl: 'https://confluence.example.com/page/123',
        planningTitle: 'Test Planning Session',
        status: PlanningSessionStatus.COMPLETED,
        progress: 0,
        errors: [],
        warnings: [],
        result: {
          epics: { 'epic-1': 'linear-epic-1' },
          features: { 'feature-1': 'linear-feature-1' },
          stories: { 'story-1': 'linear-story-1' },
          enablers: { 'enabler-1': 'linear-enabler-1' }
        },
        createdAt: mockSession.created_at,
        updatedAt: expect.any(Date)
      });

      // Check that updatePlanningSession was called with the correct parameters
      expect(dbModels.updatePlanningSession).toHaveBeenCalledWith(1, {
        status: PlanningSessionStatus.COMPLETED
      });
    });
  });
});
