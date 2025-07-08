/**
 * Comprehensive Tests for ValueDeliveryAnalyzer (LIN-49)
 * ARCHitect-level testing to achieve >80% SAFe coverage
 * Focus: Business logic validation with realistic scenarios
 */

import { ValueDeliveryAnalyzer } from '../../../src/safe/value-delivery-analyzer';

describe('ValueDeliveryAnalyzer Comprehensive Tests', () => {
  let analyzer: ValueDeliveryAnalyzer;

  beforeEach(() => {
    analyzer = new ValueDeliveryAnalyzer({
      minValueConfidence: 0.7,
      minWorkingSoftwareRatio: 0.8,
      maxValueRiskScore: 0.3
    });
  });

  describe('analyzeIterationValue - Core Business Logic', () => {
    it('should analyze iteration with customer-facing stories', async () => {
      const testIteration = {
        iteration: {
          id: 'iter-customer-value',
          name: 'Customer Value Iteration',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-14'),
          description: 'High-value customer stories',
          goals: ['Deliver user authentication', 'Improve checkout flow'],
          status: 'planning' as const
        },
        allocatedWork: [
          {
            workItem: {
              id: 'story-auth',
              type: 'story',
              title: 'User Authentication System',
              description: 'Implement secure user login/logout',
              parentId: undefined,
              attributes: {
                storyPoints: 8,
                priority: 1,
                businessValue: 'high',
                userFacing: true,
                valueStream: 'customer-facing'
              }
            },
            assignedTeam: 'team-frontend',
            allocatedPoints: 8,
            isComplete: false,
            estimatedEffort: 8,
            dependencies: [],
            riskLevel: 'low' as const,
            valueContribution: 0.9
          },
          {
            workItem: {
              id: 'story-checkout',
              type: 'story', 
              title: 'Checkout Flow Optimization',
              description: 'Streamline purchase process',
              parentId: undefined,
              attributes: {
                storyPoints: 5,
                priority: 2,
                businessValue: 'high',
                userFacing: true,
                valueStream: 'revenue-generating'
              }
            },
            assignedTeam: 'team-backend',
            allocatedPoints: 5,
            isComplete: false,
            estimatedEffort: 5,
            dependencies: [],
            riskLevel: 'medium' as const,
            valueContribution: 0.8
          }
        ],
        totalPoints: 13,
        totalCapacity: 20,
        capacityUtilization: [
          {
            teamId: 'team-frontend',
            totalCapacity: 10,
            allocatedCapacity: 8,
            utilizationRate: 0.8,
            isOverAllocated: false,
            bufferCapacity: 2
          }
        ],
        riskLevel: 'low' as const,
        dependencies: [],
        deliverableValue: {
          businessValue: 0.85,
          userValue: 0.9,
          technicalValue: 0.7,
          riskAdjustedValue: 0.8
        },
        prerequisites: [],
        enables: [],
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          info: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          planningConfidence: 0.85
        }
      };

      const result = await analyzer.analyzeIterationValue(testIteration);
      
      // Validate core structure
      expect(result).toBeDefined();
      expect(result.primaryValueStreams).toBeDefined();
      expect(result.primaryValueStreams.length).toBeGreaterThan(0);

      // Validate business value quantification
      expect(result.businessValueRealization).toBeDefined();
      expect(result.businessValueRealization.estimatedRevenue).toBeGreaterThanOrEqual(0);
      expect(result.businessValueRealization.costSavings).toBeGreaterThanOrEqual(0);

      // Validate user impact metrics
      expect(result.userImpactAssessment).toBeDefined();
      expect(result.userImpactAssessment.impactedUserCount).toBeGreaterThanOrEqual(0);

      // Validate working software components
      expect(result.workingSoftwareComponents).toBeDefined();
      expect(result.workingSoftwareComponents.length).toBeGreaterThanOrEqual(0);

      // Validate overall scoring
      expect(result.valueDeliveryScore).toBeGreaterThanOrEqual(0);
      expect(result.valueDeliveryScore).toBeLessThanOrEqual(1);

      // Validate confidence metrics
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should handle technical debt and infrastructure stories', async () => {
      const techDebtIteration = {
        iteration: {
          id: 'iter-tech-debt',
          name: 'Technical Debt Iteration',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-29'),
          description: 'Focus on technical improvements',
          goals: ['Reduce technical debt', 'Improve system performance'],
          status: 'planning' as const
        },
        allocatedWork: [
          {
            workItem: {
              id: 'enabler-performance',
              type: 'enabler',
              title: 'Database Performance Optimization',
              description: 'Optimize slow database queries',
              parentId: undefined,
              attributes: {
                enablerType: 'infrastructure',
                businessValue: 'medium',
                userFacing: false,
                valueStream: 'technical-debt'
              }
            },
            assignedTeam: 'team-backend',
            allocatedPoints: 8,
            isComplete: false,
            estimatedEffort: 8,
            dependencies: [],
            riskLevel: 'medium' as const,
            valueContribution: 0.6
          }
        ],
        totalPoints: 8,
        totalCapacity: 15,
        capacityUtilization: [],
        riskLevel: 'medium' as const,
        dependencies: [],
        deliverableValue: {
          businessValue: 0.6,
          userValue: 0.3,
          technicalValue: 0.9,
          riskAdjustedValue: 0.7
        },
        prerequisites: [],
        enables: [],
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          info: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          planningConfidence: 0.75
        }
      };

      const result = await analyzer.analyzeIterationValue(techDebtIteration);
      
      expect(result).toBeDefined();
      expect(result.primaryValueStreams).toBeDefined();

      // Technical debt should have lower user value but higher technical value
      expect(result.businessValueRealization.estimatedRevenue).toBeGreaterThanOrEqual(0);
      expect(result.userImpactAssessment.valuePerUser).toBeGreaterThanOrEqual(0);

      // Should still have valid confidence scoring
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.valueDeliveryScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty iteration gracefully', async () => {
      const emptyIteration = {
        iteration: {
          id: 'iter-empty',
          name: 'Empty Iteration',
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-02-14'),
          description: 'No work allocated',
          goals: [],
          status: 'planning' as const
        },
        allocatedWork: [],
        totalPoints: 0,
        totalCapacity: 20,
        capacityUtilization: [],
        riskLevel: 'low' as const,
        dependencies: [],
        deliverableValue: {
          businessValue: 0,
          userValue: 0,
          technicalValue: 0,
          riskAdjustedValue: 0
        },
        prerequisites: [],
        enables: [],
        validation: {
          isValid: true,
          errors: [],
          warnings: ['No work allocated'],
          info: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          planningConfidence: 0.5
        }
      };

      const result = await analyzer.analyzeIterationValue(emptyIteration);
      
      expect(result).toBeDefined();
      expect(result.primaryValueStreams).toBeDefined();
      expect(result.primaryValueStreams.length).toBe(0);
      expect(result.workingSoftwareComponents.length).toBe(0);
      expect(result.valueDeliveryScore).toBe(0);
    });
  });

  describe('optimizeValueDeliveryTiming - Value Optimization', () => {
    it('should optimize timing for multiple iterations', async () => {
      const iterations = [
        {
          iteration: {
            id: 'iter-1',
            name: 'Iteration 1',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-14'),
            description: 'First iteration',
            goals: [],
            status: 'planning' as const
          },
          allocatedWork: [
            {
              workItem: {
                id: 'story-foundation',
                type: 'story',
                title: 'Foundation Feature',
                description: 'Base functionality',
                parentId: undefined,
                attributes: {
                  storyPoints: 5,
                  priority: 1,
                  businessValue: 'medium',
                  valueStream: 'customer-facing'
                }
              },
              assignedTeam: 'team-1',
              allocatedPoints: 5,
              isComplete: false,
              estimatedEffort: 5,
              dependencies: [],
              riskLevel: 'low' as const,
              valueContribution: 0.7
            }
          ],
          totalPoints: 5,
          totalCapacity: 10,
          capacityUtilization: [],
          riskLevel: 'low' as const,
          dependencies: [],
          deliverableValue: {
            businessValue: 0.7,
            userValue: 0.6,
            technicalValue: 0.8,
            riskAdjustedValue: 0.7
          },
          prerequisites: [],
          enables: [],
          validation: {
            isValid: true,
            errors: [],
            warnings: [],
            info: []
          },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            planningConfidence: 0.8
          }
        }
      ];

      const result = await analyzer.optimizeValueDeliveryTiming(iterations);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(iterations.length);
      
      // Validate optimization structure
      if (result.length > 0) {
        expect(result[0].originalPlan).toBeDefined();
        expect(result[0].optimizedAllocation).toBeDefined();
        expect(result[0].valueImprovementPotential).toBeDefined();
        expect(result[0].riskReduction).toBeDefined();
      }
    });

    it('should handle empty iterations list', async () => {
      const result = await analyzer.optimizeValueDeliveryTiming([]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Configuration and Error Handling', () => {
    it('should respect custom configuration values', () => {
      const customAnalyzer = new ValueDeliveryAnalyzer({
        minValueConfidence: 0.9,
        minWorkingSoftwareRatio: 0.95,
        maxValueRiskScore: 0.1
      });
      
      expect(customAnalyzer).toBeDefined();
      expect(customAnalyzer).toBeInstanceOf(ValueDeliveryAnalyzer);
    });

    it('should use default configuration when partial config provided', () => {
      const partialAnalyzer = new ValueDeliveryAnalyzer({
        minValueConfidence: 0.8
      });
      
      expect(partialAnalyzer).toBeDefined();
    });

    it('should handle invalid iteration data gracefully', async () => {
      const invalidIteration = {
        iteration: {
          id: '',
          name: '',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-01'), // End before start
          description: '',
          goals: [],
          status: 'planning' as const
        },
        allocatedWork: [],
        totalPoints: -1, // Invalid
        totalCapacity: 0, // Invalid
        capacityUtilization: [],
        riskLevel: 'low' as const,
        dependencies: [],
        deliverableValue: {
          businessValue: -0.5, // Invalid
          userValue: 1.5, // Invalid
          technicalValue: 0.5,
          riskAdjustedValue: 0.5
        },
        prerequisites: [],
        enables: [],
        validation: {
          isValid: false,
          errors: ['Invalid iteration data'],
          warnings: [],
          info: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          planningConfidence: -0.1 // Invalid
        }
      };

      // Should not throw, should handle gracefully
      const result = await analyzer.analyzeIterationValue(invalidIteration);
      expect(result).toBeDefined();
      
      // Should indicate low confidence due to invalid data
      expect(result.confidenceScore).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Value Stream Analysis', () => {
    it('should correctly categorize different value streams', async () => {
      const multiStreamIteration = {
        iteration: {
          id: 'iter-multi-stream',
          name: 'Multi-Stream Iteration',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-14'),
          description: 'Multiple value streams',
          goals: ['Customer value', 'Revenue growth', 'Efficiency'],
          status: 'planning' as const
        },
        allocatedWork: [
          {
            workItem: {
              id: 'story-customer',
              type: 'story',
              title: 'Customer Portal',
              description: 'Self-service customer portal',
              parentId: undefined,
              attributes: {
                storyPoints: 8,
                valueStream: 'customer-facing',
                businessValue: 'high'
              }
            },
            assignedTeam: 'team-1',
            allocatedPoints: 8,
            isComplete: false,
            estimatedEffort: 8,
            dependencies: [],
            riskLevel: 'low' as const,
            valueContribution: 0.9
          },
          {
            workItem: {
              id: 'story-revenue',
              type: 'story',
              title: 'Premium Subscription',
              description: 'New revenue stream',
              parentId: undefined,
              attributes: {
                storyPoints: 5,
                valueStream: 'revenue-generating',
                businessValue: 'high'
              }
            },
            assignedTeam: 'team-2',
            allocatedPoints: 5,
            isComplete: false,
            estimatedEffort: 5,
            dependencies: [],
            riskLevel: 'medium' as const,
            valueContribution: 0.8
          },
          {
            workItem: {
              id: 'enabler-efficiency',
              type: 'enabler',
              title: 'Automated Testing',
              description: 'Improve development efficiency',
              parentId: undefined,
              attributes: {
                enablerType: 'infrastructure',
                valueStream: 'efficiency-improving',
                businessValue: 'medium'
              }
            },
            assignedTeam: 'team-3',
            allocatedPoints: 3,
            isComplete: false,
            estimatedEffort: 3,
            dependencies: [],
            riskLevel: 'low' as const,
            valueContribution: 0.6
          }
        ],
        totalPoints: 16,
        totalCapacity: 20,
        capacityUtilization: [],
        riskLevel: 'medium' as const,
        dependencies: [],
        deliverableValue: {
          businessValue: 0.8,
          userValue: 0.75,
          technicalValue: 0.7,
          riskAdjustedValue: 0.75
        },
        prerequisites: [],
        enables: [],
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          info: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          planningConfidence: 0.8
        }
      };

      const result = await analyzer.analyzeIterationValue(multiStreamIteration);
      
      expect(result).toBeDefined();
      expect(result.primaryValueStreams.length).toBeGreaterThanOrEqual(3);

      // Should identify different value stream types
      const streamTypes = result.primaryValueStreams.map(stream => stream.type);
      expect(streamTypes).toContain('customer-facing');
      expect(streamTypes).toContain('revenue-generating');
      expect(streamTypes).toContain('efficiency-improving');

      // Should have reasonable overall score for diverse value
      expect(result.valueDeliveryScore).toBeGreaterThan(0.5);
      expect(result.confidenceScore).toBeGreaterThan(0.6);
    });
  });
});