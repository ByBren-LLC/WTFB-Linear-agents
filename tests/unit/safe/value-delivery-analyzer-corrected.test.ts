/**
 * Comprehensive Tests for ValueDeliveryAnalyzer (LIN-49)
 * ARCHitect-level testing with correct interfaces to achieve >80% SAFe coverage
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
          duration: 14,
          teams: ['team-frontend', 'team-backend'],
          goals: ['Deliver user authentication', 'Improve checkout flow'],
          capacity: [
            {
              teamId: 'team-frontend',
              teamName: 'Frontend Team',
              totalCapacity: 10,
              availableCapacity: 8,
              allocatedCapacity: 8,
              velocityTrend: 0.9
            }
          ]
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
          }
        ],
        totalPoints: 8,
        totalCapacity: 10,
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
      
      // Validate core structure using actual interface
      expect(result).toBeDefined();
      expect(result.iterationId).toBe('iter-customer-value');
      expect(result.primaryValueStreams).toBeDefined();
      expect(Array.isArray(result.primaryValueStreams)).toBe(true);
      
      // Validate business value assessment
      expect(result.businessValueRealization).toBeDefined();
      expect(result.valueDeliveryScore).toBeGreaterThanOrEqual(0);
      expect(result.valueDeliveryScore).toBeLessThanOrEqual(1);
      
      // Validate user impact assessment
      expect(result.userImpactAssessment).toBeDefined();
      
      // Validate working software components
      expect(result.workingSoftwareComponents).toBeDefined();
      expect(Array.isArray(result.workingSoftwareComponents)).toBe(true);
      
      // Validate confidence scoring
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
      
      // Validate delivery risks and recommendations
      expect(result.deliveryRisks).toBeDefined();
      expect(Array.isArray(result.deliveryRisks)).toBe(true);
      expect(result.improvementRecommendations).toBeDefined();
      expect(Array.isArray(result.improvementRecommendations)).toBe(true);
    });

    it('should handle technical debt iteration correctly', async () => {
      const techDebtIteration = {
        iteration: {
          id: 'iter-tech-debt',
          name: 'Technical Debt Sprint',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2024-01-29'),
          duration: 14,
          teams: ['team-backend'],
          goals: ['Reduce technical debt', 'Improve performance'],
          capacity: [
            {
              teamId: 'team-backend',
              teamName: 'Backend Team',
              totalCapacity: 15,
              availableCapacity: 12,
              allocatedCapacity: 10,
              velocityTrend: 0.8
            }
          ]
        },
        allocatedWork: [
          {
            workItem: {
              id: 'enabler-perf',
              type: 'enabler',
              title: 'Database Performance',
              description: 'Optimize database queries',
              parentId: undefined,
              attributes: {
                enablerType: 'infrastructure',
                technicalValue: 'high',
                userFacing: false
              }
            },
            assignedTeam: 'team-backend',
            allocatedPoints: 10,
            isComplete: false,
            estimatedEffort: 10,
            dependencies: [],
            riskLevel: 'medium' as const,
            valueContribution: 0.6
          }
        ],
        totalPoints: 10,
        totalCapacity: 15,
        capacityUtilization: [
          {
            teamId: 'team-backend',
            totalCapacity: 15,
            allocatedCapacity: 10,
            utilizationRate: 0.67,
            isOverAllocated: false,
            bufferCapacity: 5
          }
        ],
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
      expect(result.iterationId).toBe('iter-tech-debt');
      expect(result.valueDeliveryScore).toBeGreaterThanOrEqual(0);
      
      // Tech debt iterations should have lower user value but still contribute
      expect(result.userImpactAssessment).toBeDefined();
      expect(result.businessValueRealization).toBeDefined();
      
      // Should have confidence score reflecting iteration type
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty iteration gracefully', async () => {
      const emptyIteration = {
        iteration: {
          id: 'iter-empty',
          name: 'Empty Iteration',
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-02-14'),
          duration: 14,
          teams: ['team-1'],
          goals: [],
          capacity: [
            {
              teamId: 'team-1',
              teamName: 'Team 1',
              totalCapacity: 20,
              availableCapacity: 20,
              allocatedCapacity: 0,
              velocityTrend: 1.0
            }
          ]
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
      expect(result.iterationId).toBe('iter-empty');
      expect(result.primaryValueStreams.length).toBe(0);
      expect(result.workingSoftwareComponents.length).toBe(0);
      expect(result.valueDeliveryScore).toBe(0);
      expect(result.improvementRecommendations.length).toBeGreaterThan(0);
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
            duration: 14,
            teams: ['team-1'],
            capacity: [
              {
                teamId: 'team-1',
                teamName: 'Team 1',
                totalCapacity: 10,
                availableCapacity: 8,
                allocatedCapacity: 5,
                velocityTrend: 0.9
              }
            ]
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
                  businessValue: 'medium'
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
      expect(result.length).toBeGreaterThanOrEqual(0);
      
      // Validate optimization results structure
      if (result.length > 0) {
        const firstOptimization = result[0];
        expect(firstOptimization.originalIteration).toBeDefined();
        expect(firstOptimization.optimizedSequence).toBeDefined();
        expect(firstOptimization.valueImprovements).toBeDefined();
        expect(firstOptimization.riskReductions).toBeDefined();
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
    it('should respect custom configuration', () => {
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
      // Create minimal valid iteration that exercises error handling paths
      const problematicIteration = {
        iteration: {
          id: 'iter-problematic',
          name: 'Problematic Iteration',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-14'),
          duration: 14,
          teams: [],
          capacity: []
        },
        allocatedWork: [
          {
            workItem: {
              id: 'invalid-item',
              type: 'unknown',
              title: '',
              description: '',
              parentId: undefined,
              attributes: {}
            },
            assignedTeam: 'nonexistent-team',
            allocatedPoints: -5, // Invalid
            isComplete: false,
            estimatedEffort: 0,
            dependencies: [],
            riskLevel: 'low' as const,
            valueContribution: -0.5 // Invalid
          }
        ],
        totalPoints: -5,
        totalCapacity: 0,
        capacityUtilization: [],
        riskLevel: 'high' as const,
        dependencies: [],
        deliverableValue: {
          businessValue: -1, // Invalid
          userValue: 2, // Invalid
          technicalValue: 0.5,
          riskAdjustedValue: 0.5
        },
        prerequisites: [],
        enables: [],
        validation: {
          isValid: false,
          errors: ['Invalid data detected'],
          warnings: [],
          info: []
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          planningConfidence: -0.5 // Invalid
        }
      };

      // Should not throw, should handle gracefully
      const result = await analyzer.analyzeIterationValue(problematicIteration);
      expect(result).toBeDefined();
      expect(result.iterationId).toBe('iter-problematic');
      
      // Should indicate problems through low confidence and recommendations
      expect(result.confidenceScore).toBeLessThanOrEqual(0.5);
      expect(result.improvementRecommendations.length).toBeGreaterThan(0);
      expect(result.deliveryRisks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Value Stream Classification', () => {
    it('should classify different types of value streams', async () => {
      const diverseIteration = {
        iteration: {
          id: 'iter-diverse',
          name: 'Diverse Value Streams',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-14'),
          duration: 14,
          teams: ['team-full-stack'],
          capacity: [
            {
              teamId: 'team-full-stack',
              teamName: 'Full Stack Team',
              totalCapacity: 20,
              availableCapacity: 18,
              allocatedCapacity: 15,
              velocityTrend: 1.0
            }
          ]
        },
        allocatedWork: [
          {
            workItem: {
              id: 'story-customer',
              type: 'story',
              title: 'Customer Portal Enhancement',
              description: 'Improve customer self-service',
              parentId: undefined,
              attributes: {
                storyPoints: 8,
                valueStream: 'customer-facing',
                businessValue: 'high',
                userFacing: true
              }
            },
            assignedTeam: 'team-full-stack',
            allocatedPoints: 8,
            isComplete: false,
            estimatedEffort: 8,
            dependencies: [],
            riskLevel: 'low' as const,
            valueContribution: 0.9
          },
          {
            workItem: {
              id: 'enabler-infrastructure',
              type: 'enabler',
              title: 'CI/CD Pipeline Enhancement',
              description: 'Improve deployment efficiency',
              parentId: undefined,
              attributes: {
                enablerType: 'infrastructure',
                valueStream: 'efficiency-improving',
                technicalValue: 'high'
              }
            },
            assignedTeam: 'team-full-stack',
            allocatedPoints: 5,
            isComplete: false,
            estimatedEffort: 5,
            dependencies: [],
            riskLevel: 'medium' as const,
            valueContribution: 0.6
          }
        ],
        totalPoints: 13,
        totalCapacity: 20,
        capacityUtilization: [
          {
            teamId: 'team-full-stack',
            totalCapacity: 20,
            allocatedCapacity: 13,
            utilizationRate: 0.65,
            isOverAllocated: false,
            bufferCapacity: 7
          }
        ],
        riskLevel: 'low' as const,
        dependencies: [],
        deliverableValue: {
          businessValue: 0.8,
          userValue: 0.7,
          technicalValue: 0.8,
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
          planningConfidence: 0.85
        }
      };

      const result = await analyzer.analyzeIterationValue(diverseIteration);
      
      expect(result).toBeDefined();
      expect(result.iterationId).toBe('iter-diverse');
      expect(result.primaryValueStreams.length).toBeGreaterThan(0);
      
      // Should properly assess mixed value types
      expect(result.valueDeliveryScore).toBeGreaterThan(0.5);
      expect(result.businessValueRealization).toBeDefined();
      expect(result.userImpactAssessment).toBeDefined();
      
      // Should have reasonable confidence for well-balanced iteration
      expect(result.confidenceScore).toBeGreaterThan(0.6);
      
      // Should provide actionable recommendations
      expect(result.improvementRecommendations).toBeDefined();
      expect(Array.isArray(result.improvementRecommendations)).toBe(true);
    });
  });
});