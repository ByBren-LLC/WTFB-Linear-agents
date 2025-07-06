/**
 * Response Template Engine for Enhanced Response System (LIN-60)
 * 
 * Manages response templates and renders them with dynamic content
 * for professional, context-aware agent communications.
 */

import {
  ResponseTemplate,
  TemplateVariable,
  TemplateSection,
  ResponseType,
  ResponseContext,
  ContextAnalysis
} from './types/response-types';
import * as logger from '../utils/logger';

/**
 * Template registry for managing response templates
 */
export class ResponseTemplateEngine {
  private templates: Map<string, ResponseTemplate> = new Map();
  private templatesByType: Map<ResponseType, ResponseTemplate[]> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Register a response template
   */
  registerTemplate(template: ResponseTemplate): void {
    this.templates.set(template.id, template);
    
    const typeTemplates = this.templatesByType.get(template.type) || [];
    typeTemplates.push(template);
    this.templatesByType.set(template.type, typeTemplates);

    logger.info('Registered response template', {
      templateId: template.id,
      templateType: template.type
    });
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): ResponseTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Select appropriate template based on context
   */
  selectTemplate(
    type: ResponseType,
    operation: string,
    analysis: ContextAnalysis
  ): ResponseTemplate | null {
    const templateId = this.buildTemplateId(type, operation);
    let template = this.templates.get(templateId);

    if (!template) {
      // Fallback to type-based template
      const typeTemplates = this.templatesByType.get(type) || [];
      template = typeTemplates.find(t => t.id.includes('default')) || typeTemplates[0];
    }

    if (!template) {
      logger.warn('No template found for operation', { type, operation });
      return null;
    }

    return template;
  }

  /**
   * Render template with provided data
   */
  renderTemplate(
    template: ResponseTemplate,
    data: Record<string, any>,
    context?: ResponseContext
  ): string {
    try {
      let content = template.template;

      // Replace variables
      if (template.variables) {
        for (const variable of template.variables) {
          const value = data[variable.name] ?? variable.defaultValue;
          const formattedValue = variable.formatter 
            ? variable.formatter(value)
            : this.formatValue(value, variable.type);
          
          const placeholder = `{{${variable.name}}}`;
          content = content.replace(new RegExp(placeholder, 'g'), formattedValue);
        }
      }

      // Process sections
      if (template.sections) {
        for (const section of template.sections) {
          if (this.evaluateCondition(section.condition, data)) {
            const sectionContent = this.renderSection(section, data);
            content = content.replace(`{{section:${section.name}}}`, sectionContent);
          } else {
            content = content.replace(`{{section:${section.name}}}`, '');
          }
        }
      }

      // Process conditions
      if (template.conditions) {
        for (const condition of template.conditions) {
          if (this.evaluateCondition(condition.expression, data)) {
            content = content.replace(
              `{{if:${condition.expression}}}`,
              condition.trueTemplate || ''
            );
          } else {
            content = content.replace(
              `{{if:${condition.expression}}}`,
              condition.falseTemplate || ''
            );
          }
        }
      }

      // Clean up any remaining placeholders
      content = content.replace(/{{[^}]+}}/g, '');

      return content.trim();
    } catch (error) {
      logger.error('Failed to render template', {
        templateId: template.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 'An error occurred while generating the response.';
    }
  }

  /**
   * Format value based on type
   */
  private formatValue(value: any, type: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'string':
        return String(value);
      
      case 'number':
        return this.formatNumber(value);
      
      case 'boolean':
        return value ? 'Yes' : 'No';
      
      case 'date':
        return this.formatDate(value);
      
      case 'array':
        return Array.isArray(value) ? value.join(', ') : String(value);
      
      case 'object':
        return JSON.stringify(value, null, 2);
      
      default:
        return String(value);
    }
  }

  /**
   * Format number with appropriate precision
   */
  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  /**
   * Format date in readable format
   */
  private formatDate(value: any): string {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Render a template section
   */
  private renderSection(section: TemplateSection, data: Record<string, any>): string {
    let content = section.template;

    // First process section-specific variables
    if (section.variables) {
      for (const variable of section.variables) {
        const value = data[variable.name] ?? variable.defaultValue;
        const formattedValue = variable.formatter 
          ? variable.formatter(value)
          : this.formatValue(value, variable.type);
        
        content = content.replace(
          new RegExp(`{{${variable.name}}}`, 'g'),
          formattedValue
        );
      }
    }

    // Then process any remaining variables from the data
    const variableMatches = content.match(/{{(\w+)}}/g);
    if (variableMatches) {
      for (const match of variableMatches) {
        const variableName = match.replace(/[{}]/g, '');
        if (data[variableName] !== undefined) {
          const value = this.formatValue(data[variableName], 'string');
          content = content.replace(new RegExp(`{{${variableName}}}`, 'g'), value);
        }
      }
    }

    return content;
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(
    condition: string | undefined,
    data: Record<string, any>
  ): boolean {
    if (!condition) {
      return true;
    }

    try {
      // Simple expression evaluation (can be enhanced)
      // Format: "variable operator value"
      const match = condition.match(/(\w+)\s*(===|!==|>|<|>=|<=)\s*(.+)/);
      if (!match) {
        return true;
      }

      const [, variable, operator, value] = match;
      const actualValue = data[variable];
      const expectedValue = this.parseValue(value);

      switch (operator) {
        case '===':
          return actualValue === expectedValue;
        case '!==':
          return actualValue !== expectedValue;
        case '>':
          return Number(actualValue) > Number(expectedValue);
        case '<':
          return Number(actualValue) < Number(expectedValue);
        case '>=':
          return Number(actualValue) >= Number(expectedValue);
        case '<=':
          return Number(actualValue) <= Number(expectedValue);
        default:
          return true;
      }
    } catch (error) {
      logger.warn('Failed to evaluate condition', { condition, error });
      return true;
    }
  }

  /**
   * Parse value from condition string
   */
  private parseValue(value: string): any {
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num)) {
      return num;
    }

    // Parse boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  }

  /**
   * Build template ID from type and operation
   */
  private buildTemplateId(type: ResponseType, operation: string): string {
    return `${type}_${operation.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // Success template
    this.registerTemplate({
      id: 'success_default',
      name: 'Default Success',
      type: ResponseType.SUCCESS,
      template: `# ✅ {{title}}

{{summary}}

{{content}}

{{section:details}}

{{section:nextSteps}}

---
*{{footer}}*`,
      variables: [
        { name: 'title', type: 'string', required: true },
        { name: 'summary', type: 'string', required: false },
        { name: 'content', type: 'string', required: true },
        { name: 'footer', type: 'string', required: false, defaultValue: 'Generated by @saafepulse' }
      ],
      sections: [
        {
          name: 'details',
          condition: 'hasDetails === true',
          template: `## 📊 Details
{{details}}`
        },
        {
          name: 'nextSteps',
          condition: 'hasNextSteps === true',
          template: `## 📋 Next Steps
{{nextSteps}}`
        }
      ]
    });

    // Error template
    this.registerTemplate({
      id: 'error_default',
      name: 'Default Error',
      type: ResponseType.ERROR,
      template: `# ⚠️ {{title}}

**Problem**: {{problem}}

## 🔍 What Happened
{{description}}

{{section:suggestions}}

{{section:quickActions}}

---
*Error ID: {{errorId}} | {{footer}}*`,
      variables: [
        { name: 'title', type: 'string', required: true },
        { name: 'problem', type: 'string', required: true },
        { name: 'description', type: 'string', required: true },
        { name: 'errorId', type: 'string', required: false, defaultValue: 'ERR-UNKNOWN' },
        { name: 'footer', type: 'string', required: false, defaultValue: 'Generated by @saafepulse' }
      ],
      sections: [
        {
          name: 'suggestions',
          condition: 'hasSuggestions === true',
          template: `## 💡 Suggested Solutions
{{suggestions}}`
        },
        {
          name: 'quickActions',
          condition: 'hasQuickActions === true',
          template: `## 🚀 Quick Actions
{{quickActions}}`
        }
      ]
    });

    // Progress template
    this.registerTemplate({
      id: 'progress_default',
      name: 'Default Progress',
      type: ResponseType.PROGRESS,
      template: `# ⏳ {{title}}

**Progress**: {{progress}}% complete  
**Status**: {{status}}  
**ETA**: {{eta}}

## ✅ Completed Steps
{{completedSteps}}

## 🔄 Current Step
{{currentStep}}

{{section:preliminaryResults}}

*This comment will be updated with final results...*`,
      variables: [
        { name: 'title', type: 'string', required: true },
        { name: 'progress', type: 'number', required: true },
        { name: 'status', type: 'string', required: true },
        { name: 'eta', type: 'string', required: false, defaultValue: 'Calculating...' },
        { name: 'completedSteps', type: 'string', required: true },
        { name: 'currentStep', type: 'string', required: true }
      ],
      sections: [
        {
          name: 'preliminaryResults',
          condition: 'hasPreliminaryResults === true',
          template: `## 📊 Preliminary Results
{{preliminaryResults}}`
        }
      ]
    });

    logger.info('Initialized default response templates');
  }
}