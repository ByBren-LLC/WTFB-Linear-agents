/**
 * Response Formatter for Linear Comments
 * 
 * Converts CLI execution results into rich markdown for Linear comments.
 * Provides structured, actionable responses with proper formatting.
 */

import { ExecutionResult } from './cli-executor';
import { ParsedCommand, CommandIntent } from './types/command-types';
import { AgentResponse } from './responses';
import * as logger from '../utils/logger';

/**
 * Formatting options for Linear responses
 */
export interface FormattingOptions {
  /** Maximum response length (Linear comment limit) */
  maxLength?: number;
  
  /** Include execution metadata */
  includeMetadata?: boolean;
  
  /** Include actionable next steps */
  includeNextSteps?: boolean;
  
  /** Response style */
  style?: 'detailed' | 'summary' | 'compact';
}

/**
 * Default formatting options
 */
const DEFAULT_OPTIONS: FormattingOptions = {
  maxLength: 65536, // Linear comment limit
  includeMetadata: true,
  includeNextSteps: true,
  style: 'detailed'
};

/**
 * Response Formatter
 * 
 * Formats CLI execution results for Linear comments
 */
export class ResponseFormatter {
  private options: FormattingOptions;

  constructor(options: Partial<FormattingOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Format execution result for Linear
   */
  formatForLinear(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    if (!result.success) {
      return this.formatErrorResponse(result, command);
    }

    // Route to specific formatter based on command intent
    switch (command.intent) {
      case CommandIntent.ART_PLAN:
        return this.formatARTPlanResponse(result, command);
      
      case CommandIntent.STORY_DECOMPOSE:
        return this.formatDecompositionResponse(result, command);
      
      case CommandIntent.VALUE_ANALYZE:
        return this.formatValueAnalysisResponse(result, command);
      
      case CommandIntent.DEPENDENCY_MAP:
        return this.formatDependencyResponse(result, command);
      
      case CommandIntent.STATUS_CHECK:
        return this.formatStatusResponse(result, command);
      
      case CommandIntent.ART_OPTIMIZE:
        return this.formatOptimizationResponse(result, command);
      
      case CommandIntent.STORY_SCORE:
        return this.formatScoringResponse(result, command);
      
      case CommandIntent.HELP:
        return this.formatHelpResponse(result, command);
      
      default:
        return this.formatGenericResponse(result, command);
    }
  }

  /**
   * Format ART planning response
   */
  private formatARTPlanResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;
    const plan = data.plan;

    let message = `## 📅 ART Planning Complete\n\n`;
    message += `**Program Increment**: ${plan.piId || 'Current PI'}\n`;
    message += `**Team**: ${plan.teamId || command.context.teamName || 'Unknown'}\n`;
    message += `**Iterations**: ${plan.iterations || 6}\n`;
    message += `**Readiness Score**: ${this.formatScore(plan.readinessScore)}\n\n`;

    if (plan.summary) {
      message += `### 📊 Planning Summary\n\n`;
      message += this.formatPlanSummary(plan.summary);
    }

    if (plan.iterations && Array.isArray(plan.iterations)) {
      message += `### 🔄 Iteration Breakdown\n\n`;
      message += this.formatIterations(plan.iterations);
    }

    if (this.options.includeNextSteps) {
      message += `### 🎯 Next Steps\n\n`;
      message += `1. Review the iteration allocations\n`;
      message += `2. Validate dependencies are properly sequenced\n`;
      message += `3. Confirm team capacity matches allocation\n`;
      message += `4. Begin sprint planning for Iteration 1\n`;
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format story decomposition response
   */
  private formatDecompositionResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;
    const decomposition = data.decomposition;

    let message = `## 📝 Story Decomposition Complete\n\n`;
    message += `**Original Story**: ${decomposition.originalStoryId}\n`;
    message += `**Target Size**: ${decomposition.targetSize} points\n`;
    message += `**Sub-stories Created**: ${decomposition.subStories?.length || 0}\n\n`;

    if (decomposition.subStories && decomposition.subStories.length > 0) {
      message += `### 📋 Decomposed Stories\n\n`;
      message += this.formatSubStories(decomposition.subStories);
    }

    if (decomposition.dependencies) {
      message += `### 🔗 Dependencies\n\n`;
      message += this.formatDependencies(decomposition.dependencies);
    }

    if (this.options.includeNextSteps) {
      message += `### 🎯 Next Steps\n\n`;
      message += `1. Review and refine sub-story descriptions\n`;
      message += `2. Assign story points to each sub-story\n`;
      message += `3. Prioritize sub-stories for implementation\n`;
      message += `4. Create Linear issues for approved sub-stories\n`;
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format value analysis response
   */
  private formatValueAnalysisResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;
    const analysis = data.analysis;

    let message = `## 💎 Value Delivery Analysis\n\n`;
    message += `**Scope**: ${this.formatScope(analysis.scope)}\n`;
    message += `**Timeframe**: ${this.formatTimeframe(analysis.timeframe)}\n`;
    message += `**Value Score**: ${this.formatScore(analysis.valueScore)}\n\n`;

    if (analysis.breakdown) {
      message += `### 📊 Value Breakdown\n\n`;
      message += this.formatValueBreakdown(analysis.breakdown);
    }

    if (analysis.risks) {
      message += `### ⚠️ Risk Factors\n\n`;
      message += this.formatRisks(analysis.risks);
    }

    if (analysis.recommendations) {
      message += `### 💡 Recommendations\n\n`;
      message += this.formatRecommendations(analysis.recommendations);
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format dependency mapping response
   */
  private formatDependencyResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;
    const mapping = data.mapping;

    let message = `## 🔗 Dependency Mapping\n\n`;
    message += `**Starting Point**: ${mapping.fromId || 'All items'}\n`;
    message += `**Direction**: ${mapping.direction}\n`;
    message += `**Dependencies Found**: ${mapping.dependencies?.length || 0}\n\n`;

    if (mapping.graph) {
      message += `### 🕸️ Dependency Graph\n\n`;
      message += this.formatDependencyGraph(mapping.graph);
    }

    if (mapping.criticalPath) {
      message += `### 🚨 Critical Path\n\n`;
      message += this.formatCriticalPath(mapping.criticalPath);
    }

    if (mapping.blockers) {
      message += `### 🚧 Blockers Identified\n\n`;
      message += this.formatBlockers(mapping.blockers);
    }

    if (this.options.includeNextSteps) {
      message += `### 🎯 Next Steps\n\n`;
      message += `1. Address critical path dependencies first\n`;
      message += `2. Resolve identified blockers\n`;
      message += `3. Update Linear relationships\n`;
      message += `4. Monitor dependency health\n`;
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format status check response
   */
  private formatStatusResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;
    const status = data.status;

    let message = `## 📊 Status Report\n\n`;
    message += `**Scope**: ${this.formatScope(status.scope)}\n`;
    message += `**Health**: ${this.formatHealth(status.health)}\n`;
    message += `**As of**: ${new Date().toLocaleString()}\n\n`;

    if (status.metrics) {
      message += `### 📈 Key Metrics\n\n`;
      message += this.formatMetrics(status.metrics);
    }

    if (status.progress) {
      message += `### 📊 Progress Summary\n\n`;
      message += this.formatProgress(status.progress);
    }

    if (status.issues) {
      message += `### ⚠️ Issues & Alerts\n\n`;
      message += this.formatIssues(status.issues);
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format ART optimization response
   */
  private formatOptimizationResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;
    const optimization = data.optimization;

    let message = `## 🚀 ART Optimization Analysis\n\n`;
    message += `**Team**: ${optimization.teamId}\n`;
    message += `**PI**: ${optimization.piId}\n`;
    message += `**Improvements Found**: ${optimization.improvements?.length || 0}\n\n`;

    if (optimization.currentScore && optimization.optimizedScore) {
      message += `### 📊 Readiness Improvement\n\n`;
      message += `- **Current Score**: ${this.formatScore(optimization.currentScore)}\n`;
      message += `- **Optimized Score**: ${this.formatScore(optimization.optimizedScore)}\n`;
      message += `- **Improvement**: +${optimization.improvement}%\n\n`;
    }

    if (optimization.improvements && optimization.improvements.length > 0) {
      message += `### 💡 Optimization Recommendations\n\n`;
      optimization.improvements.forEach((improvement: any, index: number) => {
        message += `${index + 1}. **${improvement.title}**\n`;
        message += `   - Impact: ${improvement.impact}\n`;
        message += `   - Effort: ${improvement.effort}\n`;
        message += `   - ${improvement.description}\n\n`;
      });
    }

    if (this.options.includeNextSteps) {
      message += `### 🎯 Implementation Steps\n\n`;
      message += `1. Review high-impact optimizations\n`;
      message += `2. Prioritize based on effort vs. impact\n`;
      message += `3. Create implementation tasks\n`;
      message += `4. Track readiness improvement\n`;
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format story scoring response
   */
  private formatScoringResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;
    const scoring = data.scoring;

    let message = `## 🎯 Story Scoring Complete\n\n`;
    message += `**Story**: ${scoring.storyId}\n`;
    message += `**Story Points**: ${scoring.points || 'Not set'}\n`;
    message += `**WSJF Score**: ${scoring.wsjfScore || 'N/A'}\n\n`;

    if (scoring.breakdown) {
      message += `### 📊 WSJF Breakdown\n\n`;
      message += `- **User/Business Value**: ${scoring.breakdown.businessValue}\n`;
      message += `- **Time Criticality**: ${scoring.breakdown.timeCriticality}\n`;
      message += `- **Risk Reduction**: ${scoring.breakdown.riskReduction}\n`;
      message += `- **Opportunity Enablement**: ${scoring.breakdown.opportunityEnablement}\n`;
      message += `- **Job Size**: ${scoring.breakdown.jobSize}\n\n`;
    }

    if (scoring.recommendation) {
      message += `### 💡 Prioritization Recommendation\n\n`;
      message += scoring.recommendation + '\n\n';
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format help response
   */
  private formatHelpResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    const data = result.data;

    let message = `## 🤖 SAFe PULSE Commands\n\n`;
    message += `I understand the following commands:\n\n`;

    if (data.commands && Array.isArray(data.commands)) {
      data.commands.forEach((cmd: string) => {
        message += `- \`${cmd}\`\n`;
      });
    }

    message += `\n### 📝 Examples\n\n`;
    message += `- \`@saafepulse plan PI-2025-Q1\`\n`;
    message += `- \`@saafepulse decompose this story into 5 points\`\n`;
    message += `- \`@saafepulse analyze value for current sprint\`\n`;
    message += `- \`@saafepulse map dependencies upstream\`\n`;
    message += `- \`@saafepulse check status\`\n\n`;

    message += `### 💡 Tips\n\n`;
    message += `- I use context from the current issue when possible\n`;
    message += `- Specify parameters explicitly to override defaults\n`;
    message += `- Use natural language - I'll understand your intent\n`;

    return {
      success: true,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format error response
   */
  private formatErrorResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    let message = `## ❌ Command Execution Failed\n\n`;
    message += `**Command**: ${command.intent}\n`;
    message += `**Error**: ${result.error}\n\n`;

    if (result.metadata?.warnings && result.metadata.warnings.length > 0) {
      message += `### ⚠️ Warnings\n\n`;
      result.metadata.warnings.forEach(warning => {
        message += `- ${warning}\n`;
      });
      message += '\n';
    }

    message += `### 💡 Suggestions\n\n`;
    message += this.getErrorSuggestions(result.error || '', command.intent);

    if (this.options.includeMetadata && result.metadata?.executionId) {
      message += `\n---\n`;
      message += `_Execution ID: ${result.metadata.executionId}_\n`;
    }

    return {
      success: false,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format generic response
   */
  private formatGenericResponse(
    result: ExecutionResult,
    command: ParsedCommand
  ): AgentResponse {
    let message = `## ✅ Command Executed\n\n`;
    message += `**Command**: ${command.intent}\n`;
    message += `**Status**: ${result.success ? 'Success' : 'Failed'}\n\n`;

    if (result.data) {
      message += `### 📊 Results\n\n`;
      message += '```json\n';
      message += JSON.stringify(result.data, null, 2);
      message += '\n```\n';
    }

    if (this.options.includeMetadata) {
      message += this.formatMetadata(result);
    }

    return {
      success: result.success,
      message: this.truncateMessage(message)
    };
  }

  /**
   * Format metadata section
   */
  private formatMetadata(result: ExecutionResult): string {
    let metadata = '\n---\n';
    metadata += `_Execution time: ${result.executionTime}ms`;
    
    if (result.metadata?.executionId) {
      metadata += ` | ID: ${result.metadata.executionId}`;
    }
    
    if (result.metadata?.moduleVersion) {
      metadata += ` | Module: ${result.metadata.moduleVersion}`;
    }
    
    metadata += '_\n';
    
    return metadata;
  }

  /**
   * Format score with visual indicator
   */
  private formatScore(score: number): string {
    if (!score && score !== 0) return 'N/A';
    
    const percentage = Math.round(score * 100);
    let indicator = '';
    
    if (percentage >= 90) indicator = '🟢';
    else if (percentage >= 70) indicator = '🟡';
    else if (percentage >= 50) indicator = '🟠';
    else indicator = '🔴';
    
    return `${indicator} ${percentage}%`;
  }

  /**
   * Format health status
   */
  private formatHealth(health: string): string {
    const healthMap: Record<string, string> = {
      'good': '🟢 Good',
      'warning': '🟡 Warning',
      'critical': '🔴 Critical',
      'unknown': '⚪ Unknown'
    };
    
    return healthMap[health] || health;
  }

  /**
   * Format scope reference
   */
  private formatScope(scope: any): string {
    if (!scope) return 'All';
    
    if (typeof scope === 'string') return scope;
    
    if (scope.type && scope.name) {
      return `${scope.type}: ${scope.name}`;
    }
    
    return JSON.stringify(scope);
  }

  /**
   * Format timeframe
   */
  private formatTimeframe(timeframe: any): string {
    if (!timeframe) return 'Current';
    
    if (typeof timeframe === 'string') return timeframe;
    
    if (timeframe.type && timeframe.period) {
      return `${timeframe.type} ${timeframe.period}`;
    }
    
    return JSON.stringify(timeframe);
  }

  /**
   * Get error suggestions based on error type
   */
  private getErrorSuggestions(error: string, intent: CommandIntent): string {
    const suggestions: string[] = [];

    if (error.includes('timeout')) {
      suggestions.push('- Try with a smaller scope or fewer items');
      suggestions.push('- Check if the system is under heavy load');
    }

    if (error.includes('not found')) {
      suggestions.push('- Verify the ID is correct');
      suggestions.push('- Check if you have access to this resource');
    }

    if (error.includes('permission')) {
      suggestions.push('- Ensure you have the required permissions');
      suggestions.push('- Contact your administrator if needed');
    }

    // Intent-specific suggestions
    switch (intent) {
      case CommandIntent.ART_PLAN:
        suggestions.push('- Ensure PI and team IDs are valid');
        suggestions.push('- Check that work items exist for planning');
        break;
      
      case CommandIntent.STORY_DECOMPOSE:
        suggestions.push('- Verify the story ID exists');
        suggestions.push('- Check that the story has sufficient detail');
        break;
    }

    if (suggestions.length === 0) {
      suggestions.push('- Check the command syntax');
      suggestions.push('- Try `@saafepulse help` for available commands');
    }

    return suggestions.join('\n');
  }

  /**
   * Truncate message to fit Linear comment limit
   */
  private truncateMessage(message: string): string {
    if (message.length <= this.options.maxLength!) {
      return message;
    }

    const truncated = message.substring(0, this.options.maxLength! - 100);
    const lastNewline = truncated.lastIndexOf('\n');
    
    return truncated.substring(0, lastNewline) + '\n\n_[Response truncated due to length]_';
  }

  // Helper formatting methods (stubs for now)
  private formatPlanSummary(summary: any): string {
    return '- Planning details available\n';
  }

  private formatIterations(iterations: any[]): string {
    return `- ${iterations.length} iterations planned\n`;
  }

  private formatSubStories(subStories: any[]): string {
    return subStories.map((story, index) => 
      `${index + 1}. ${story.title || 'Sub-story ' + (index + 1)}\n`
    ).join('');
  }

  private formatDependencies(dependencies: any[]): string {
    return `- ${dependencies.length} dependencies identified\n`;
  }

  private formatValueBreakdown(breakdown: any): string {
    return '- Value breakdown available\n';
  }

  private formatRisks(risks: any[]): string {
    return risks.map(risk => `- ${risk}\n`).join('');
  }

  private formatRecommendations(recommendations: any[]): string {
    return recommendations.map((rec, index) => 
      `${index + 1}. ${rec}\n`
    ).join('');
  }

  private formatDependencyGraph(graph: any): string {
    return '- Dependency graph generated\n';
  }

  private formatCriticalPath(path: any[]): string {
    return `- Critical path: ${path.length} items\n`;
  }

  private formatBlockers(blockers: any[]): string {
    return blockers.map(blocker => `- ${blocker}\n`).join('');
  }

  private formatMetrics(metrics: any): string {
    return Object.entries(metrics).map(([key, value]) => 
      `- **${key}**: ${value}\n`
    ).join('');
  }

  private formatProgress(progress: any): string {
    return '- Progress tracking available\n';
  }

  private formatIssues(issues: any[]): string {
    return issues.map(issue => `- ${issue}\n`).join('');
  }
}