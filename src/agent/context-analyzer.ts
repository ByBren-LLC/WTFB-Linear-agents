/**
 * Response Context Analyzer for Enhanced Response System (LIN-60)
 * 
 * Analyzes user context, issue type, and operation complexity to
 * determine the most appropriate response style and content depth.
 */

import {
  ResponseContext,
  ContextAnalysis,
  ResponseStyle
} from './types/response-types';
import * as logger from '../utils/logger';

/**
 * Context analyzer for response adaptation
 */
export class ResponseContextAnalyzer {
  private userInteractionHistory: Map<string, Date[]> = new Map();

  /**
   * Analyze context to determine response requirements
   */
  analyzeContext(context: ResponseContext): ContextAnalysis {
    const issueType = this.determineIssueType(context.issue);
    const userRole = this.determineUserRole(context.user);
    const operationComplexity = this.assessComplexity(context.operation);
    const teamContext = this.analyzeTeamContext(context.issue?.team);
    const historicalContext = this.getHistoricalContext(context.user?.id);
    
    const responseStyle = this.selectResponseStyle({
      issueType,
      userRole,
      operationComplexity,
      teamContext,
      historicalContext,
      userExperience: context.user?.experienceLevel
    });

    const analysis: ContextAnalysis = {
      issueType,
      userRole,
      operationComplexity,
      teamContext,
      historicalContext,
      responseStyle
    };

    logger.debug('Context analysis completed', {
      userId: context.user?.id,
      issueType,
      userRole,
      complexity: operationComplexity
    });

    return analysis;
  }

  /**
   * Determine issue type from context
   */
  private determineIssueType(
    issue?: ResponseContext['issue']
  ): ContextAnalysis['issueType'] {
    if (!issue) {
      return 'Unknown';
    }

    return issue.type || 'Unknown';
  }

  /**
   * Determine user role from context
   */
  private determineUserRole(
    user?: ResponseContext['user']
  ): ContextAnalysis['userRole'] {
    if (!user) {
      return 'developer'; // Default role
    }

    // Use explicit role if provided
    if (user.role) {
      return user.role;
    }

    // Infer from user name patterns (can be enhanced)
    const name = user.name.toLowerCase();
    if (name.includes('manager') || name.includes('pm')) {
      return 'manager';
    }
    if (name.includes('lead') || name.includes('senior')) {
      return 'lead';
    }
    if (name.includes('stakeholder') || name.includes('exec')) {
      return 'stakeholder';
    }

    return 'developer';
  }

  /**
   * Assess operation complexity
   */
  private assessComplexity(
    operation?: ResponseContext['operation']
  ): ContextAnalysis['operationComplexity'] {
    if (!operation) {
      return 'simple';
    }

    // Use explicit complexity if provided
    if (operation.complexity) {
      return operation.complexity;
    }

    // Assess based on operation type
    const complexOperations = [
      'art_planning',
      'pi_planning',
      'dependency_mapping',
      'value_stream_analysis',
      'capacity_planning'
    ];

    const longRunningOperations = [
      'bulk_import',
      'historical_analysis',
      'full_sync',
      'migration'
    ];

    if (longRunningOperations.includes(operation.type)) {
      return 'long-running';
    }

    if (complexOperations.includes(operation.type)) {
      return 'complex';
    }

    // Assess based on estimated duration
    if (operation.estimatedDuration && operation.estimatedDuration > 5000) {
      return 'long-running';
    }

    return 'simple';
  }

  /**
   * Analyze team context
   */
  private analyzeTeamContext(
    team?: ResponseContext['issue']['team']
  ): ContextAnalysis['teamContext'] {
    // Default team context
    const defaultContext = {
      size: 5,
      experienceLevel: 'intermediate' as const
    };

    if (!team) {
      return defaultContext;
    }

    // Can be enhanced with actual team data lookup
    // For now, use heuristics based on team name
    const name = team.name.toLowerCase();
    
    let size = 5;
    if (name.includes('small') || name.includes('startup')) {
      size = 3;
    } else if (name.includes('large') || name.includes('enterprise')) {
      size = 10;
    }

    let experienceLevel: ContextAnalysis['teamContext']['experienceLevel'] = 'intermediate';
    if (name.includes('new') || name.includes('junior')) {
      experienceLevel = 'new';
    } else if (name.includes('senior') || name.includes('expert')) {
      experienceLevel = 'experienced';
    }

    return { size, experienceLevel };
  }

  /**
   * Get historical context for user
   */
  private getHistoricalContext(
    userId?: string
  ): ContextAnalysis['historicalContext'] {
    if (!userId) {
      return { previousInteractions: 0 };
    }

    const interactions = this.userInteractionHistory.get(userId) || [];
    
    // Record this interaction
    interactions.push(new Date());
    this.userInteractionHistory.set(userId, interactions);

    // Clean up old interactions (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentInteractions = interactions.filter(date => date > thirtyDaysAgo);
    this.userInteractionHistory.set(userId, recentInteractions);

    return {
      previousInteractions: recentInteractions.length - 1, // Exclude current
      lastInteraction: recentInteractions[recentInteractions.length - 2]
    };
  }

  /**
   * Select appropriate response style based on analysis
   */
  selectResponseStyle(params: {
    issueType: ContextAnalysis['issueType'];
    userRole: ContextAnalysis['userRole'];
    operationComplexity: ContextAnalysis['operationComplexity'];
    teamContext: ContextAnalysis['teamContext'];
    historicalContext: ContextAnalysis['historicalContext'];
    userExperience?: 'new' | 'intermediate' | 'experienced';
  }): ResponseStyle {
    const {
      issueType,
      userRole,
      operationComplexity,
      teamContext,
      historicalContext,
      userExperience
    } = params;

    // Determine detail level
    let detailLevel: ResponseStyle['detailLevel'] = 'standard';
    if (userExperience === 'new' || historicalContext.previousInteractions < 5) {
      detailLevel = 'detailed';
    } else if (userExperience === 'experienced' && historicalContext.previousInteractions > 20) {
      detailLevel = 'minimal';
    }

    // Adjust for role
    if (userRole === 'stakeholder') {
      detailLevel = 'minimal'; // Executives prefer concise responses
    } else if (userRole === 'manager' && operationComplexity === 'complex') {
      detailLevel = 'standard'; // Managers need balanced detail for complex ops
    }

    // Determine technical depth
    let technicalDepth: ResponseStyle['technicalDepth'] = 'intermediate';
    if (userRole === 'developer' || userRole === 'lead') {
      technicalDepth = 'advanced';
    } else if (userRole === 'stakeholder') {
      technicalDepth = 'basic';
    }

    // Determine if examples and links should be included
    const includeExamples = userExperience === 'new' || 
                          historicalContext.previousInteractions < 3 ||
                          operationComplexity === 'complex';

    const includeLinks = detailLevel !== 'minimal' &&
                        (operationComplexity === 'complex' || 
                         issueType === 'Epic' || 
                         issueType === 'Feature');

    // Determine tone
    let tone: ResponseStyle['tone'] = 'professional';
    if (teamContext.experienceLevel === 'new' || userExperience === 'new') {
      tone = 'friendly'; // More encouraging for new users
    } else if (userRole === 'stakeholder') {
      tone = 'formal'; // More formal for executives
    }

    return {
      detailLevel,
      technicalDepth,
      includeExamples,
      includeLinks,
      tone
    };
  }

  /**
   * Clear interaction history for a user
   */
  clearUserHistory(userId: string): void {
    this.userInteractionHistory.delete(userId);
  }

  /**
   * Get user interaction count
   */
  getUserInteractionCount(userId: string): number {
    const interactions = this.userInteractionHistory.get(userId) || [];
    return interactions.length;
  }
}