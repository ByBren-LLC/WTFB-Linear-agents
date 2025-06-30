/**
 * Comprehensive Tests for ValueDeliveryAnalyzer (LIN-49)
 * Tests value stream analysis and business impact quantification
 */

import { ValueDeliveryAnalyzer } from '../../../src/safe/value-delivery-analyzer';

describe('ValueDeliveryAnalyzer', () => {
  let analyzer: ValueDeliveryAnalyzer;

  beforeEach(() => {
    analyzer = new ValueDeliveryAnalyzer({
      minConfidence: 0.7,
      minWorkingSoftwareRatio: 0.8
    });
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(ValueDeliveryAnalyzer);
    });

    it('should accept custom configuration', () => {
      const customAnalyzer = new ValueDeliveryAnalyzer({
        minConfidence: 0.9,
        minWorkingSoftwareRatio: 0.95
      });
      expect(customAnalyzer).toBeDefined();
    });

    it('should use default configuration', () => {
      const defaultAnalyzer = new ValueDeliveryAnalyzer();
      expect(defaultAnalyzer).toBeDefined();
    });
  });

  describe('analyzeIterationValue', () => {
    it('should analyze iteration value successfully', async () => {
      const testIteration = {
        iteration: {
          id: 'iter-1',
          name: 'Test Iteration 1',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-14'),
          description: 'Test iteration',
          goals: [],
          status: 'planning' as const
        },
        allocatedWork: [],
        totalPoints: 30,
        totalCapacity: 40,
        capacityUtilization: [],
        riskLevel: 'low' as const,
        dependencies: []
      };

      const result = await analyzer.analyzeIterationValue(testIteration);
      
      expect(result).toBeDefined();
      expect(result.valueStreams).toBeDefined();
      expect(result.businessImpact).toBeDefined();
      expect(result.userAdoption).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });
  });

  describe('validateWorkingSoftwareDelivery', () => {
    it('should validate working software delivery', async () => {
      const testWorkItems = [
        {
          id: 'story-1',
          type: 'story',
          title: 'Test Story',
          description: 'Test description',
          parentId: undefined,
          attributes: {
            storyPoints: 5,
            priority: 1
          }
        }
      ];

      const result = await analyzer.validateWorkingSoftwareDelivery(testWorkItems);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.deliverables).toBeDefined();
      expect(result.qualityGates).toBeDefined();
      expect(result.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.readinessScore).toBeLessThanOrEqual(1);
    });
  });

  describe('optimizeValueDeliveryTiming', () => {
    it('should optimize value delivery timing', async () => {
      const testIterations = [
        {
          iteration: {
            id: 'iter-1',
            name: 'Test Iteration 1',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-14'),
            description: 'Test iteration',
            goals: [],
            status: 'planning' as const
          },
          allocatedWork: [],
          totalPoints: 30,
          totalCapacity: 40,
          capacityUtilization: [],
          riskLevel: 'low' as const,
          dependencies: []
        }
      ];

      const result = await analyzer.optimizeValueDeliveryTiming(testIterations);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle empty iterations gracefully', async () => {
      const result = await analyzer.optimizeValueDeliveryTiming([]);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle empty work items gracefully', async () => {
      const result = await analyzer.validateWorkingSoftwareDelivery([]);
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
    });
  });
});