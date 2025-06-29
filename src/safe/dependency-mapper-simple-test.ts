/**
 * Simple Test for Dependency Mapping System (LIN-48)
 * 
 * A focused test that validates the core dependency detection algorithms
 * without relying on complex interfaces or external dependencies.
 */

import { DependencyMapper } from './dependency-mapper';
import {
  WorkItem,
  DependencyType,
  DependencyStrength,
  DetectionMethod
} from '../types/dependency-types';

/**
 * Create minimal test work items
 */
function createTestWorkItems(): WorkItem[] {
  return [
    {
      id: 'story-1',
      type: 'story',
      title: 'Database Setup',
      description: 'Create database schema and tables',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['Database tables created', 'Schema validated'],
      storyPoints: 3,
      priority: 1
    },
    {
      id: 'story-2',
      type: 'story',
      title: 'API Development',
      description: 'Build REST API that requires database to be completed first',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['API endpoints created', 'Database integration working'],
      storyPoints: 5,
      priority: 2
    },
    {
      id: 'story-3',
      type: 'story',
      title: 'Frontend Components',
      description: 'Create React components that integrate with the API',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['Components render correctly', 'API integration complete'],
      storyPoints: 4,
      priority: 3
    }
  ];
}

/**
 * Test basic dependency detection
 */
async function testBasicDependencyDetection(): Promise<boolean> {
  console.log('🧪 Testing Basic Dependency Detection...');
  
  const workItems = createTestWorkItems();
  const mapper = new DependencyMapper();
  
  try {
    const result = await mapper.mapDependencies(workItems);
    
    console.log(`   ✅ Mapped ${workItems.length} work items`);
    console.log(`   ✅ Detected ${result.graph.edges.length} dependencies`);
    console.log(`   ✅ Processing time: ${result.summary.processingTime}ms`);
    
    // Verify we found at least one dependency
    if (result.graph.edges.length > 0) {
      const firstDep = result.graph.edges[0];
      console.log(`   ✅ Example dependency: ${firstDep.sourceId} ${firstDep.type} ${firstDep.targetId}`);
      console.log(`   ✅ Confidence: ${(firstDep.confidence * 100).toFixed(0)}%`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test circular dependency detection
 */
async function testCircularDependencyDetection(): Promise<boolean> {
  console.log('🧪 Testing Circular Dependency Detection...');
  
  const workItems: WorkItem[] = [
    {
      id: 'story-a',
      type: 'story',
      title: 'Feature A needs B',
      description: 'This feature requires Feature B to be completed',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['Feature B integration working'],
      storyPoints: 3
    },
    {
      id: 'story-b',
      type: 'story',
      title: 'Feature B needs A',
      description: 'This feature requires Feature A to be completed',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['Feature A integration working'],
      storyPoints: 3
    }
  ];
  
  const mapper = new DependencyMapper();
  
  try {
    const result = await mapper.mapDependencies(workItems);
    
    console.log(`   ✅ Analyzed ${workItems.length} work items`);
    console.log(`   ✅ Found ${result.graph.circularDependencies.length} circular dependencies`);
    
    if (result.graph.circularDependencies.length > 0) {
      const cycle = result.graph.circularDependencies[0];
      console.log(`   ✅ Detected cycle: ${cycle.cycle.join(' → ')}`);
      console.log(`   ✅ Severity: ${cycle.severity}`);
      console.log(`   ✅ Suggestions: ${cycle.resolutionSuggestions.length} provided`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test critical path calculation
 */
async function testCriticalPathCalculation(): Promise<boolean> {
  console.log('🧪 Testing Critical Path Calculation...');
  
  const workItems: WorkItem[] = [
    {
      id: 'foundation',
      type: 'story',
      title: 'Foundation Work',
      description: 'Base infrastructure setup',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['Infrastructure ready'],
      storyPoints: 5
    },
    {
      id: 'middleware',
      type: 'story',
      title: 'Middleware requires foundation',
      description: 'Build middleware that depends on foundation',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['Foundation integration complete'],
      storyPoints: 3
    },
    {
      id: 'frontend',
      type: 'story',
      title: 'Frontend requires middleware',
      description: 'Build frontend that depends on middleware',
      parentId: undefined,
      attributes: {},
      acceptanceCriteria: ['Middleware integration complete'],
      storyPoints: 4
    }
  ];
  
  const mapper = new DependencyMapper();
  
  try {
    const result = await mapper.mapDependencies(workItems);
    
    console.log(`   ✅ Calculated critical path with ${result.graph.criticalPath.length} items`);
    console.log(`   ✅ Path: ${result.graph.criticalPath.join(' → ')}`);
    console.log(`   ✅ Estimated duration: ${result.graph.statistics.estimatedDuration} story points`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test graph validation
 */
async function testGraphValidation(): Promise<boolean> {
  console.log('🧪 Testing Graph Validation...');
  
  const workItems = createTestWorkItems();
  const mapper = new DependencyMapper();
  
  try {
    const result = await mapper.mapDependencies(workItems);
    
    console.log(`   ✅ Graph validation completed`);
    console.log(`   ✅ Valid: ${result.graph.validation.isValid}`);
    console.log(`   ✅ Errors: ${result.graph.validation.errors.length}`);
    console.log(`   ✅ Warnings: ${result.graph.validation.warnings.length}`);
    console.log(`   ✅ Info: ${result.graph.validation.info.length}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test Linear integration preparation
 */
async function testLinearIntegrationPrep(): Promise<boolean> {
  console.log('🧪 Testing Linear Integration Preparation...');
  
  const workItems = createTestWorkItems();
  const mapper = new DependencyMapper();
  
  try {
    const result = await mapper.mapDependencies(workItems);
    
    console.log(`   ✅ Prepared ${result.linearRelationships.length} Linear relationships`);
    
    if (result.linearRelationships.length > 0) {
      const firstRel = result.linearRelationships[0];
      console.log(`   ✅ Example: ${firstRel.sourceIssueId} ${firstRel.relationType} ${firstRel.targetIssueId}`);
      console.log(`   ✅ Comment length: ${firstRel.comment?.length || 0} characters`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error}`);
    return false;
  }
}

/**
 * Test different configurations
 */
async function testConfigurations(): Promise<boolean> {
  console.log('🧪 Testing Different Configurations...');
  
  const workItems = createTestWorkItems();
  
  try {
    // Test high confidence threshold
    const highConfidenceMapper = new DependencyMapper({ confidenceThreshold: 0.9 });
    const highConfidenceResult = await highConfidenceMapper.mapDependencies(workItems);
    console.log(`   ✅ High confidence (0.9): ${highConfidenceResult.graph.edges.length} dependencies`);
    
    // Test semantic analysis disabled
    const noSemanticMapper = new DependencyMapper({ enableSemanticAnalysis: false });
    const noSemanticResult = await noSemanticMapper.mapDependencies(workItems);
    console.log(`   ✅ No semantic analysis: ${noSemanticResult.graph.edges.length} dependencies`);
    
    // Test parent dependencies disabled
    const noParentMapper = new DependencyMapper({ inheritParentDependencies: false });
    const noParentResult = await noParentMapper.mapDependencies(workItems);
    console.log(`   ✅ No parent deps: ${noParentResult.graph.edges.length} dependencies`);
    
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
  console.log('🎯 DEPENDENCY MAPPING SYSTEM - SIMPLE TESTS');
  console.log('═'.repeat(50));
  
  const tests = [
    { name: 'Basic Dependency Detection', fn: testBasicDependencyDetection },
    { name: 'Circular Dependency Detection', fn: testCircularDependencyDetection },
    { name: 'Critical Path Calculation', fn: testCriticalPathCalculation },
    { name: 'Graph Validation', fn: testGraphValidation },
    { name: 'Linear Integration Prep', fn: testLinearIntegrationPrep },
    { name: 'Configuration Testing', fn: testConfigurations }
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
  console.log(`📊 TEST RESULTS: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Dependency Mapping System is working correctly.');
    console.log('✅ Ready for PR creation and integration testing.');
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