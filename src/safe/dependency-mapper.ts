/**
 * Dependency Mapping System for SAFe ART Planning (LIN-48)
 * 
 * Automatically identifies and maps dependencies between work items using
 * sophisticated analysis algorithms. Provides critical path calculation,
 * circular dependency detection, and Linear integration.
 */

import {
  WorkItem,
  DependencyRelationship,
  DependencyGraph,
  DependencyType,
  DependencyStrength,
  DetectionMethod,
  CircularDependency,
  GraphValidation,
  GraphStatistics,
  CriticalPathAnalysis,
  DependencyDetectionConfig,
  DependencyMappingResult,
  DependencyError,
  CircularDependencyError
} from '../types/dependency-types';
import { Story, Feature, Epic } from '../planning/models';
import * as logger from '../utils/logger';

/**
 * Default configuration for dependency detection
 */
const DEFAULT_DETECTION_CONFIG: DependencyDetectionConfig = {
  technicalKeywords: [
    'api', 'service', 'component', 'library', 'framework', 'database', 'schema',
    'infrastructure', 'deployment', 'integration', 'authentication', 'authorization',
    'microservice', 'endpoint', 'data', 'model', 'migration', 'configuration'
  ],
  businessKeywords: [
    'user', 'customer', 'workflow', 'process', 'feature', 'functionality',
    'prerequisite', 'requirement', 'depends', 'requires', 'needs', 'after',
    'before', 'enables', 'blocks', 'prevents', 'allows'
  ],
  confidenceThreshold: 0.6,
  enableSemanticAnalysis: true,
  maxDependencyDistance: 3,
  inheritParentDependencies: true
};

/**
 * Core dependency mapping engine
 */
export class DependencyMapper {
  private config: DependencyDetectionConfig;

  constructor(config: Partial<DependencyDetectionConfig> = {}) {
    this.config = { ...DEFAULT_DETECTION_CONFIG, ...config };
    logger.info('DependencyMapper initialized', {
      confidenceThreshold: this.config.confidenceThreshold,
      semanticAnalysis: this.config.enableSemanticAnalysis
    });
  }

  /**
   * Main entry point: analyze work items and create dependency graph
   */
  async mapDependencies(workItems: WorkItem[]): Promise<DependencyMappingResult> {
    const startTime = Date.now();
    logger.info('Starting dependency mapping', { workItemCount: workItems.length });

    try {
      // Phase 1: Detect all dependencies
      const dependencies = await this.detectAllDependencies(workItems);
      
      // Phase 2: Build and validate dependency graph
      const graph = await this.buildDependencyGraph(workItems, dependencies);
      
      // Phase 3: Prepare Linear integration
      const linearRelationships = this.prepareLinearRelationships(dependencies);
      
      const processingTime = Date.now() - startTime;
      const result: DependencyMappingResult = {
        graph,
        linearRelationships,
        summary: {
          totalDependencies: dependencies.length,
          technicalDependencies: dependencies.filter(d => this.isTechnicalDependency(d)).length,
          businessDependencies: dependencies.filter(d => this.isBusinessDependency(d)).length,
          circularDependencies: graph.circularDependencies.length,
          validationErrors: graph.validation.errors.length,
          processingTime
        },
        timestamp: new Date()
      };

      logger.info('Dependency mapping completed', {
        totalDependencies: result.summary.totalDependencies,
        circularDependencies: result.summary.circularDependencies,
        processingTime: `${processingTime}ms`
      });

      return result;

    } catch (error) {
      logger.error('Dependency mapping failed', { error });
      throw new DependencyError(
        `Failed to map dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MAPPING_FAILED'
      );
    }
  }

  /**
   * Detect all types of dependencies between work items
   */
  private async detectAllDependencies(workItems: WorkItem[]): Promise<DependencyRelationship[]> {
    logger.debug('Detecting dependencies', { workItemCount: workItems.length });

    const dependencies: DependencyRelationship[] = [];

    // Detect technical dependencies
    const technicalDeps = await this.detectTechnicalDependencies(workItems);
    dependencies.push(...technicalDeps);

    // Detect business dependencies
    const businessDeps = await this.detectBusinessDependencies(workItems);
    dependencies.push(...businessDeps);

    // Detect explicit dependencies from content
    const explicitDeps = await this.detectExplicitDependencies(workItems);
    dependencies.push(...explicitDeps);

    // Inherit parent-child dependencies if enabled
    if (this.config.inheritParentDependencies) {
      const inheritedDeps = await this.detectInheritedDependencies(workItems);
      dependencies.push(...inheritedDeps);
    }

    // Remove duplicates and filter by confidence
    const filteredDeps = this.deduplicateAndFilter(dependencies);

    logger.info('Dependency detection completed', {
      technical: technicalDeps.length,
      business: businessDeps.length,
      explicit: explicitDeps.length,
      totalBeforeFilter: dependencies.length,
      totalAfterFilter: filteredDeps.length
    });

    return filteredDeps;
  }

  /**
   * Detect technical dependencies (shared components, APIs, data)
   */
  private async detectTechnicalDependencies(workItems: WorkItem[]): Promise<DependencyRelationship[]> {
    const dependencies: DependencyRelationship[] = [];

    for (let i = 0; i < workItems.length; i++) {
      for (let j = i + 1; j < workItems.length; j++) {
        const item1 = workItems[i];
        const item2 = workItems[j];

        // Analyze shared technical components
        const sharedComponents = this.findSharedTechnicalComponents(item1, item2);
        
        if (sharedComponents.length > 0) {
          const confidence = this.calculateTechnicalConfidence(sharedComponents);
          
          if (confidence >= this.config.confidenceThreshold) {
            // Determine dependency direction based on complexity/hierarchy
            const dependency = this.determineTechnicalDependencyDirection(item1, item2, sharedComponents, confidence);
            if (dependency) {
              dependencies.push(dependency);
            }
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Detect business dependencies (user flows, prerequisites)
   */
  private async detectBusinessDependencies(workItems: WorkItem[]): Promise<DependencyRelationship[]> {
    const dependencies: DependencyRelationship[] = [];

    for (let i = 0; i < workItems.length; i++) {
      for (let j = i + 1; j < workItems.length; j++) {
        const item1 = workItems[i];
        const item2 = workItems[j];

        // Analyze business process flow
        const businessFlow = this.analyzeBusinessFlow(item1, item2);
        
        if (businessFlow.confidence >= this.config.confidenceThreshold) {
          const dependency: DependencyRelationship = {
            id: `bus_${item1.id}_${item2.id}`,
            sourceId: businessFlow.dependentId,
            targetId: businessFlow.prerequisiteId,
            type: DependencyType.REQUIRES,
            strength: businessFlow.strength,
            rationale: businessFlow.rationale,
            detectionMethod: DetectionMethod.SEMANTIC,
            confidence: businessFlow.confidence,
            triggers: businessFlow.triggers,
            detectedAt: new Date()
          };
          dependencies.push(dependency);
        }
      }
    }

    return dependencies;
  }

  /**
   * Detect explicit dependencies mentioned in content
   */
  private async detectExplicitDependencies(workItems: WorkItem[]): Promise<DependencyRelationship[]> {
    const dependencies: DependencyRelationship[] = [];

    for (const item of workItems) {
      const content = this.extractContent(item);
      const explicitRefs = this.findExplicitDependencyReferences(content, workItems);

      for (const ref of explicitRefs) {
        const dependency: DependencyRelationship = {
          id: `exp_${item.id}_${ref.targetId}`,
          sourceId: item.id,
          targetId: ref.targetId,
          type: ref.type,
          strength: ref.strength,
          rationale: ref.rationale,
          detectionMethod: DetectionMethod.KEYWORD,
          confidence: ref.confidence,
          triggers: ref.triggers,
          detectedAt: new Date()
        };
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  /**
   * Detect inherited dependencies from parent-child relationships
   */
  private async detectInheritedDependencies(workItems: WorkItem[]): Promise<DependencyRelationship[]> {
    const dependencies: DependencyRelationship[] = [];

    // Find parent-child relationships
    const parentChildMap = this.buildParentChildMap(workItems);

    for (const [parentId, children] of parentChildMap.entries()) {
      // Children inherit dependencies from parents
      const parent = workItems.find(item => item.id === parentId);
      if (!parent) continue;

      for (const childId of children) {
        const dependency: DependencyRelationship = {
          id: `inh_${childId}_${parentId}`,
          sourceId: childId,
          targetId: parentId,
          type: DependencyType.REQUIRES,
          strength: DependencyStrength.HARD,
          rationale: 'Child work item depends on parent completion',
          detectionMethod: DetectionMethod.INHERITED,
          confidence: 1.0,
          triggers: ['parent-child relationship'],
          detectedAt: new Date()
        };
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  /**
   * Find shared technical components between two work items
   */
  private findSharedTechnicalComponents(item1: WorkItem, item2: WorkItem): string[] {
    const content1 = this.extractContent(item1).toLowerCase();
    const content2 = this.extractContent(item2).toLowerCase();
    
    const sharedComponents: string[] = [];
    
    for (const keyword of this.config.technicalKeywords) {
      if (content1.includes(keyword) && content2.includes(keyword)) {
        sharedComponents.push(keyword);
      }
    }

    // Also look for exact matches of technical terms
    const techTerms1 = this.extractTechnicalTerms(content1);
    const techTerms2 = this.extractTechnicalTerms(content2);
    
    for (const term of techTerms1) {
      if (techTerms2.includes(term)) {
        sharedComponents.push(term);
      }
    }

    return [...new Set(sharedComponents)]; // Remove duplicates
  }

  /**
   * Calculate confidence score for technical dependency
   */
  private calculateTechnicalConfidence(sharedComponents: string[]): number {
    const baseConfidence = Math.min(sharedComponents.length * 0.2, 0.8);
    
    // Boost confidence for critical technical terms
    const criticalTerms = ['api', 'database', 'service', 'authentication'];
    const hasCriticalTerms = sharedComponents.some(comp => criticalTerms.includes(comp));
    
    return hasCriticalTerms ? Math.min(baseConfidence + 0.2, 1.0) : baseConfidence;
  }

  /**
   * Determine direction of technical dependency
   */
  private determineTechnicalDependencyDirection(
    item1: WorkItem, 
    item2: WorkItem, 
    sharedComponents: string[], 
    confidence: number
  ): DependencyRelationship | null {
    // Determine which item is more foundational (likely to be depended upon)
    const item1Foundation = this.calculateFoundationScore(item1);
    const item2Foundation = this.calculateFoundationScore(item2);
    
    let sourceId: string;
    let targetId: string;
    let rationale: string;

    if (item1Foundation > item2Foundation) {
      sourceId = item2.id;
      targetId = item1.id;
      rationale = `Depends on foundational component: ${sharedComponents.join(', ')}`;
    } else {
      sourceId = item1.id;
      targetId = item2.id;
      rationale = `Depends on foundational component: ${sharedComponents.join(', ')}`;
    }

    return {
      id: `tech_${sourceId}_${targetId}`,
      sourceId,
      targetId,
      type: DependencyType.REQUIRES,
      strength: confidence > 0.8 ? DependencyStrength.HARD : DependencyStrength.SOFT,
      rationale,
      detectionMethod: DetectionMethod.SEMANTIC,
      confidence,
      triggers: sharedComponents,
      detectedAt: new Date()
    };
  }

  /**
   * Calculate foundation score (how likely this item is to be depended upon)
   */
  private calculateFoundationScore(item: WorkItem): number {
    const content = this.extractContent(item).toLowerCase();
    let score = 0;

    // Infrastructure and foundational terms increase score
    const foundationalTerms = ['api', 'service', 'database', 'authentication', 'infrastructure', 'framework'];
    score += foundationalTerms.filter(term => content.includes(term)).length * 2;

    // Type-based scoring
    if (item.type === 'epic') score += 3;
    if (item.type === 'feature') score += 2;
    if (item.type === 'enabler') score += 4; // Enablers are often foundational

    // Story points (larger items are often more foundational)
    if ('storyPoints' in item && item.storyPoints) {
      score += Math.min(item.storyPoints * 0.5, 5);
    }

    return score;
  }

  /**
   * Analyze business flow between two work items
   */
  private analyzeBusinessFlow(item1: WorkItem, item2: WorkItem): {
    dependentId: string;
    prerequisiteId: string;
    confidence: number;
    strength: DependencyStrength;
    rationale: string;
    triggers: string[];
  } {
    const content1 = this.extractContent(item1).toLowerCase();
    const content2 = this.extractContent(item2).toLowerCase();

    // Look for explicit dependency keywords
    const dependencyIndicators = [
      { keywords: ['requires', 'needs', 'depends on'], strength: DependencyStrength.HARD },
      { keywords: ['after', 'following', 'subsequent to'], strength: DependencyStrength.HARD },
      { keywords: ['enables', 'allows', 'permits'], strength: DependencyStrength.SOFT },
      { keywords: ['related to', 'connected to'], strength: DependencyStrength.OPTIONAL }
    ];

    let maxConfidence = 0;
    let bestResult = {
      dependentId: item1.id,
      prerequisiteId: item2.id,
      confidence: 0,
      strength: DependencyStrength.SOFT,
      rationale: '',
      triggers: [] as string[]
    };

    // Check if item1 depends on item2
    for (const indicator of dependencyIndicators) {
      const matches = indicator.keywords.filter(keyword => content1.includes(keyword));
      if (matches.length > 0) {
        // Check if item2 is referenced in the context
        const item2References = this.findItemReferences(content1, item2);
        if (item2References.length > 0) {
          const confidence = Math.min(matches.length * 0.3 + item2References.length * 0.2, 0.9);
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestResult = {
              dependentId: item1.id,
              prerequisiteId: item2.id,
              confidence,
              strength: indicator.strength,
              rationale: `Business dependency detected: ${matches.join(', ')}`,
              triggers: [...matches, ...item2References]
            };
          }
        }
      }
    }

    // Check if item2 depends on item1
    for (const indicator of dependencyIndicators) {
      const matches = indicator.keywords.filter(keyword => content2.includes(keyword));
      if (matches.length > 0) {
        const item1References = this.findItemReferences(content2, item1);
        if (item1References.length > 0) {
          const confidence = Math.min(matches.length * 0.3 + item1References.length * 0.2, 0.9);
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestResult = {
              dependentId: item2.id,
              prerequisiteId: item1.id,
              confidence,
              strength: indicator.strength,
              rationale: `Business dependency detected: ${matches.join(', ')}`,
              triggers: [...matches, ...item1References]
            };
          }
        }
      }
    }

    return bestResult;
  }

  /**
   * Extract content from work item for analysis
   */
  private extractContent(item: WorkItem): string {
    let content = `${item.title} ${item.description}`;
    
    if ('acceptanceCriteria' in item && item.acceptanceCriteria) {
      content += ' ' + item.acceptanceCriteria.join(' ');
    }

    return content;
  }

  /**
   * Extract technical terms from content
   */
  private extractTechnicalTerms(content: string): string[] {
    // Look for technical patterns: CamelCase, API endpoints, service names
    const patterns = [
      /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g, // CamelCase
      /\b\w+API\b/g,                       // *API
      /\b\w+Service\b/g,                   // *Service
      /\/\w+(?:\/\w+)*\b/g                 // API paths
    ];

    const terms: string[] = [];
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        terms.push(...matches);
      }
    }

    return [...new Set(terms.map(term => term.toLowerCase()))];
  }

  /**
   * Find explicit dependency references in content
   */
  private findExplicitDependencyReferences(content: string, allItems: WorkItem[]): Array<{
    targetId: string;
    type: DependencyType;
    strength: DependencyStrength;
    confidence: number;
    rationale: string;
    triggers: string[];
  }> {
    const references: Array<{
      targetId: string;
      type: DependencyType;
      strength: DependencyStrength;
      confidence: number;
      rationale: string;
      triggers: string[];
    }> = [];

    // Look for explicit item references (by ID or title)
    for (const item of allItems) {
      const itemRefs = this.findItemReferences(content, item);
      if (itemRefs.length > 0) {
        references.push({
          targetId: item.id,
          type: DependencyType.RELATED,
          strength: DependencyStrength.SOFT,
          confidence: 0.7,
          rationale: `Explicit reference found: ${itemRefs.join(', ')}`,
          triggers: itemRefs
        });
      }
    }

    return references;
  }

  /**
   * Find references to a specific item in content
   */
  private findItemReferences(content: string, item: WorkItem): string[] {
    const references: string[] = [];
    const lowerContent = content.toLowerCase();
    const lowerTitle = item.title.toLowerCase();

    // Direct ID reference
    if (lowerContent.includes(item.id.toLowerCase())) {
      references.push(item.id);
    }

    // Title reference (check for significant words)
    const titleWords = lowerTitle.split(/\s+/).filter(word => word.length > 3);
    const foundWords = titleWords.filter(word => lowerContent.includes(word));
    
    if (foundWords.length >= Math.min(2, titleWords.length)) {
      references.push(`title match: ${foundWords.join(' ')}`);
    }

    return references;
  }

  /**
   * Build parent-child relationship map
   */
  private buildParentChildMap(workItems: WorkItem[]): Map<string, string[]> {
    const parentChildMap = new Map<string, string[]>();

    for (const item of workItems) {
      if (item.parentId) {
        const siblings = parentChildMap.get(item.parentId) || [];
        siblings.push(item.id);
        parentChildMap.set(item.parentId, siblings);
      }
    }

    return parentChildMap;
  }

  /**
   * Remove duplicate dependencies and filter by confidence
   */
  private deduplicateAndFilter(dependencies: DependencyRelationship[]): DependencyRelationship[] {
    // Remove duplicates based on source-target pairs
    const seen = new Set<string>();
    const unique: DependencyRelationship[] = [];

    for (const dep of dependencies) {
      const key = `${dep.sourceId}-${dep.targetId}`;
      if (!seen.has(key) && dep.confidence >= this.config.confidenceThreshold) {
        seen.add(key);
        unique.push(dep);
      }
    }

    return unique;
  }

  /**
   * Build complete dependency graph with validation
   */
  private async buildDependencyGraph(workItems: WorkItem[], dependencies: DependencyRelationship[]): Promise<DependencyGraph> {
    logger.debug('Building dependency graph', {
      nodes: workItems.length,
      edges: dependencies.length
    });

    // Detect circular dependencies
    const circularDependencies = this.detectCircularDependencies(workItems, dependencies);
    
    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(workItems, dependencies);
    
    // Validate graph
    const validation = this.validateGraph(workItems, dependencies, circularDependencies);
    
    // Calculate statistics
    const statistics = this.calculateGraphStatistics(workItems, dependencies);

    const graph: DependencyGraph = {
      nodes: workItems,
      edges: dependencies,
      criticalPath,
      circularDependencies,
      validation,
      statistics,
      generatedAt: new Date()
    };

    if (circularDependencies.length > 0) {
      logger.warn('Circular dependencies detected', {
        count: circularDependencies.length,
        cycles: circularDependencies.map(cd => cd.cycle)
      });
    }

    return graph;
  }

  /**
   * Detect circular dependencies using topological sort
   */
  private detectCircularDependencies(workItems: WorkItem[], dependencies: DependencyRelationship[]): CircularDependency[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize graph
    for (const item of workItems) {
      graph.set(item.id, []);
      inDegree.set(item.id, 0);
    }

    // Build adjacency list and calculate in-degrees
    for (const dep of dependencies) {
      if (dep.type === DependencyType.REQUIRES || dep.type === DependencyType.BLOCKS) {
        const neighbors = graph.get(dep.targetId) || [];
        neighbors.push(dep.sourceId);
        graph.set(dep.targetId, neighbors);
        
        inDegree.set(dep.sourceId, (inDegree.get(dep.sourceId) || 0) + 1);
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const processed = new Set<string>();

    // Find nodes with no incoming edges
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift()!;
      processed.add(current);

      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Find cycles (unprocessed nodes are part of cycles)
    const cycleNodes = workItems.filter(item => !processed.has(item.id));
    
    if (cycleNodes.length === 0) {
      return [];
    }

    // Extract actual cycles using DFS
    return this.extractCycles(cycleNodes.map(n => n.id), dependencies);
  }

  /**
   * Extract specific cycles from cycle nodes
   */
  private extractCycles(cycleNodeIds: string[], dependencies: DependencyRelationship[]): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();

    for (const nodeId of cycleNodeIds) {
      if (!visited.has(nodeId)) {
        const cycle = this.findCycleFromNode(nodeId, dependencies, visited);
        if (cycle.length > 0) {
          const cycleDeps = dependencies.filter(dep => 
            cycle.includes(dep.sourceId) && cycle.includes(dep.targetId)
          );
          
          cycles.push({
            cycle,
            relationships: cycleDeps,
            severity: this.determineCycleSeverity(cycleDeps),
            resolutionSuggestions: this.generateResolutionSuggestions(cycle, cycleDeps)
          });
        }
      }
    }

    return cycles;
  }

  /**
   * Find a cycle starting from a specific node using DFS
   */
  private findCycleFromNode(startNode: string, dependencies: DependencyRelationship[], visited: Set<string>): string[] {
    const path: string[] = [];
    const pathSet = new Set<string>();
    
    const dfs = (nodeId: string): boolean => {
      if (pathSet.has(nodeId)) {
        // Found cycle, extract it
        const cycleStart = path.indexOf(nodeId);
        return true;
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      path.push(nodeId);
      pathSet.add(nodeId);
      
      // Find dependencies from this node
      const outgoingDeps = dependencies.filter(dep => dep.sourceId === nodeId);
      for (const dep of outgoingDeps) {
        if (dfs(dep.targetId)) {
          return true;
        }
      }
      
      path.pop();
      pathSet.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    if (dfs(startNode)) {
      const cycleStart = path.indexOf(startNode);
      return path.slice(cycleStart);
    }

    return [];
  }

  /**
   * Calculate critical path through dependency graph
   */
  private calculateCriticalPath(workItems: WorkItem[], dependencies: DependencyRelationship[]): string[] {
    // Use longest path algorithm considering story points as weights
    const graph = new Map<string, Array<{target: string, weight: number}>>();
    const itemWeights = new Map<string, number>();

    // Initialize
    for (const item of workItems) {
      graph.set(item.id, []);
      const weight = ('storyPoints' in item && item.storyPoints) ? item.storyPoints : 1;
      itemWeights.set(item.id, weight);
    }

    // Build weighted graph
    for (const dep of dependencies) {
      if (dep.type === DependencyType.REQUIRES || dep.type === DependencyType.BLOCKS) {
        const edges = graph.get(dep.targetId) || [];
        const weight = itemWeights.get(dep.sourceId) || 1;
        edges.push({ target: dep.sourceId, weight });
        graph.set(dep.targetId, edges);
      }
    }

    // Find longest path using topological sort + dynamic programming
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();
    
    // Initialize distances
    for (const item of workItems) {
      distances.set(item.id, 0);
    }

    // Topological sort for longest path
    const visited = new Set<string>();
    const stack: string[] = [];

    const topologicalSort = (nodeId: string) => {
      visited.add(nodeId);
      const edges = graph.get(nodeId) || [];
      
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          topologicalSort(edge.target);
        }
      }
      
      stack.push(nodeId);
    };

    for (const item of workItems) {
      if (!visited.has(item.id)) {
        topologicalSort(item.id);
      }
    }

    // Calculate longest distances
    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      const currentDistance = distances.get(nodeId) || 0;
      const edges = graph.get(nodeId) || [];

      for (const edge of edges) {
        const newDistance = currentDistance + edge.weight;
        const currentTargetDistance = distances.get(edge.target) || 0;
        
        if (newDistance > currentTargetDistance) {
          distances.set(edge.target, newDistance);
          predecessors.set(edge.target, nodeId);
        }
      }
    }

    // Find the node with maximum distance (end of critical path)
    let maxDistance = 0;
    let endNode = '';
    
    for (const [nodeId, distance] of distances.entries()) {
      if (distance > maxDistance) {
        maxDistance = distance;
        endNode = nodeId;
      }
    }

    // Reconstruct critical path
    const criticalPath: string[] = [];
    let current = endNode;
    
    while (current) {
      criticalPath.unshift(current);
      current = predecessors.get(current) || '';
    }

    return criticalPath;
  }

  /**
   * Validate dependency graph
   */
  private validateGraph(workItems: WorkItem[], dependencies: DependencyRelationship[], circularDependencies: CircularDependency[]): GraphValidation {
    const errors: any[] = [];
    const warnings: any[] = [];
    const info: any[] = [];

    // Check for critical circular dependencies
    const criticalCycles = circularDependencies.filter(cd => cd.severity === 'critical');
    if (criticalCycles.length > 0) {
      errors.push({
        code: 'CRITICAL_CIRCULAR_DEPENDENCIES',
        message: `Found ${criticalCycles.length} critical circular dependencies that must be resolved`,
        affectedItems: criticalCycles.map(cd => cd.cycle).flat(),
        suggestedFix: 'Review and break circular dependencies by reordering work or removing unnecessary dependencies'
      });
    }

    // Check for isolated nodes (no dependencies)
    const connectedNodes = new Set(dependencies.flatMap(d => [d.sourceId, d.targetId]));
    const isolatedNodes = workItems.filter(item => !connectedNodes.has(item.id));
    
    if (isolatedNodes.length > 0) {
      info.push({
        code: 'ISOLATED_NODES',
        message: `${isolatedNodes.length} work items have no dependencies`,
        affectedItems: isolatedNodes.map(n => n.id)
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Calculate graph statistics
   */
  private calculateGraphStatistics(workItems: WorkItem[], dependencies: DependencyRelationship[]): GraphStatistics {
    const nodeCount = workItems.length;
    const edgeCount = dependencies.length;
    const hardDependencies = dependencies.filter(d => d.strength === DependencyStrength.HARD).length;
    const softDependencies = dependencies.filter(d => d.strength === DependencyStrength.SOFT).length;

    const dependencyCount = new Map<string, number>();
    for (const dep of dependencies) {
      dependencyCount.set(dep.sourceId, (dependencyCount.get(dep.sourceId) || 0) + 1);
    }

    const averageDependencies = nodeCount > 0 ? edgeCount / nodeCount : 0;
    const independentItems = workItems.length - new Set(dependencies.map(d => d.sourceId)).size;
    
    // Items with high dependency count (potential bottlenecks)
    const highDependencyThreshold = Math.max(3, averageDependencies * 1.5);
    const highDependencyItems = Array.from(dependencyCount.entries())
      .filter(([, count]) => count >= highDependencyThreshold)
      .map(([nodeId]) => nodeId);

    const totalStoryPoints = workItems.reduce((sum, item) => {
      return sum + (('storyPoints' in item && item.storyPoints) ? item.storyPoints : 1);
    }, 0);

    return {
      nodeCount,
      edgeCount,
      hardDependencies,
      softDependencies,
      averageDependencies,
      independentItems,
      highDependencyItems,
      longestPath: 0, // Will be calculated during critical path analysis
      estimatedDuration: totalStoryPoints
    };
  }

  /**
   * Determine severity of circular dependency
   */
  private determineCycleSeverity(cycleDeps: DependencyRelationship[]): 'critical' | 'warning' | 'info' {
    const hasHardDependencies = cycleDeps.some(dep => dep.strength === DependencyStrength.HARD);
    const hasBlockingDependencies = cycleDeps.some(dep => dep.type === DependencyType.BLOCKS);
    
    if (hasHardDependencies || hasBlockingDependencies) {
      return 'critical';
    } else if (cycleDeps.length > 2) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  /**
   * Generate resolution suggestions for circular dependencies
   */
  private generateResolutionSuggestions(cycle: string[], deps: DependencyRelationship[]): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Review the necessity of each dependency in the cycle');
    suggestions.push('Consider breaking the cycle by removing soft dependencies');
    suggestions.push('Reorder work items to create a linear dependency chain');
    
    if (cycle.length > 3) {
      suggestions.push('Split large work items to reduce dependency complexity');
    }
    
    const softDeps = deps.filter(d => d.strength === DependencyStrength.SOFT);
    if (softDeps.length > 0) {
      suggestions.push(`Consider making soft dependencies optional: ${softDeps.map(d => d.id).join(', ')}`);
    }

    return suggestions;
  }

  /**
   * Prepare Linear relationship inputs from dependencies
   */
  private prepareLinearRelationships(dependencies: DependencyRelationship[]) {
    return dependencies.map(dep => ({
      sourceIssueId: dep.sourceId,
      targetIssueId: dep.targetId,
      relationType: this.mapDependencyTypeToLinear(dep.type),
      comment: `${dep.rationale} (Confidence: ${(dep.confidence * 100).toFixed(0)}%, Method: ${dep.detectionMethod})`,
      metadata: {
        strength: dep.strength,
        confidence: dep.confidence,
        detectionMethod: dep.detectionMethod,
        triggers: dep.triggers
      }
    }));
  }

  /**
   * Map dependency type to Linear relationship type
   */
  private mapDependencyTypeToLinear(type: DependencyType): 'blocks' | 'blocked_by' | 'related' | 'duplicate' {
    switch (type) {
      case DependencyType.BLOCKS:
        return 'blocks';
      case DependencyType.BLOCKED_BY:
        return 'blocked_by';
      case DependencyType.REQUIRES:
        return 'blocked_by'; // Item requires target, so target blocks item
      case DependencyType.ENABLES:
        return 'related';
      case DependencyType.RELATED:
        return 'related';
      case DependencyType.CONFLICTS:
        return 'related';
      default:
        return 'related';
    }
  }

  /**
   * Check if dependency is technical
   */
  private isTechnicalDependency(dep: DependencyRelationship): boolean {
    return dep.triggers.some(trigger => this.config.technicalKeywords.includes(trigger.toLowerCase()));
  }

  /**
   * Check if dependency is business-related
   */
  private isBusinessDependency(dep: DependencyRelationship): boolean {
    return dep.triggers.some(trigger => this.config.businessKeywords.includes(trigger.toLowerCase()));
  }
}