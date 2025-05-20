/**
 * Tests for SAFe Linear Implementation
 * 
 * This file contains tests for the SAFe Linear Implementation.
 * It demonstrates how to use the implementation to create and manage
 * SAFe entities in Linear.
 */
import { SAFeLinearImplementation, EnablerType } from './safe_linear_implementation';

// Mock the LinearClient
jest.mock('@linear/sdk', () => {
  return {
    LinearClient: jest.fn().mockImplementation(() => {
      return {
        issueCreate: jest.fn().mockImplementation(async (data) => {
          return {
            success: true,
            issue: {
              id: 'mock-issue-id',
              ...data
            }
          };
        }),
        issueUpdate: jest.fn().mockImplementation(async (id, data) => {
          return {
            success: true,
            issue: {
              id,
              ...data
            }
          };
        }),
        issues: jest.fn().mockImplementation(async () => {
          return {
            nodes: [
              { id: 'mock-issue-1', title: '[EPIC] Mock Epic' },
              { id: 'mock-issue-2', title: '[FEATURE] Mock Feature' }
            ]
          };
        }),
        cycleCreate: jest.fn().mockImplementation(async (data) => {
          return {
            success: true,
            cycle: {
              id: 'mock-cycle-id',
              ...data
            }
          };
        }),
        cycles: jest.fn().mockImplementation(async () => {
          return {
            nodes: [
              { id: 'mock-cycle-1', name: 'PI-2023-Q1' },
              { id: 'mock-cycle-2', name: 'PI-2023-Q2' }
            ]
          };
        }),
        issueLabels: jest.fn().mockImplementation(async () => {
          return {
            nodes: [
              { id: 'mock-label-epic', name: 'Epic' },
              { id: 'mock-label-feature', name: 'Feature' },
              { id: 'mock-label-enabler', name: 'Enabler' },
              { id: 'mock-label-business', name: 'Business' },
              { id: 'mock-label-architecture', name: 'Architecture' }
            ]
          };
        }),
        issueLabelCreate: jest.fn().mockImplementation(async (data) => {
          return {
            success: true,
            issueLabel: {
              id: `mock-label-${data.name.toLowerCase()}`,
              ...data
            }
          };
        })
      };
    })
  };
});

// Mock the logger
jest.mock('../utils/logger', () => {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };
});

describe('SAFeLinearImplementation', () => {
  let safeLinear: SAFeLinearImplementation;
  
  beforeEach(() => {
    safeLinear = new SAFeLinearImplementation('mock-token');
  });
  
  describe('createEpic', () => {
    it('should create an Epic with the correct format', async () => {
      const epic = await safeLinear.createEpic(
        'team-id',
        'Test Epic',
        'Epic description',
        ['test-label']
      );
      
      expect(epic).toBeDefined();
      expect(epic?.title).toBe('[EPIC] Test Epic');
    });
  });
  
  describe('createFeature', () => {
    it('should create a Feature as a child of an Epic', async () => {
      const feature = await safeLinear.createFeature(
        'team-id',
        'epic-id',
        'Test Feature',
        'Feature description',
        ['test-label'],
        true
      );
      
      expect(feature).toBeDefined();
      expect(feature?.title).toBe('[FEATURE] Test Feature');
      expect(feature?.parentId).toBe('epic-id');
    });
  });
  
  describe('createStory', () => {
    it('should create a Story as a child of a Feature', async () => {
      const story = await safeLinear.createStory(
        'team-id',
        'feature-id',
        'Test Story',
        'Story description',
        ['test-label']
      );
      
      expect(story).toBeDefined();
      expect(story?.title).toBe('Test Story');
      expect(story?.parentId).toBe('feature-id');
    });
  });
  
  describe('createEnabler', () => {
    it('should create an Enabler with the correct type', async () => {
      const enabler = await safeLinear.createEnabler(
        'team-id',
        'feature-id',
        'Test Enabler',
        'Enabler description',
        EnablerType.ARCHITECTURE,
        ['test-label']
      );
      
      expect(enabler).toBeDefined();
      expect(enabler?.title).toBe('[ENABLER] Test Enabler');
      expect(enabler?.parentId).toBe('feature-id');
    });
  });
  
  describe('createProgramIncrement', () => {
    it('should create a Program Increment as a Cycle', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-03-31');
      
      const pi = await safeLinear.createProgramIncrement(
        'team-id',
        '2023-Q1',
        startDate,
        endDate,
        'PI description'
      );
      
      expect(pi).toBeDefined();
      expect(pi?.name).toBe('PI-2023-Q1');
      expect(pi?.startsAt).toBe(startDate.toISOString());
      expect(pi?.endsAt).toBe(endDate.toISOString());
    });
  });
  
  describe('assignFeaturesToPI', () => {
    it('should assign Features to a Program Increment', async () => {
      const features = await safeLinear.assignFeaturesToPI(
        'pi-id',
        ['feature-1', 'feature-2']
      );
      
      expect(features).toHaveLength(2);
      expect(features[0].cycleId).toBe('pi-id');
      expect(features[1].cycleId).toBe('pi-id');
    });
  });
  
  describe('getEpics', () => {
    it('should get all Epics for a team', async () => {
      const epics = await safeLinear.getEpics('team-id');
      
      expect(epics).toHaveLength(2);
    });
  });
  
  describe('getFeatures', () => {
    it('should get all Features for a team', async () => {
      const features = await safeLinear.getFeatures('team-id');
      
      expect(features).toHaveLength(2);
    });
  });
  
  describe('getEnablers', () => {
    it('should get all Enablers for a team', async () => {
      const enablers = await safeLinear.getEnablers('team-id');
      
      expect(enablers).toHaveLength(2);
    });
  });
  
  describe('getProgramIncrements', () => {
    it('should get all Program Increments for a team', async () => {
      const pis = await safeLinear.getProgramIncrements('team-id');
      
      expect(pis).toHaveLength(2);
      expect(pis[0].name).toBe('PI-2023-Q1');
      expect(pis[1].name).toBe('PI-2023-Q2');
    });
  });
  
  describe('getCurrentProgramIncrement', () => {
    it('should get the current Program Increment for a team', async () => {
      const pi = await safeLinear.getCurrentProgramIncrement('team-id');
      
      expect(pi).toBeDefined();
      expect(pi?.name).toBe('PI-2023-Q1');
    });
  });
});
