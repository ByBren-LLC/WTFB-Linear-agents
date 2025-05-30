import { PIManager } from './pi-planning';
import { LinearClient, Cycle, Issue } from '@linear/sdk';
import { SAFeLinearImplementation } from './safe_linear_implementation';

// Mock the Linear client and SAFe implementation
jest.mock('@linear/sdk');
jest.mock('./safe_linear_implementation');

describe('PIManager', () => {
  let piManager: PIManager;
  let mockLinearClient: jest.Mocked<LinearClient>;
  let mockSAFeImplementation: jest.Mocked<SAFeLinearImplementation>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLinearClient = new LinearClient({ accessToken: 'mock-token' }) as jest.Mocked<LinearClient>;
    mockSAFeImplementation = new SAFeLinearImplementation('mock-token') as jest.Mocked<SAFeLinearImplementation>;

    // Create PIManager instance with mocked dependencies
    piManager = new PIManager('mock-token');
    (piManager as any).linearClient = mockLinearClient;
    (piManager as any).safeImplementation = mockSAFeImplementation;
  });

  describe('createProgramIncrement', () => {
    it('should create a Program Increment', async () => {
      // Mock the createCycle method for Linear SDK v2.6.0
      const mockCycle = {
        id: 'cycle-123',
        name: 'PI-2023-Q1',
        startsAt: '2023-01-01T00:00:00Z',
        endsAt: '2023-03-31T23:59:59Z',
        description: 'Test PI'
      } as unknown as Cycle;

      mockLinearClient.createCycle = jest.fn().mockResolvedValue({
        success: true,
        cycle: Promise.resolve(mockCycle)
      });

      // Call the method
      const result = await piManager.createProgramIncrement(
        'team-123',
        '2023-Q1',
        new Date('2023-01-01'),
        new Date('2023-03-31'),
        'Test PI'
      );

      // Verify the result
      expect(result).toEqual({
        id: 'cycle-123',
        name: 'PI-2023-Q1',
        startDate: new Date('2023-01-01T00:00:00Z'),
        endDate: new Date('2023-03-31T23:59:59Z'),
        description: 'Test PI',
        features: [],
        status: 'completed' // This will depend on the current date during the test
      });

      // Verify that the Linear client was called correctly
      expect(mockLinearClient.createCycle).toHaveBeenCalledWith({
        teamId: 'team-123',
        name: 'PI-2023-Q1',
        description: 'Test PI',
        startsAt: new Date('2023-01-01').toISOString(),
        endsAt: new Date('2023-03-31').toISOString()
      });
    });

    it('should throw an error if cycle creation fails', async () => {
      // Mock the createCycle method to fail for Linear SDK v2.6.0
      mockLinearClient.createCycle = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to create cycle'
      });

      // Call the method and expect it to throw
      await expect(
        piManager.createProgramIncrement(
          'team-123',
          '2023-Q1',
          new Date('2023-01-01'),
          new Date('2023-03-31'),
          'Test PI'
        )
      ).rejects.toThrow('Failed to create Program Increment: Failed to create cycle');
    });
  });

  describe('assignFeaturesToPI', () => {
    it('should assign features to a Program Increment', async () => {
      // Mock the issue method
      const mockFeature = {
        id: 'feature-123',
        team: { id: 'team-123' },
        state: { name: 'In Progress' }
      } as unknown as Issue;

      mockLinearClient.issue = jest.fn().mockResolvedValue(mockFeature);

      // Mock the updateIssue method for Linear SDK v2.6.0
      mockLinearClient.updateIssue = jest.fn().mockResolvedValue({
        success: true,
        issue: Promise.resolve(mockFeature)
      });

      // Call the method
      const result = await piManager.assignFeaturesToPI('pi-123', ['feature-123']);

      // Verify the result
      expect(result).toEqual([
        {
          id: 'pi-123-feature-123',
          piId: 'pi-123',
          featureId: 'feature-123',
          teamId: 'team-123',
          status: 'in-progress',
          confidence: 3,
          dependencies: []
        }
      ]);

      // Verify that the Linear client was called correctly
      expect(mockLinearClient.issue).toHaveBeenCalledWith('feature-123');
      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith('feature-123', {
        cycleId: 'pi-123'
      });
    });

    it('should handle feature not found', async () => {
      // Mock the issue method to return null
      mockLinearClient.issue = jest.fn().mockResolvedValue(null);

      // Call the method
      const result = await piManager.assignFeaturesToPI('pi-123', ['feature-123']);

      // Verify the result
      expect(result).toEqual([]);

      // Verify that the Linear client was called correctly
      expect(mockLinearClient.issue).toHaveBeenCalledWith('feature-123');
      // Note: issues.update won't be called since we're not setting up the mock structure
    });

    it('should handle feature update failure', async () => {
      // Mock the issue method
      const mockFeature = {
        id: 'feature-123',
        team: { id: 'team-123' },
        state: { name: 'In Progress' }
      } as unknown as Issue;

      mockLinearClient.issue = jest.fn().mockResolvedValue(mockFeature);

      // Mock the updateIssue method to fail for Linear SDK v2.6.0
      mockLinearClient.updateIssue = jest.fn().mockResolvedValue({
        success: false,
        error: 'Failed to update issue'
      });

      // Call the method
      const result = await piManager.assignFeaturesToPI('pi-123', ['feature-123']);

      // Verify the result
      expect(result).toEqual([]);

      // Verify that the Linear client was called correctly
      expect(mockLinearClient.issue).toHaveBeenCalledWith('feature-123');
      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith('feature-123', {
        cycleId: 'pi-123'
      });
    });
  });

  describe('getProgramIncrements', () => {
    it('should get all Program Increments for a team', async () => {
      // Mock the cycles method
      const mockCycles = {
        nodes: [
          {
            id: 'cycle-123',
            name: 'PI-2023-Q1',
            startsAt: '2023-01-01T00:00:00Z',
            endsAt: '2023-03-31T23:59:59Z',
            description: 'Test PI'
          } as unknown as Cycle
        ]
      };

      mockLinearClient.cycles = jest.fn().mockResolvedValue(mockCycles);

      // Mock the issues method for features
      const mockIssues = {
        nodes: [
          {
            id: 'feature-123',
            team: { id: 'team-123' },
            state: { name: 'In Progress' }
          } as unknown as Issue
        ]
      };

      mockLinearClient.issues = jest.fn().mockResolvedValue(mockIssues);

      // Call the method
      const result = await piManager.getProgramIncrements('team-123');

      // Verify the result
      expect(result).toEqual([
        {
          id: 'cycle-123',
          name: 'PI-2023-Q1',
          startDate: new Date('2023-01-01T00:00:00Z'),
          endDate: new Date('2023-03-31T23:59:59Z'),
          description: 'Test PI',
          features: ['feature-123'],
          status: 'completed' // This will depend on the current date during the test
        }
      ]);

      // Verify that the Linear client was called correctly
      expect(mockLinearClient.cycles).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
          name: { startsWith: 'PI-' }
        }
      });

      expect(mockLinearClient.issues).toHaveBeenCalledWith({
        filter: {
          cycle: { id: { eq: 'cycle-123' } },
          labels: { name: { eq: 'Feature' } }
        }
      });
    });
  });

  describe('getCurrentProgramIncrement', () => {
    it('should get the current Program Increment for a team', async () => {
      // Mock the cycles method
      const mockCycles = {
        nodes: [
          {
            id: 'cycle-123',
            name: 'PI-2023-Q1',
            startsAt: '2023-01-01T00:00:00Z',
            endsAt: '2023-03-31T23:59:59Z',
            description: 'Test PI'
          } as unknown as Cycle
        ]
      };

      mockLinearClient.cycles = jest.fn().mockResolvedValue(mockCycles);

      // Mock the issues method for features
      const mockIssues = {
        nodes: [
          {
            id: 'feature-123',
            team: { id: 'team-123' },
            state: { name: 'In Progress' }
          } as unknown as Issue
        ]
      };

      mockLinearClient.issues = jest.fn().mockResolvedValue(mockIssues);

      // Call the method
      const result = await piManager.getCurrentProgramIncrement('team-123');

      // Verify the result
      expect(result).toEqual({
        id: 'cycle-123',
        name: 'PI-2023-Q1',
        startDate: new Date('2023-01-01T00:00:00Z'),
        endDate: new Date('2023-03-31T23:59:59Z'),
        description: 'Test PI',
        features: ['feature-123'],
        status: 'completed' // This will depend on the current date during the test
      });

      // Verify that the Linear client was called correctly
      expect(mockLinearClient.cycles).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
          name: { startsWith: 'PI-' },
          startsAt: { lte: expect.any(String) },
          endsAt: { gte: expect.any(String) }
        }
      });

      expect(mockLinearClient.issues).toHaveBeenCalledWith({
        filter: {
          cycle: { id: { eq: 'cycle-123' } },
          labels: { name: { eq: 'Feature' } }
        }
      });
    });

    it('should return null if no current Program Increment is found', async () => {
      // Mock the cycles method to return empty array
      mockLinearClient.cycles = jest.fn().mockResolvedValue({ nodes: [] });

      // Call the method
      const result = await piManager.getCurrentProgramIncrement('team-123');

      // Verify the result
      expect(result).toBeNull();

      // Verify that the Linear client was called correctly
      expect(mockLinearClient.cycles).toHaveBeenCalledWith({
        filter: {
          team: { id: { eq: 'team-123' } },
          name: { startsWith: 'PI-' },
          startsAt: { lte: expect.any(String) },
          endsAt: { gte: expect.any(String) }
        }
      });

      expect(mockLinearClient.issues).not.toHaveBeenCalled();
    });
  });

  // Add more tests for other methods as needed
});
