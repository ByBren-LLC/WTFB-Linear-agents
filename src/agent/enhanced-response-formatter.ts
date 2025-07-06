/**
 * Enhanced Response Formatter for Enhanced Response System (LIN-60)
 * 
 * Provides rich, context-aware formatting for all agent responses
 * with visual indicators, structured content, and actionable elements.
 */

import {
  EnhancedResponse,
  ResponseSection,
  ResponseAction,
  ResponseLink,
  ResponseType,
  ResponseMetadata,
  FormattedResponse,
  ContextAnalysis
} from './types/response-types';
import { ExecutionResult } from '../types/agent-types';
import { BehaviorResult } from '../agent/types/autonomous-types';
import * as logger from '../utils/logger';

/**
 * Result type union for formatting
 */
type FormatResult = ExecutionResult | BehaviorResult | any;

/**
 * Enhanced formatter for rich responses
 */
export class EnhancedResponseFormatter {
  private readonly maxResponseLength = 4000; // Linear comment limit
  private readonly version = '1.0.0';

  /**
   * Format ART planning result
   */
  formatARTPlanningResult(
    result: any,
    analysis: ContextAnalysis
  ): EnhancedResponse {
    const title = '🎯 ART Planning Complete';
    
    const summary = this.generateARTSummary(result);
    
    const sections: ResponseSection[] = [
      {
        heading: '📊 Key Results',
        content: this.formatARTMetrics(result),
        type: 'metrics',
        icon: '📊'
      },
      {
        heading: '🎯 Highlights',
        content: this.formatARTHighlights(result),
        type: 'success',
        icon: '🎯'
      }
    ];

    // Add detailed sections for technical users
    if (analysis.responseStyle.technicalDepth === 'advanced') {
      sections.push({
        heading: '🔍 Detailed Analysis',
        content: this.formatDetailedARTAnalysis(result),
        type: 'info',
        collapsible: true,
        icon: '🔍'
      });
    }

    const actions = this.generateARTActions(result);
    const links = this.generateARTLinks(result);

    return {
      title,
      summary,
      content: this.buildMainContent(result, analysis),
      sections,
      metadata: this.createMetadata(ResponseType.SUCCESS, result),
      actions,
      links,
      footer: this.generateFooter(result)
    };
  }

  /**
   * Format error response with guidance
   */
  formatErrorResponse(
    error: any,
    context: any,
    analysis: ContextAnalysis
  ): EnhancedResponse {
    const title = '⚠️ Operation Encountered an Issue';
    
    const problem = this.explainProblem(error);
    const suggestions = this.generateErrorSuggestions(error, context);
    
    const sections: ResponseSection[] = [
      {
        heading: '🔍 What Happened',
        content: this.explainError(error, analysis),
        type: 'error',
        icon: '🔍'
      }
    ];

    // Add suggestions if available
    if (suggestions.length > 0) {
      sections.push({
        heading: '💡 Suggested Solutions',
        content: this.formatSuggestions(suggestions),
        type: 'info',
        icon: '💡'
      });
    }

    // Add technical details for developers
    if (analysis.responseStyle.technicalDepth !== 'basic' && error.stack) {
      sections.push({
        heading: '🔧 Technical Details',
        content: this.formatTechnicalError(error),
        type: 'code',
        collapsible: true,
        icon: '🔧'
      });
    }

    const actions = this.generateErrorActions(error, context);
    const links = this.generateSupportLinks(error);

    return {
      title,
      summary: problem,
      content: this.buildErrorContent(error, analysis),
      sections,
      metadata: this.createMetadata(ResponseType.ERROR, { error }),
      actions,
      links,
      footer: this.generateErrorFooter(error)
    };
  }

  /**
   * Format autonomous behavior suggestion
   */
  formatBehaviorSuggestion(
    behavior: string,
    analysis: any,
    context: ContextAnalysis
  ): EnhancedResponse {
    const title = this.getBehaviorTitle(behavior);
    const summary = this.getBehaviorSummary(behavior, analysis);

    const sections: ResponseSection[] = [
      {
        heading: '📊 Analysis',
        content: this.formatBehaviorAnalysis(analysis),
        type: 'info',
        icon: '📊'
      },
      {
        heading: '💡 Recommendations',
        content: this.formatBehaviorRecommendations(behavior, analysis),
        type: 'success',
        icon: '💡'
      }
    ];

    // Add detailed explanation for new users
    if (context.responseStyle.detailLevel === 'detailed') {
      sections.push({
        heading: '📚 Why This Matters',
        content: this.explainBehaviorBenefit(behavior, analysis),
        type: 'info',
        collapsible: true,
        icon: '📚'
      });
    }

    const actions = this.generateBehaviorActions(behavior, analysis);

    return {
      title,
      summary,
      content: this.buildBehaviorContent(behavior, analysis, context),
      sections,
      metadata: this.createMetadata(ResponseType.SUGGESTION, { behavior, analysis }),
      actions,
      footer: this.generateBehaviorFooter(behavior)
    };
  }

  /**
   * Format command execution result
   */
  formatCommandResult(
    command: string,
    result: ExecutionResult,
    analysis: ContextAnalysis
  ): EnhancedResponse {
    const formatter = this.selectCommandFormatter(command);
    return formatter(result, analysis);
  }

  /**
   * Build main content based on context
   */
  private buildMainContent(result: any, analysis: ContextAnalysis): string {
    if (analysis.responseStyle.detailLevel === 'minimal') {
      return this.generateMinimalContent(result);
    }

    if (analysis.responseStyle.detailLevel === 'detailed') {
      return this.generateDetailedContent(result);
    }

    return this.generateStandardContent(result);
  }

  /**
   * Generate ART summary
   */
  private generateARTSummary(result: any): string {
    const pi = result.programIncrement || 'Unknown PI';
    const teams = result.teams?.length || 0;
    const items = result.totalItems || 0;
    const score = result.valueDeliveryScore || 0;

    return `Successfully planned ${pi} with ${teams} teams and ${items} work items. ` +
           `Achieved ${score}% value delivery score.`;
  }

  /**
   * Format ART metrics
   */
  private formatARTMetrics(result: any): string {
    const metrics = [
      `- **Value Delivery Score**: ${result.valueDeliveryScore || 0}% ${this.getTrendIndicator(result.valueDeliveryTrend)}`,
      `- **ART Readiness**: ${result.artReadiness || 0}% (${this.getReadinessLabel(result.artReadiness)})`,
      `- **Capacity Utilization**: ${result.capacityUtilization || 0}% (${this.getUtilizationLabel(result.capacityUtilization)})`,
      `- **Risk Level**: ${result.riskLevel || 'Unknown'} ${this.getRiskIcon(result.riskLevel)}`
    ];

    return metrics.join('\n');
  }

  /**
   * Format ART highlights
   */
  private formatARTHighlights(result: any): string {
    const highlights = [];

    if (result.highPriorityAllocated) {
      highlights.push('✅ All high-priority features allocated to early iterations');
    }
    if (result.dependenciesResolved > 0) {
      highlights.push(`⚡ ${result.dependenciesResolved} dependency conflicts resolved automatically`);
    }
    if (result.capacityImprovement > 0) {
      highlights.push(`📈 ${result.capacityImprovement}% improvement in capacity utilization`);
    }
    if (result.stretchObjectives > 0) {
      highlights.push(`🎯 ${result.stretchObjectives} stretch objectives identified`);
    }

    return highlights.join('\n') || '- Planning completed successfully';
  }

  /**
   * Generate ART actions
   */
  private generateARTActions(result: any): ResponseAction[] {
    const actions: ResponseAction[] = [];

    if (result.needsReview) {
      actions.push({
        label: 'Review Allocation',
        command: '@saafepulse review allocation',
        description: 'Review the proposed allocation with team leads',
        type: 'primary'
      });
    }

    if (result.hasUnresolvedDependencies) {
      actions.push({
        label: 'Resolve Dependencies',
        command: '@saafepulse resolve dependencies',
        description: 'Address remaining dependency conflicts',
        type: 'secondary'
      });
    }

    actions.push({
      label: 'Schedule PI Planning',
      command: '@saafepulse schedule pi planning',
      description: 'Schedule the PI planning meeting',
      type: 'secondary'
    });

    return actions;
  }

  /**
   * Generate ART links
   */
  private generateARTLinks(result: any): ResponseLink[] {
    const links: ResponseLink[] = [];

    if (result.planUrl) {
      links.push({
        label: '📊 View Full ART Plan',
        url: result.planUrl,
        type: 'view',
        icon: '📊'
      });
    }

    if (result.optimizationReportUrl) {
      links.push({
        label: '📈 Optimization Report',
        url: result.optimizationReportUrl,
        type: 'view',
        icon: '📈'
      });
    }

    if (result.dependencyMapUrl) {
      links.push({
        label: '🔄 Dependency Map',
        url: result.dependencyMapUrl,
        type: 'view',
        icon: '🔄'
      });
    }

    return links;
  }

  /**
   * Create response metadata
   */
  private createMetadata(type: ResponseType, data?: any): ResponseMetadata {
    return {
      generatedAt: new Date(),
      executionTime: data?.executionTime,
      operationId: data?.operationId,
      responseType: type,
      version: this.version
    };
  }

  /**
   * Generate footer based on context
   */
  private generateFooter(result: any): string {
    const time = result.executionTime 
      ? ` in ${(result.executionTime / 1000).toFixed(1)} seconds`
      : '';
    
    return `Generated by @saafepulse${time} | Need help? Try \`@saafepulse help\``;
  }

  /**
   * Generate error footer
   */
  private generateErrorFooter(error: any): string {
    const errorId = error.id || `ERR-${Date.now()}`;
    return `Error ID: ${errorId} | Generated by @saafepulse`;
  }

  /**
   * Format response to final output
   */
  formatToOutput(response: EnhancedResponse, format: 'markdown' | 'plain' = 'markdown'): FormattedResponse {
    let content = '';

    // Add title
    content += `# ${response.title}\n\n`;

    // Add summary if present
    if (response.summary) {
      content += `${response.summary}\n\n`;
    }

    // Add main content
    if (response.content) {
      content += `${response.content}\n\n`;
    }

    // Add sections
    for (const section of response.sections || []) {
      content += `## ${section.icon || ''} ${section.heading}\n`;
      content += `${section.content}\n\n`;
    }

    // Add actions if present
    if (response.actions && response.actions.length > 0) {
      content += '## 🚀 Quick Actions\n';
      for (const action of response.actions) {
        content += `- **${action.label}**: \`${action.command}\``;
        if (action.description) {
          content += ` - ${action.description}`;
        }
        content += '\n';
      }
      content += '\n';
    }

    // Add links if present
    if (response.links && response.links.length > 0) {
      const linkTexts = response.links.map(link => `[${link.label}](${link.url})`);
      content += linkTexts.join(' | ') + '\n\n';
    }

    // Add footer
    if (response.footer) {
      content += '---\n';
      content += `*${response.footer}*`;
    }

    // Truncate if needed
    const truncated = content.length > this.maxResponseLength;
    if (truncated) {
      content = content.substring(0, this.maxResponseLength - 100) + 
                '\n\n... *Response truncated due to length*';
    }

    return {
      content,
      format,
      truncated,
      metadata: response.metadata
    };
  }

  // Helper methods
  private getTrendIndicator(trend?: string): string {
    if (!trend) return '';
    return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  }

  private getReadinessLabel(readiness?: number): string {
    if (!readiness) return 'Unknown';
    if (readiness >= 90) return 'Excellent';
    if (readiness >= 80) return 'Good';
    if (readiness >= 70) return 'Fair';
    return 'Needs Attention';
  }

  private getUtilizationLabel(utilization?: number): string {
    if (!utilization) return 'Unknown';
    if (utilization >= 95) return 'Over-allocated';
    if (utilization >= 85) return 'Optimal';
    if (utilization >= 70) return 'Good';
    return 'Under-utilized';
  }

  private getRiskIcon(risk?: string): string {
    if (!risk) return '';
    const icons: Record<string, string> = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🔴',
      'critical': '🚨'
    };
    return icons[risk.toLowerCase()] || '';
  }

  // Stub methods for various formatters (would be implemented with full logic)
  private generateMinimalContent(result: any): string {
    return 'Operation completed successfully.';
  }

  private generateStandardContent(result: any): string {
    return 'Operation completed with standard details.';
  }

  private generateDetailedContent(result: any): string {
    return 'Operation completed with comprehensive details.';
  }

  private formatDetailedARTAnalysis(result: any): string {
    return 'Detailed technical analysis of ART planning results.';
  }

  private explainProblem(error: any): string {
    return error.message || 'An unexpected error occurred.';
  }

  private generateErrorSuggestions(error: any, context: any): string[] {
    return ['Check your input parameters', 'Verify system connectivity', 'Try again in a few moments'];
  }

  private explainError(error: any, analysis: ContextAnalysis): string {
    return `The operation failed due to: ${error.message}`;
  }

  private formatSuggestions(suggestions: string[]): string {
    return suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }

  private formatTechnicalError(error: any): string {
    return `\`\`\`\n${error.stack || error.toString()}\n\`\`\``;
  }

  private buildErrorContent(error: any, analysis: ContextAnalysis): string {
    return `The ${error.operation || 'operation'} could not be completed.`;
  }

  private generateErrorActions(error: any, context: any): ResponseAction[] {
    return [{
      label: 'Retry Operation',
      command: '@saafepulse retry',
      type: 'primary'
    }];
  }

  private generateSupportLinks(error: any): ResponseLink[] {
    return [{
      label: '💬 Contact Support',
      url: 'https://support.example.com',
      type: 'help'
    }];
  }

  private getBehaviorTitle(behavior: string): string {
    const titles: Record<string, string> = {
      'story_monitoring': '🤖 Proactive Suggestion: Story Decomposition',
      'art_health': '📊 ART Health Alert',
      'dependency_detection': '🔗 Dependency Detected',
      'workflow_automation': '⚡ Workflow Automation'
    };
    return titles[behavior] || '🤖 Proactive Suggestion';
  }

  private getBehaviorSummary(behavior: string, analysis: any): string {
    return `Based on my analysis, I have a suggestion to improve your workflow.`;
  }

  private formatBehaviorAnalysis(analysis: any): string {
    return 'Analysis details here.';
  }

  private formatBehaviorRecommendations(behavior: string, analysis: any): string {
    return 'Recommendations here.';
  }

  private explainBehaviorBenefit(behavior: string, analysis: any): string {
    return 'Benefits explanation here.';
  }

  private buildBehaviorContent(behavior: string, analysis: any, context: ContextAnalysis): string {
    return 'Behavior suggestion content here.';
  }

  private generateBehaviorActions(behavior: string, analysis: any): ResponseAction[] {
    return [{
      label: 'Apply Suggestion',
      command: '@saafepulse apply',
      type: 'primary'
    }];
  }

  private generateBehaviorFooter(behavior: string): string {
    return `Proactive suggestion by @saafepulse | Disable: \`@saafepulse config disable ${behavior}\``;
  }

  private selectCommandFormatter(command: string): (result: any, analysis: ContextAnalysis) => EnhancedResponse {
    // Would return specific formatters for different commands
    return this.formatGenericCommandResult.bind(this);
  }

  private formatGenericCommandResult(result: any, analysis: ContextAnalysis): EnhancedResponse {
    return {
      title: '✅ Command Executed',
      content: 'Command completed successfully.',
      metadata: this.createMetadata(ResponseType.SUCCESS, result)
    };
  }
}