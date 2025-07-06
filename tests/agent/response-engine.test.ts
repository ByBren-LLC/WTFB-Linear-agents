/**
 * Unit tests for Enhanced Response Engine (LIN-60)
 */

import { EnhancedResponseEngine } from '../../src/agent/response-engine';
import { ResponseContext, ResponseType } from '../../src/agent/types/response-types';
import { ExecutionResult } from '../../src/agent/cli-executor';

// Mock dependencies
jest.mock('../../src/linear/client');
jest.mock('../../src/utils/logger');

describe('EnhancedResponseEngine', () => {
  let responseEngine: EnhancedResponseEngine;
  let mockLinearClient: any;

  beforeEach(() => {
    mockLinearClient = {
      createComment: jest.fn().mockResolvedValue({ id: 'comment-1' })
    };
    
    responseEngine = new EnhancedResponseEngine(mockLinearClient);
  });

  describe('generateCommandResponse', () => {
    const baseContext: ResponseContext = {
      user: {
        id: 'user-1',
        name: 'Test User',
        role: 'developer'
      },
      issue: {
        id: 'issue-1',
        identifier: 'TEST-123',
        type: 'Story',
        state: 'In Progress',
        priority: 2,
        team: {
          id: 'team-1',
          name: 'Test Team'
        }
      },
      operation: {
        type: 'ART_PLAN',
        complexity: 'complex',
        startTime: new Date()
      }
    };

    it('should generate success response with rich formatting', async () => {
      const result: ExecutionResult = {
        success: true,
        data: {
          plan: {
            piId: 'PI-2024-Q1',
            iterations: 5,
            readinessScore: 0.85,
            totalWorkItems: 50,
            totalStoryPoints: 200,
            capacityUtilization: 0.80,
            valueDeliveryConfidence: 0.90
          }
        },
        executionTime: 5000,
        command: 'art-plan',
        parameters: { piId: 'PI-2024-Q1' }
      };

      const response = await responseEngine.generateCommandResponse(baseContext, result);

      expect(response).toBeDefined();
      expect(response.type).toBe(ResponseType.SUCCESS);
      expect(response.markdown).toContain('ART Planning Complete');
      expect(response.markdown).toContain('PI-2024-Q1');
      expect(response.markdown).toContain('85%'); // readiness score
      expect(response.sections).toHaveLength(2); // results and metadata
    });

    it('should generate error response with helpful guidance', async () => {
      const result: ExecutionResult = {
        success: false,
        error: 'Invalid PI format',
        executionTime: 100,
        command: 'art-plan',
        parameters: { piId: 'invalid' }
      };

      const response = await responseEngine.generateCommandResponse(baseContext, result);

      expect(response.type).toBe(ResponseType.ERROR);
      expect(response.markdown).toContain('encountered an error');
      expect(response.markdown).toContain('Invalid PI format');
      expect(response.sections).toContainEqual(
        expect.objectContaining({ title: 'Error Details' })
      );
    });

    it('should adapt response style based on user role', async () => {
      const managerContext = {
        ...baseContext,
        user: { ...baseContext.user!, role: 'manager' as const }
      };

      const result: ExecutionResult = {
        success: true,
        data: { message: 'Test complete' },
        executionTime: 1000,
        command: 'test',
        parameters: {}
      };

      const response = await responseEngine.generateCommandResponse(managerContext, result);

      expect(response.metadata?.style).toBe('executive');
    });
  });

  describe('generateResponseWithProgress', () => {
    it('should handle progress tracking for long operations', async () => {
      const context: ResponseContext = {
        issue: { id: 'issue-1', identifier: 'TEST-123', type: 'Story', state: 'Open', priority: 2 },
        operation: { type: 'ART_PLAN', complexity: 'long-running', startTime: new Date() }
      };

      const operation = new Promise(resolve => {
        setTimeout(() => resolve({ success: true, data: {} }), 100);
      });

      const steps = [
        { name: 'Step 1', description: 'First step', estimatedDuration: 50 },
        { name: 'Step 2', description: 'Second step', estimatedDuration: 50 }
      ];

      const response = await responseEngine.generateResponseWithProgress(
        context,
        operation,
        steps
      );

      expect(response).toBeDefined();
      expect(mockLinearClient.createComment).toHaveBeenCalled();
    });
  });

  describe('caching', () => {
    it('should cache responses for identical contexts', async () => {
      const context: ResponseContext = {
        operation: { type: 'HELP', complexity: 'simple', startTime: new Date() }
      };

      const result: ExecutionResult = {
        success: true,
        data: { commands: ['test'] },
        executionTime: 10,
        command: 'help',
        parameters: {}
      };

      // First call
      const response1 = await responseEngine.generateCommandResponse(context, result);
      
      // Second call with same context
      const response2 = await responseEngine.generateCommandResponse(context, result);

      expect(response1.markdown).toBe(response2.markdown);
      
      const stats = responseEngine.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should not cache error responses', async () => {
      const context: ResponseContext = {
        operation: { type: 'TEST', complexity: 'simple', startTime: new Date() }
      };

      const result: ExecutionResult = {
        success: false,
        error: 'Test error',
        executionTime: 10,
        command: 'test',
        parameters: {}
      };

      await responseEngine.generateCommandResponse(context, result);
      await responseEngine.generateCommandResponse(context, result);

      const stats = responseEngine.getCacheStats();
      expect(stats.hits).toBe(0);
    });
  });

  describe('template rendering', () => {
    it('should properly render templates with variables', async () => {
      const templateEngine = (responseEngine as any).templateEngine;
      
      templateEngine.registerTemplate({
        id: 'test',
        name: 'Test Template',
        type: ResponseType.INFO,
        template: 'Hello {{name}}, your score is {{score}}%',
        variables: [
          { name: 'name', type: 'string', required: true },
          { name: 'score', type: 'number', required: true }
        ]
      });

      const rendered = templateEngine.renderTemplate(
        templateEngine.getTemplate('test'),
        { name: 'Test User', score: 95 }
      );

      expect(rendered).toBe('Hello Test User, your score is 95%');
    });

    it('should handle conditional sections', async () => {
      const templateEngine = (responseEngine as any).templateEngine;
      
      templateEngine.registerTemplate({
        id: 'conditional',
        name: 'Conditional Template',
        type: ResponseType.INFO,
        template: 'Base content',
        sections: [{
          name: 'extra',
          condition: 'showExtra === true',
          template: '\nExtra content: {{extraData}}'
        }]
      });

      const template = templateEngine.getTemplate('conditional');
      
      const withExtra = templateEngine.renderTemplate(
        template,
        { showExtra: true, extraData: 'test' }
      );
      expect(withExtra).toContain('Extra content: test');

      const withoutExtra = templateEngine.renderTemplate(
        template,
        { showExtra: false }
      );
      expect(withoutExtra).not.toContain('Extra content');
    });
  });
});