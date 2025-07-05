/**
 * Simple Test for ART Planner (LIN-49) - Phase 1
 * 
 * Basic validation test for the core ART iteration planning functionality
 * without relying on complex test frameworks.
 */

import { ARTPlanner } from './art-planner';
import {
  PlanningWorkItem,
  ARTTeam,
  ARTPlanningConfig
} from '../types/art-planning-types';
import { DependencyGraph, DependencyType, DependencyStrength, DetectionMethod } from '../types/dependency-types';
import { ProgramIncrement } from './pi-model';

/**
 * Create test data for ART planning validation
 */
function createTestData() {
  // Create test Program Increment
  const programIncrement: ProgramIncrement = {
    id: 'pi-test-1',
    name: 'Test PI 2024-Q1',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    description: 'Test Program Increment for ART planning validation',
    features: [],
    status: 'planning'
  };

  // Create test work items
  const workItems: PlanningWorkItem[] = [
    {
      id: 'story-1',
      type: 'story',
      title: 'User Authentication API',
      description: 'Implement REST API for user authentication',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: [
        'User can register with email and password',
        'User can login with valid credentials',
        'API returns JWT token on successful login'
      ],
      storyPoints: 5,
      priority: 1
    },
    {
      id: 'story-2',
      type: 'story',
      title: 'User Profile Management',
      description: 'Create user profile management interface that depends on authentication',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: [
        'User can view their profile',
        'User can update profile information',
        'Changes are saved to database'
      ],
      storyPoints: 3,
      priority: 2
    },
    {
      id: 'story-3',
      type: 'story',
      title: 'Dashboard UI',
      description: 'Build main dashboard interface for authenticated users',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: [
        'Dashboard shows user summary',
        'Navigation menu is accessible',
        'Responsive design works on mobile'
      ],
      storyPoints: 4,
      priority: 3
    },
    {
      id: 'enabler-1',
      type: 'enabler',
      title: 'Database Schema Setup',
      description: 'Set up database schema for user management',
      parentId: undefined,
      attributes: {},
      enablerType: 'infrastructure',
      acceptanceCriteria: [
        'User tables created',
        'Indexes optimized',
        'Migration scripts ready'
      ]
    }
  ];

  // Create test dependencies
  const dependencies: DependencyGraph = {
    nodes: workItems,
    edges: [
      {
        id: 'dep-1',
        sourceId: 'story-2',
        targetId: 'story-1',
        type: DependencyType.REQUIRES,
        strength: DependencyStrength.HARD,
        rationale: 'Profile management requires authentication API',
        detectionMethod: DetectionMethod.SEMANTIC,
        confidence: 0.9,
        triggers: ['authentication', 'api'],
        detectedAt: new Date()
      },
      {
        id: 'dep-2',
        sourceId: 'story-3',
        targetId: 'story-1',
        type: DependencyType.REQUIRES,
        strength: DependencyStrength.HARD,
        rationale: 'Dashboard requires user authentication',
        detectionMethod: DetectionMethod.SEMANTIC,
        confidence: 0.85,
        triggers: ['authentication', 'user'],
        detectedAt: new Date()
      },
      {
        id: 'dep-3',
        sourceId: 'story-1',
        targetId: 'enabler-1',
        type: DependencyType.REQUIRES,
        strength: DependencyStrength.HARD,
        rationale: 'Authentication API requires database schema',
        detectionMethod: DetectionMethod.SEMANTIC,
        confidence: 0.95,
        triggers: ['database', 'schema'],
        detectedAt: new Date()
      }
    ],
    criticalPath: ['enabler-1', 'story-1', 'story-2', 'story-3'],
    circularDependencies: [],
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    },
    statistics: {
      nodeCount: 4,
      edgeCount: 3,
      hardDependencies: 3,
      softDependencies: 0,
      averageDependencies: 0.75,
      independentItems: 1,
      highDependencyItems: [],
      longestPath: 4,
      estimatedDuration: 12
    },
    generatedAt: new Date()
  };

  // Create test teams
  const teams: ARTTeam[] = [
    {
      id: 'team-backend',
      name: 'Backend Team',
      memberCount: 5,
      averageVelocity: 25,
      specializations: ['api', 'database', 'authentication'],
      capacityFactor: 0.85,
      timezone: 'UTC'
    },
    {
      id: 'team-frontend',
      name: 'Frontend Team',
      memberCount: 4,
      averageVelocity: 20,
      specializations: ['ui', 'react', 'javascript'],
      capacityFactor: 0.8,
      timezone: 'UTC'
    }
  ];

  return { programIncrement, workItems, dependencies, teams };
}

/**
 * Test basic ART planning functionality
 */
async function testBasicARTPlanning(): Promise<boolean> {
  console.log('🧪 Testing Basic ART Planning...');
  
  try {
    const { programIncrement, workItems, dependencies, teams } = createTestData();
    
    const config: Partial<ARTPlanningConfig> = {
      defaultIterationLength: 14,
      bufferCapacity: 0.2,
      maxCapacityUtilization: 0.8
    };
    
    const artPlanner = new ARTPlanner(config);
    
    const artPlan = await artPlanner.planART(
      programIncrement,
      workItems,
      dependencies,
      teams
    );
    
    console.log(`   ✅ Created ART plan with ${artPlan.iterations.length} iterations`);
    console.log(`   ✅ Planned ${artPlan.workItems.length} work items`);
    console.log(`   ✅ ART readiness score: ${(artPlan.artReadiness.readinessScore * 100).toFixed(0)}%`);
    console.log(`   ✅ Total story points: ${artPlan.summary.totalStoryPoints}`);
    console.log(`   ✅ Planning confidence: ${(artPlan.summary.metrics.planningConfidence * 100).toFixed(0)}%`);
    
    // Basic validations
    if (artPlan.iterations.length === 0) {
      console.log('   ❌ No iterations created');
      return false;
    }
    
    if (artPlan.summary.totalStoryPoints === 0) {
      console.log('   ❌ No story points allocated');
      return false;
    }
    
    if (artPlan.artReadiness.readinessScore < 0.5) {
      console.log(`   ⚠️  Low readiness score: ${(artPlan.artReadiness.readinessScore * 100).toFixed(0)}%`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test iteration structure creation
 */
async function testIterationStructure(): Promise<boolean> {
  console.log('🧪 Testing Iteration Structure Creation...');
  
  try {
    const { programIncrement, teams } = createTestData();
    
    const artPlanner = new ARTPlanner();
    
    // Use private method via casting (for testing purposes)
    const iterations = (artPlanner as any).createIterationStructure(programIncrement, teams);
    
    console.log(`   ✅ Created ${iterations.length} iterations`);
    
    if (iterations.length === 0) {
      console.log('   ❌ No iterations created');
      return false;
    }
    
    // Check iteration dates
    for (let i = 0; i < iterations.length; i++) {
      const iteration = iterations[i];
      
      if (iteration.startDate >= iteration.endDate) {
        console.log(`   ❌ Invalid dates for iteration ${i + 1}`);
        return false;
      }
      
      if (iteration.endDate > programIncrement.endDate) {
        console.log(`   ❌ Iteration ${i + 1} extends beyond PI end date`);
        return false;
      }
    }
    
    console.log(`   ✅ All iterations have valid date ranges`);
    console.log(`   ✅ Iterations respect PI boundaries`);
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test dependency sorting
 */
async function testDependencySorting(): Promise<boolean> {
  console.log('🧪 Testing Dependency Sorting...');
  
  try {
    const { workItems, dependencies } = createTestData();
    
    const artPlanner = new ARTPlanner();
    
    // Use private method via casting (for testing purposes)
    const sortedItems = (artPlanner as any).sortWorkItemsByDependencies(workItems, dependencies);
    
    console.log(`   ✅ Sorted ${sortedItems.length} work items`);
    
    if (sortedItems.length !== workItems.length) {
      console.log(`   ❌ Item count mismatch: expected ${workItems.length}, got ${sortedItems.length}`);
      return false;
    }
    
    // Check that enabler-1 comes before story-1 (dependency ordering)
    const enablerIndex = sortedItems.findIndex((item: any) => item.id === 'enabler-1');
    const story1Index = sortedItems.findIndex((item: any) => item.id === 'story-1');
    
    if (enablerIndex === -1 || story1Index === -1) {
      console.log('   ❌ Required items not found in sorted list');
      return false;
    }
    
    if (enablerIndex > story1Index) {
      console.log('   ❌ Dependency ordering violated: enabler-1 should come before story-1');
      return false;
    }
    
    console.log(`   ✅ Dependency ordering respected`);
    console.log(`   ✅ enabler-1 (position ${enablerIndex + 1}) → story-1 (position ${story1Index + 1})`);
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test configuration handling
 */
async function testConfiguration(): Promise<boolean> {
  console.log('🧪 Testing Configuration Handling...');
  
  try {
    // Test with custom configuration
    const customConfig: Partial<ARTPlanningConfig> = {
      defaultIterationLength: 10, // 10 days instead of default 14
      bufferCapacity: 0.3,        // 30% buffer instead of default 20%
      maxCapacityUtilization: 0.7  // 70% max instead of default 85%
    };
    
    const artPlanner = new ARTPlanner(customConfig);
    
    const { programIncrement, workItems, dependencies, teams } = createTestData();
    
    const artPlan = await artPlanner.planART(
      programIncrement,
      workItems,
      dependencies,
      teams
    );
    
    console.log(`   ✅ Custom configuration applied successfully`);
    console.log(`   ✅ Plan created with custom settings`);
    console.log(`   ✅ Buffer capacity: ${(customConfig.bufferCapacity! * 100).toFixed(0)}%`);
    console.log(`   ✅ Max utilization: ${(customConfig.maxCapacityUtilization! * 100).toFixed(0)}%`);
    
    // Verify configuration is actually used
    if (artPlan.metadata.configuration.bufferCapacity !== customConfig.bufferCapacity) {
      console.log('   ❌ Buffer capacity configuration not applied');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('🎯 ART PLANNER (LIN-49) - PHASE 1 TESTS');
  console.log('═'.repeat(50));
  
  const tests = [
    { name: 'Basic ART Planning', fn: testBasicARTPlanning },
    { name: 'Iteration Structure Creation', fn: testIterationStructure },
    { name: 'Dependency Sorting', fn: testDependencySorting },
    { name: 'Configuration Handling', fn: testConfiguration }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} PASSED\n`);
      } else {
        failed++;
        console.log(`❌ ${test.name} FAILED\n`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} FAILED with error: ${error}\n`);
    }
  }
  
  console.log('═'.repeat(50));
  console.log(`📊 PHASE 1 TEST RESULTS: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 ALL PHASE 1 TESTS PASSED! Core ART planning is working correctly.');
    console.log('✅ Ready to proceed to Phase 2: Value Delivery Validation');
  } else {
    console.log('❌ Some tests failed. Please review the issues above.');
  }
  
  console.log('═'.repeat(50));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests };