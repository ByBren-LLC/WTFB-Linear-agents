/**
 * Tests for the PlanningSessionStateStore class
 */

import { PlanningSessionStateStore } from '../../src/planning/state-store';
import { PlanningSessionStateManager } from '../../src/planning/state-manager';
import { PlanningSessionStatus } from '../../src/planning/state';
import * as dbModels from '../../src/db/models';

// Mock the database models
jest.mock('../../src/db/models');
// Mock the state manager
jest.mock('../../src/planning/state-manager');

describe('PlanningSessionStateStore', () => {
  // Mock data
  const mockSession1 = {
    id: 1,
    organization_id: 'org-123',
    confluence_page_url: 'https://confluence.example.com/page/123',
    planning_title: 'Test Planning Session 1',
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockSession2 = {
    id: 2,
    organization_id: 'org-123',
    confluence_page_url: 'https://confluence.example.com/page/456',
    planning_title: 'Test Planning Session 2',
    status: 'processing',
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockState1 = {
    id: '1',
    organizationId: 'org-123',
    confluencePageUrl: 'https://confluence.example.com/page/123',
    planningTitle: 'Test Planning Session 1',
    status: PlanningSessionStatus.PENDING,
    progress: 0,
    errors: [],
    warnings: [],
    createdAt: mockSession1.created_at,
    updatedAt: mockSession1.updated_at
  };

  const mockState2 = {
    id: '2',
    organizationId: 'org-123',
    confluencePageUrl: 'https://confluence.example.com/page/456',
    planningTitle: 'Test Planning Session 2',
    status: PlanningSessionStatus.PROCESSING,
    progress: 50,
    progressMessage: 'Processing',
    errors: [],
    warnings: [],
    createdAt: mockSession2.created_at,
    updatedAt: mockSession2.updated_at
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getStateManager', () => {
    it('should return a state manager for the session ID', async () => {
      // Mock the PlanningSessionStateManager constructor
      (PlanningSessionStateManager as jest.Mock).mockImplementation((sessionId) => ({
        sessionId,
        initialize: jest.fn().mockResolvedValue(mockState1),
        getState: jest.fn().mockResolvedValue(mockState1)
      }));

      // Create a state store
      const stateStore = new PlanningSessionStateStore();

      // Get a state manager
      const stateManager = await stateStore.getStateManager('1');

      // Check that the state manager was created correctly
      expect(stateManager).toEqual({
        sessionId: '1',
        initialize: expect.any(Function),
        getState: expect.any(Function)
      });

      // Check that the PlanningSessionStateManager constructor was called with the correct ID
      expect(PlanningSessionStateManager).toHaveBeenCalledWith('1');
    });

    it('should return the same state manager for the same session ID', async () => {
      // Mock the PlanningSessionStateManager constructor
      (PlanningSessionStateManager as jest.Mock).mockImplementation((sessionId) => ({
        sessionId,
        initialize: jest.fn().mockResolvedValue(mockState1),
        getState: jest.fn().mockResolvedValue(mockState1)
      }));

      // Create a state store
      const stateStore = new PlanningSessionStateStore();

      // Get a state manager
      const stateManager1 = await stateStore.getStateManager('1');

      // Reset the mock to check that it's not called again
      (PlanningSessionStateManager as jest.Mock).mockReset();

      // Get a state manager for the same session ID
      const stateManager2 = await stateStore.getStateManager('1');

      // Check that the same state manager was returned
      expect(stateManager2).toBe(stateManager1);

      // Check that the PlanningSessionStateManager constructor was not called again
      expect(PlanningSessionStateManager).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return the state for the session ID', async () => {
      // Mock the PlanningSessionStateManager constructor
      (PlanningSessionStateManager as jest.Mock).mockImplementation((sessionId) => ({
        sessionId,
        initialize: jest.fn().mockResolvedValue(mockState1),
        getState: jest.fn().mockResolvedValue(mockState1)
      }));

      // Create a state store
      const stateStore = new PlanningSessionStateStore();

      // Get the state
      const state = await stateStore.getState('1');

      // Check that the state was returned correctly
      expect(state).toEqual(mockState1);

      // Check that the PlanningSessionStateManager constructor was called with the correct ID
      expect(PlanningSessionStateManager).toHaveBeenCalledWith('1');
    });
  });

  describe('getStatesByOrganization', () => {
    it('should return the states for the organization ID', async () => {
      // Mock the getPlanningSessionsByOrganization function
      (dbModels.getPlanningSessionsByOrganization as jest.Mock).mockResolvedValue([
        mockSession1,
        mockSession2
      ]);

      // Mock the PlanningSessionStateManager constructor
      (PlanningSessionStateManager as jest.Mock)
        .mockImplementationOnce((sessionId) => ({
          sessionId,
          initialize: jest.fn().mockResolvedValue(mockState1),
          getState: jest.fn().mockResolvedValue(mockState1)
        }))
        .mockImplementationOnce((sessionId) => ({
          sessionId,
          initialize: jest.fn().mockResolvedValue(mockState2),
          getState: jest.fn().mockResolvedValue(mockState2)
        }));

      // Create a state store
      const stateStore = new PlanningSessionStateStore();

      // Get the states
      const states = await stateStore.getStatesByOrganization('org-123');

      // Check that the states were returned correctly
      expect(states).toEqual([mockState1, mockState2]);

      // Check that getPlanningSessionsByOrganization was called with the correct ID
      expect(dbModels.getPlanningSessionsByOrganization).toHaveBeenCalledWith('org-123');
      // Check that the PlanningSessionStateManager constructor was called with the correct IDs
      expect(PlanningSessionStateManager).toHaveBeenCalledWith('1');
      expect(PlanningSessionStateManager).toHaveBeenCalledWith('2');
    });
  });

  describe('deleteState', () => {
    it('should delete the state for the session ID', async () => {
      // Mock the deletePlanningSession function
      (dbModels.deletePlanningSession as jest.Mock).mockResolvedValue(true);

      // Create a state store
      const stateStore = new PlanningSessionStateStore();

      // Delete the state
      const deleted = await stateStore.deleteState('1');

      // Check that the state was deleted correctly
      expect(deleted).toBe(true);

      // Check that deletePlanningSession was called with the correct ID
      expect(dbModels.deletePlanningSession).toHaveBeenCalledWith(1);
    });

    it('should return false if the planning session is not found', async () => {
      // Mock the deletePlanningSession function to return false
      (dbModels.deletePlanningSession as jest.Mock).mockResolvedValue(false);

      // Create a state store
      const stateStore = new PlanningSessionStateStore();

      // Delete the state
      const deleted = await stateStore.deleteState('1');

      // Check that the state was not deleted
      expect(deleted).toBe(false);

      // Check that deletePlanningSession was called with the correct ID
      expect(dbModels.deletePlanningSession).toHaveBeenCalledWith(1);
    });
  });
});
