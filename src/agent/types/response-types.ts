/**
 * Response Type Definitions for Enhanced Response System (LIN-60)
 * 
 * Defines the types and interfaces for the professional response system
 * that provides context-aware, rich formatted responses.
 */

/**
 * Response context for analyzing and adapting responses
 */
export interface ResponseContext {
  user?: {
    id: string;
    name: string;
    role?: 'developer' | 'lead' | 'manager' | 'stakeholder';
    experienceLevel?: 'new' | 'intermediate' | 'experienced';
  };
  issue?: {
    id: string;
    identifier: string;
    type: 'Epic' | 'Feature' | 'Story' | 'Bug' | 'Task';
    state: string;
    priority: number;
    team?: {
      id: string;
      name: string;
    };
  };
  operation?: {
    type: string;
    complexity: 'simple' | 'complex' | 'long-running';
    startTime?: Date;
    estimatedDuration?: number;
  };
  command?: {
    intent: string;
    parameters: Record<string, any>;
    raw: string;
  };
  previousInteractions?: number;
}

/**
 * Context analysis result
 */
export interface ContextAnalysis {
  issueType: 'Epic' | 'Feature' | 'Story' | 'Bug' | 'Task' | 'Unknown';
  userRole: 'developer' | 'lead' | 'manager' | 'stakeholder';
  operationComplexity: 'simple' | 'complex' | 'long-running';
  teamContext: {
    size: number;
    experienceLevel: 'new' | 'intermediate' | 'experienced';
  };
  historicalContext: {
    previousInteractions: number;
    lastInteraction?: Date;
  };
  responseStyle: ResponseStyle;
}

/**
 * Response style configuration
 */
export interface ResponseStyle {
  detailLevel: 'minimal' | 'standard' | 'detailed';
  technicalDepth: 'basic' | 'intermediate' | 'advanced';
  includeExamples: boolean;
  includeLinks: boolean;
  tone: 'formal' | 'professional' | 'friendly';
}

/**
 * Enhanced response structure
 */
export interface EnhancedResponse {
  title: string;
  summary?: string;
  content: string;
  sections?: ResponseSection[];
  metadata: ResponseMetadata;
  actions?: ResponseAction[];
  links?: ResponseLink[];
  footer?: string;
}

/**
 * Response section for structured content
 */
export interface ResponseSection {
  heading: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'code' | 'metrics';
  collapsible?: boolean;
  icon?: string;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  generatedAt: Date;
  executionTime?: number;
  operationId?: string;
  responseType: ResponseType;
  version: string;
}

/**
 * Response action for interactive elements
 */
export interface ResponseAction {
  label: string;
  command: string;
  description?: string;
  type: 'primary' | 'secondary' | 'danger';
}

/**
 * Response link
 */
export interface ResponseLink {
  label: string;
  url: string;
  type: 'view' | 'edit' | 'download' | 'help';
  icon?: string;
}

/**
 * Response type enumeration
 */
export enum ResponseType {
  SUCCESS = 'success',
  ERROR = 'error',
  PROGRESS = 'progress',
  INFO = 'info',
  WARNING = 'warning',
  SUGGESTION = 'suggestion',
  REPORT = 'report'
}

/**
 * Progress update for long-running operations
 */
export interface ProgressUpdate {
  operationId: string;
  status: 'starting' | 'in-progress' | 'completing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  completedSteps: string[];
  remainingSteps: string[];
  estimatedTimeRemaining?: number; // seconds
  preliminaryResults?: any;
}

/**
 * Response template definition
 */
export interface ResponseTemplate {
  id: string;
  name: string;
  type: ResponseType;
  template: string;
  variables: TemplateVariable[];
  sections?: TemplateSection[];
  conditions?: TemplateCondition[];
}

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  formatter?: (value: any) => string;
}

/**
 * Template section definition
 */
export interface TemplateSection {
  name: string;
  condition?: string; // Expression to evaluate
  template: string;
  variables?: TemplateVariable[];
}

/**
 * Template condition
 */
export interface TemplateCondition {
  expression: string;
  trueTemplate?: string;
  falseTemplate?: string;
}

/**
 * Response options for customization
 */
export interface ResponseOptions {
  style?: Partial<ResponseStyle>;
  includeMetadata?: boolean;
  maxLength?: number;
  format?: 'markdown' | 'plain' | 'html';
  priority?: 'normal' | 'high' | 'urgent';
}

/**
 * Formatted response ready for delivery
 */
export interface FormattedResponse {
  content: string;
  format: 'markdown' | 'plain' | 'html';
  truncated: boolean;
  metadata?: ResponseMetadata;
}