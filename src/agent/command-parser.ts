/**
 * Command Parser Implementation
 * 
 * Core natural language command parser for the SAFe PULSE agent.
 * Transforms user mentions into structured commands with intent recognition.
 */

import {
  CommandIntent,
  ParsedCommand,
  PatternDefinition,
  PatternMatchResult,
  ConfidenceFactors,
  IssueContext,
  CommandMetadata,
  ParserConfig,
  DEFAULT_PARSER_CONFIG,
  CommandSuggestion
} from './types/command-types';
import { getPatternsByPriority, HELP_PATTERNS } from './patterns/command-patterns';
import * as logger from '../utils/logger';

/**
 * Natural Language Command Parser
 * 
 * Parses @saafepulse mentions to identify user intent and extract commands.
 * Uses pattern matching with confidence scoring for reliable intent recognition.
 */
export class AgentCommandParser {
  private config: ParserConfig;
  private patterns: PatternDefinition[];

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config };
    this.patterns = getPatternsByPriority();
    
    logger.info('Command parser initialized', {
      patternCount: this.patterns.length,
      minConfidence: this.config.minConfidence
    });
  }

  /**
   * Parse command text to identify intent
   * 
   * @param text Raw text from user mention
   * @param context Issue context from Linear
   * @returns Parsed command with intent and confidence
   */
  public parseCommand(text: string, context: IssueContext): ParsedCommand {
    const startTime = Date.now();
    
    try {
      // Normalize the input text
      const normalizedText = this.normalizeText(text);
      
      logger.debug('Parsing command', {
        raw: text,
        normalized: normalizedText,
        issueId: context.issueId
      });
      
      // Try to match patterns
      const matchResult = this.matchPatterns(normalizedText, context);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Build metadata
      const metadata: CommandMetadata = {
        processingTime,
        matchedPattern: matchResult.pattern,
        patternConfidence: matchResult.confidence,
        debug: this.config.debug ? {
          normalizedText,
          triedPatterns: this.patterns.length,
          factors: matchResult.factors
        } : undefined
      };
      
      // Handle unknown commands
      if (!matchResult.matched || matchResult.confidence < this.config.minConfidence) {
        logger.debug('Command did not meet confidence threshold', {
          matched: matchResult.matched,
          confidence: matchResult.confidence,
          minConfidence: this.config.minConfidence,
          intent: matchResult.intent
        });
        return this.handleUnknownCommand(text, normalizedText, context, metadata);
      }
      
      // Return successful parse
      return {
        intent: matchResult.intent!,
        confidence: matchResult.confidence,
        rawText: text,
        normalizedText,
        matchedPattern: matchResult.pattern,
        context,
        timestamp: new Date(),
        metadata
      };
      
    } catch (error) {
      logger.error('Command parsing error', {
        error: (error as Error).message,
        text,
        issueId: context.issueId
      });
      
      // Return error result
      return {
        intent: CommandIntent.UNKNOWN,
        confidence: 0,
        rawText: text || '',
        normalizedText: (text || '').toLowerCase().trim(),
        context,
        timestamp: new Date(),
        metadata: {
          processingTime: Date.now() - startTime,
          warnings: [`Parsing error: ${(error as Error).message}`]
        }
      };
    }
  }

  /**
   * Normalize text for pattern matching
   * 
   * @param text Raw input text
   * @returns Normalized text
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // Remove @saafepulse mention
      .replace(/@saafepulse\s*/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove leading/trailing punctuation (but not quotes)
      .replace(/^[^\w"]+|[^\w"]+$/g, '')
      .trim();
  }

  /**
   * Match text against all patterns
   * 
   * @param text Normalized text
   * @param context Issue context
   * @returns Best match result
   */
  private matchPatterns(text: string, context: IssueContext): PatternMatchResult {
    let bestMatch: PatternMatchResult = {
      matched: false,
      confidence: 0
    };
    
    // Try each pattern set in priority order
    for (const patternDef of this.patterns) {
      const result = this.matchPatternDefinition(text, patternDef, context);
      
      // Update best match if this is better
      if (result.confidence > bestMatch.confidence) {
        bestMatch = result;
        
        // Early termination on high confidence
        if (result.confidence >= 0.95) {
          break;
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Match text against a specific pattern definition
   * 
   * @param text Normalized text
   * @param patternDef Pattern definition to match
   * @param context Issue context
   * @returns Match result
   */
  private matchPatternDefinition(
    text: string,
    patternDef: PatternDefinition,
    context: IssueContext
  ): PatternMatchResult {
    // Check each regex pattern
    for (const pattern of patternDef.patterns) {
      if (pattern.test(text)) {
        // Calculate confidence factors
        const factors = this.calculateConfidenceFactors(text, patternDef, pattern, context);
        const confidence = this.calculateConfidence(factors);
        
        // Apply minimum confidence from pattern definition if specified
        const minConfidence = patternDef.minConfidence || 0;
        
        return {
          matched: true,
          intent: patternDef.intent,
          pattern: pattern.source,
          confidence: Math.max(confidence, minConfidence * 0.9), // Give some room below min
          factors
        };
      }
    }
    
    // No pattern matched
    return {
      matched: false,
      confidence: 0
    };
  }

  /**
   * Calculate confidence factors for a match
   * 
   * @param text Normalized text
   * @param patternDef Pattern definition
   * @param matchedPattern The regex that matched
   * @param context Issue context
   * @returns Confidence factors
   */
  private calculateConfidenceFactors(
    text: string,
    patternDef: PatternDefinition,
    matchedPattern: RegExp,
    context: IssueContext
  ): ConfidenceFactors {
    // Pattern match score (base confidence)
    const patternMatchScore = this.calculatePatternMatchScore(text, matchedPattern);
    
    // Keyword density
    const keywordDensity = this.calculateKeywordDensity(text, patternDef.keywords || []);
    
    // Command structure score
    const commandStructure = this.calculateCommandStructure(text);
    
    // Context relevance
    const contextRelevance = this.calculateContextRelevance(patternDef.intent, context);
    
    return {
      patternMatchScore,
      keywordDensity,
      commandStructure,
      contextRelevance
    };
  }

  /**
   * Calculate pattern match score
   * 
   * @param text Text to match
   * @param pattern Regex pattern
   * @returns Score 0-1
   */
  private calculatePatternMatchScore(text: string, pattern: RegExp): number {
    const match = text.match(pattern);
    if (!match) return 0;
    
    // Full match gets higher score
    const matchLength = match[0].length;
    const textLength = text.length;
    const coverage = matchLength / textLength;
    
    // Bonus for exact match
    const exactMatch = match[0] === text ? 0.2 : 0;
    
    return Math.min(1, coverage + exactMatch);
  }

  /**
   * Calculate keyword density score
   * 
   * @param text Text to analyze
   * @param keywords Keywords to look for
   * @returns Score 0-1
   */
  private calculateKeywordDensity(text: string, keywords: string[]): number {
    if (keywords.length === 0) return 0.8; // High neutral score when no keywords
    
    const words = text.split(/\s+/);
    let matchedKeywords = new Set<string>();
    
    for (const word of words) {
      for (const keyword of keywords) {
        if (word.toLowerCase().includes(keyword.toLowerCase())) {
          matchedKeywords.add(keyword);
        }
      }
    }
    
    // Score based on percentage of keywords found
    const score = matchedKeywords.size / keywords.length;
    
    // Boost score if we found at least some keywords
    return matchedKeywords.size > 0 ? Math.max(0.6, score) : score;
  }

  /**
   * Calculate command structure score
   * 
   * @param text Text to analyze
   * @returns Score 0-1
   */
  private calculateCommandStructure(text: string): number {
    const words = text.split(/\s+/);
    
    // Factors that indicate good command structure
    let score = 0.6; // Higher base score
    
    // Imperative verb at start
    const imperativeVerbs = ['plan', 'analyze', 'decompose', 'show', 'help', 'check', 'create', 'execute', 'map', 'break', 'split', 'status', 'optimize'];
    if (words.length > 0 && imperativeVerbs.includes(words[0])) {
      score += 0.3;
    }
    
    // Reasonable length
    if (words.length === 1) {
      // Single word commands are OK for status, help, etc.
      score += 0.1;
    } else if (words.length >= 2 && words.length <= 10) {
      score += 0.2;
    }
    
    // Common command patterns
    const commonPatterns = ['this', 'the', 'pi', 'art', 'story', 'issue'];
    if (words.some(w => commonPatterns.includes(w.toLowerCase()))) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }

  /**
   * Calculate context relevance score
   * 
   * @param intent Matched intent
   * @param context Issue context
   * @returns Score 0-1
   */
  private calculateContextRelevance(intent: CommandIntent, context: IssueContext): number {
    let score = 0.5; // Base score
    
    // Story decomposition is more relevant for large stories
    if (intent === CommandIntent.STORY_DECOMPOSE && context.estimate && context.estimate > 5) {
      score += 0.3;
    }
    
    // Planning commands more relevant during planning phases
    if ((intent === CommandIntent.ART_PLAN || intent === CommandIntent.ART_OPTIMIZE) && 
        context.labels.some(label => label.toLowerCase().includes('planning'))) {
      score += 0.2;
    }
    
    // Status checks always moderately relevant
    if (intent === CommandIntent.STATUS_CHECK) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }

  /**
   * Calculate final confidence score
   * 
   * @param factors Confidence factors
   * @returns Weighted confidence score 0-1
   */
  private calculateConfidence(factors: ConfidenceFactors): number {
    const weights = this.config.confidenceWeights!;
    
    const confidence = (
      factors.patternMatchScore * weights.patternMatch +
      factors.keywordDensity * weights.keywordDensity +
      factors.commandStructure * weights.commandStructure +
      factors.contextRelevance * weights.contextRelevance
    );
    
    logger.debug('Confidence calculation', {
      factors,
      weights,
      confidence
    });
    
    return confidence;
  }

  /**
   * Handle unknown/low-confidence commands
   * 
   * @param rawText Original text
   * @param normalizedText Normalized text
   * @param context Issue context
   * @param metadata Command metadata
   * @returns Unknown command result
   */
  private handleUnknownCommand(
    rawText: string,
    normalizedText: string,
    context: IssueContext,
    metadata: CommandMetadata
  ): ParsedCommand {
    // Find suggestions
    const suggestions = this.findSuggestions(normalizedText);
    
    // Add suggestions to metadata
    metadata.suggestions = suggestions.map(s => s.command);
    
    // If text is very short AND looks like a greeting, suggest help
    if (normalizedText.split(' ').length <= 1 && this.isGreeting(normalizedText)) {
      return {
        intent: CommandIntent.HELP,
        confidence: 0.7,
        rawText,
        normalizedText,
        context,
        timestamp: new Date(),
        metadata
      };
    }
    
    return {
      intent: CommandIntent.UNKNOWN,
      confidence: 0,
      rawText,
      normalizedText,
      context,
      timestamp: new Date(),
      metadata
    };
  }

  /**
   * Find command suggestions for unknown text
   * 
   * @param text Text to find suggestions for
   * @returns Top suggestions
   */
  private findSuggestions(text: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    
    // Check each pattern for partial matches
    for (const patternDef of this.patterns) {
      const similarity = this.calculateSimilarity(text, patternDef);
      
      if (similarity > 0.2) {  // Lower threshold
        suggestions.push({
          command: patternDef.examples[0],
          intent: patternDef.intent,
          similarity,
          description: patternDef.description || ''
        });
      }
    }
    
    // If no suggestions found, add help as default
    if (suggestions.length === 0) {
      const helpPattern = this.patterns.find(p => p.intent === CommandIntent.HELP);
      if (helpPattern && helpPattern.examples.length > 0) {
        suggestions.push({
          command: helpPattern.examples[0],
          intent: CommandIntent.HELP,
          similarity: 0.5,
          description: helpPattern.description || 'Show available commands'
        });
      }
    }
    
    // Sort by similarity and return top 3
    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  /**
   * Calculate similarity between text and pattern
   * 
   * @param text Input text
   * @param patternDef Pattern to compare
   * @returns Similarity score 0-1
   */
  private calculateSimilarity(text: string, patternDef: PatternDefinition): number {
    const words = text.split(/\s+/);
    const keywords = patternDef.keywords || [];
    
    // Count matching keywords
    let matches = 0;
    for (const word of words) {
      for (const keyword of keywords) {
        // Check for partial matches in both directions
        if (word.includes(keyword) || keyword.includes(word)) {
          matches++;
          break; // Only count each word once
        }
      }
    }
    
    // Also check examples for similarity
    let exampleMatch = false;
    for (const example of patternDef.examples) {
      const exampleWords = example.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (exampleWords.some(ew => ew.includes(word) || word.includes(ew))) {
          exampleMatch = true;
          break;
        }
      }
    }
    
    const keywordScore = keywords.length > 0 ? matches / keywords.length : 0;
    const exampleScore = exampleMatch ? 0.5 : 0;
    
    return Math.max(keywordScore, exampleScore);
  }

  /**
   * Check if text is a greeting
   * 
   * @param text Text to check
   * @returns True if greeting
   */
  private isGreeting(text: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'help', 'what can you do'];
    return greetings.some(greeting => text.includes(greeting));
  }
}