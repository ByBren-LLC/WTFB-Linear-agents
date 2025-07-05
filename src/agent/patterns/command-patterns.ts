/**
 * Command Pattern Registry
 * 
 * Defines all recognized command patterns for the SAFe PULSE agent.
 * Each pattern set maps natural language variations to specific intents.
 */

import { CommandIntent, PatternDefinition } from '../types/command-types';

/**
 * ART Planning command patterns
 */
export const ART_PLAN_PATTERNS: PatternDefinition = {
  intent: CommandIntent.ART_PLAN,
  priority: 10,
  minConfidence: 0.85,
  patterns: [
    // Direct commands
    /\b(plan|planning)\s+(this\s+)?pi\b/i,
    /\bplan\s+pi[-]?\d{4}[-]?q\d+\b/i,
    /\bplan\s+pi[-]?[\w-]+\b/i,  // General PI pattern
    
    // Execute variations
    /\b(execute|run|start)\s+art\s+planning\b/i,
    /\b(execute|run|start)\s+pi\s+planning\b/i,
    
    // Create variations
    /\b(create|generate|build)\s+(an?\s+)?iteration\s+plan\b/i,
    /\b(create|generate|build)\s+(an?\s+)?pi\s+plan\b/i,
    
    // Simple variations
    /\bpi\s+planning\b/i,
    /\bart\s+planning\b/i,
    /\bplan\s+(our|the)\s+iterations?\b/i
  ],
  keywords: ['plan', 'planning', 'pi', 'art', 'iteration', 'program increment'],
  examples: [
    'plan this PI',
    'plan PI-2025-Q1',
    'execute ART planning',
    'create iteration plan',
    'start PI planning',
    'ART planning for next quarter'
  ],
  description: 'Execute ART planning for a Program Increment'
};

/**
 * ART Optimization patterns
 */
export const ART_OPTIMIZE_PATTERNS: PatternDefinition = {
  intent: CommandIntent.ART_OPTIMIZE,
  priority: 9,
  minConfidence: 0.85,
  patterns: [
    /\b(optimize|improve|enhance)\s+(the\s+)?art\b/i,
    /\bart\s+(optimization|improvement|enhancement)\b/i,
    /\b(check|verify|validate)\s+art\s+readiness\b/i,
    /\breadiness\s+(check|score|assessment)\b/i,
    /\b(optimize|improve)\s+(our\s+)?agile\s+release\s+train\b/i
  ],
  keywords: ['optimize', 'improve', 'readiness', 'art', 'agile release train'],
  examples: [
    'optimize ART',
    'check ART readiness',
    'validate ART readiness score',
    'improve our agile release train'
  ],
  description: 'Optimize ART configuration and check readiness'
};

/**
 * Value Delivery Analysis patterns
 */
export const VALUE_ANALYZE_PATTERNS: PatternDefinition = {
  intent: CommandIntent.VALUE_ANALYZE,
  priority: 8,
  minConfidence: 0.8,
  patterns: [
    /\b(analyze|check|assess)\s+value\s+delivery\b/i,
    /\bvalue\s+(analysis|assessment|check)\b/i,
    /\b(check|verify|validate)\s+working\s+software\b/i,
    /\bworking\s+software\s+(check|validation|assessment)\b/i,
    /\b(show|display|list)\s+value\s+streams?\b/i,
    /\bvalue\s+stream\s+(analysis|mapping)\b/i
  ],
  keywords: ['value', 'delivery', 'working software', 'value stream', 'analyze'],
  examples: [
    'analyze value delivery',
    'check working software',
    'show value streams',
    'value analysis for this PI',
    'assess value delivery metrics'
  ],
  description: 'Analyze value delivery and working software metrics'
};

/**
 * Story Decomposition patterns
 */
export const STORY_DECOMPOSE_PATTERNS: PatternDefinition = {
  intent: CommandIntent.STORY_DECOMPOSE,
  priority: 10,
  minConfidence: 0.9,
  patterns: [
    /\b(decompose|break\s+down|split)\s+(this\s+)?(story|issue|ticket)?\b/i,
    /^decompose\s+this$/i,  // Specific pattern for "decompose this"
    /\b(help|assist)\s+(me\s+)?(decompose|break\s+down|split)\b/i,
    /\bstory\s+decomposition\b/i,
    /\b(make|split)\s+(this\s+)?(story\s+)?smaller\b/i,
    /\bbreak\s+(this\s+)?into\s+smaller\s+(stories|tasks|pieces)\b/i,
    /\b(this\s+)?(story|issue)\s+is\s+too\s+(big|large)\b/i
  ],
  keywords: ['decompose', 'break', 'split', 'smaller', 'story', 'breakdown'],
  examples: [
    'decompose this story',
    'help me break down this issue',
    'split this into smaller stories',
    'make this smaller',
    'this story is too big',
    'break this into smaller pieces'
  ],
  description: 'Decompose large stories into smaller, manageable pieces'
};

/**
 * Dependency Mapping patterns
 */
export const DEPENDENCY_MAP_PATTERNS: PatternDefinition = {
  intent: CommandIntent.DEPENDENCY_MAP,
  priority: 8,
  minConfidence: 0.85,
  patterns: [
    /\b(map|show|display|list)\s+(the\s+)?dependenc(ies|y)\b/i,
    /\bdependenc(y|ies)\s+(map|mapping|analysis|graph)\b/i,
    /\b(find|identify|analyze)\s+dependenc(ies|y)\b/i,
    /\bwhat\s+(are\s+the\s+)?dependenc(ies|y)\b/i,
    /\b(check|verify)\s+dependenc(ies|y)\b/i
  ],
  keywords: ['dependency', 'dependencies', 'map', 'graph', 'connections'],
  examples: [
    'map dependencies',
    'show dependency graph',
    'what are the dependencies?',
    'analyze dependencies for this epic',
    'dependency mapping'
  ],
  description: 'Map and analyze dependencies between issues'
};

/**
 * Story Scoring patterns
 */
export const STORY_SCORE_PATTERNS: PatternDefinition = {
  intent: CommandIntent.STORY_SCORE,
  priority: 8,
  minConfidence: 0.85,
  patterns: [
    /\b(score|estimate)\s+(this\s+)?(story|issue|ticket)\b/i,
    /\b(calculate|compute)\s+(story\s+)?points?\b/i,
    /\bwsjf\s+(score|scoring|calculation)\b/i,
    /\b(apply|calculate|compute)\s+wsjf\b/i,
    /\bestimate\s+(story\s+)?points?\b/i,
    /\bhow\s+many\s+points?\b/i
  ],
  keywords: ['score', 'estimate', 'points', 'wsjf', 'story points'],
  examples: [
    'score this story',
    'estimate story points',
    'calculate WSJF',
    'apply WSJF scoring',
    'how many points?'
  ],
  description: 'Apply WSJF scoring or estimate story points'
};

/**
 * Status Check patterns
 */
export const STATUS_CHECK_PATTERNS: PatternDefinition = {
  intent: CommandIntent.STATUS_CHECK,
  priority: 7,
  minConfidence: 0.8,
  patterns: [
    /^status$/i,  // Simple status command
    /\b(show|check|display)\s+(art\s+)?status\b/i,
    /\bstatus\s+(check|report|update)\b/i,
    /\b(what'?s?|show)\s+the\s+(current\s+)?status\b/i,
    /\bart\s+(health|status|report)\b/i,
    /\b(show|display)\s+(current\s+)?iterations?\b/i,
    /\bhealth\s+check\b/i
  ],
  keywords: ['status', 'health', 'report', 'current', 'iteration'],
  examples: [
    'status',
    'show ART status',
    'what\'s the current status?',
    'ART health check',
    'show current iteration'
  ],
  description: 'Check current ART status and health metrics'
};

/**
 * Help patterns
 */
export const HELP_PATTERNS: PatternDefinition = {
  intent: CommandIntent.HELP,
  priority: 5,
  minConfidence: 0.7,
  patterns: [
    /\bhelp\b/i,
    /\bwhat\s+can\s+(you|i)\s+do\b/i,
    /\b(show|list|display)\s+(available\s+)?commands?\b/i,
    /\bhow\s+(do|can)\s+i\s+use\b/i,
    /\bwhat\s+commands?\b/i,
    /\b(guide|tutorial|instructions)\b/i
  ],
  keywords: ['help', 'commands', 'what', 'how', 'guide'],
  examples: [
    'help',
    'what can you do?',
    'show commands',
    'how do I use this?',
    'list available commands'
  ],
  description: 'Show available commands and usage help'
};

/**
 * All pattern definitions
 */
export const ALL_PATTERNS: PatternDefinition[] = [
  ART_PLAN_PATTERNS,
  ART_OPTIMIZE_PATTERNS,
  VALUE_ANALYZE_PATTERNS,
  STORY_DECOMPOSE_PATTERNS,
  DEPENDENCY_MAP_PATTERNS,
  STORY_SCORE_PATTERNS,
  STATUS_CHECK_PATTERNS,
  HELP_PATTERNS
];

/**
 * Pattern registry for quick lookup
 */
export const PATTERN_REGISTRY = new Map<CommandIntent, PatternDefinition>(
  ALL_PATTERNS.map(pattern => [pattern.intent, pattern])
);

/**
 * Get patterns by intent
 */
export function getPatternsByIntent(intent: CommandIntent): PatternDefinition | undefined {
  return PATTERN_REGISTRY.get(intent);
}

/**
 * Get all patterns sorted by priority
 */
export function getPatternsByPriority(): PatternDefinition[] {
  return [...ALL_PATTERNS].sort((a, b) => b.priority - a.priority);
}