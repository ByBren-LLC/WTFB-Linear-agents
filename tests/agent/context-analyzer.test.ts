/**
 * Unit tests for Response Context Analyzer (LIN-60)
 */

import { ResponseContextAnalyzer } from '../../src/agent/context-analyzer';
import { ResponseContext } from '../../src/agent/types/response-types';

describe('ResponseContextAnalyzer', () => {
  let analyzer: ResponseContextAnalyzer;

  beforeEach(() => {
    analyzer = new ResponseContextAnalyzer();
  });

  describe('analyzeContext', () => {
    it('should analyze developer context correctly', () => {
      const context: ResponseContext = {
        user: {
          id: 'user-1',
          name: 'Dev User',
          role: 'developer'
        },
        issue: {
          id: 'issue-1',
          identifier: 'TEST-123',
          type: 'Story',
          state: 'In Progress',
          priority: 2
        },
        operation: {
          type: 'STORY_DECOMPOSE',
          complexity: 'complex',
          startTime: new Date()
        }
      };

      const analysis = analyzer.analyzeContext(context);

      expect(analysis.userExperience).toBe('intermediate');
      expect(analysis.communicationPreference).toBe('detailed');
      expect(analysis.urgencyLevel).toBe('normal');
      expect(analysis.contextualFactors).toContain('working_on_story');
    });

    it('should detect high urgency for critical issues', () => {
      const context: ResponseContext = {
        issue: {
          id: 'issue-1',
          identifier: 'BUG-911',
          type: 'Bug',
          state: 'Open',
          priority: 0 // Urgent
        },
        operation: {
          type: 'DEPENDENCY_MAP',
          complexity: 'complex',
          startTime: new Date()
        }
      };

      const analysis = analyzer.analyzeContext(context);

      expect(analysis.urgencyLevel).toBe('high');
      expect(analysis.contextualFactors).toContain('critical_issue');
    });

    it('should adapt for manager role', () => {
      const context: ResponseContext = {
        user: {
          id: 'user-1',
          name: 'Manager User',
          role: 'manager'
        },
        operation: {
          type: 'VALUE_ANALYZE',
          complexity: 'complex',
          startTime: new Date()
        }
      };

      const analysis = analyzer.analyzeContext(context);

      expect(analysis.userExperience).toBe('expert');
      expect(analysis.communicationPreference).toBe('summary');
    });
  });

  describe('selectResponseStyle', () => {
    it('should select technical style for developers', () => {
      const style = analyzer.selectResponseStyle({
        analysis: {
          userExperience: 'intermediate',
          communicationPreference: 'detailed',
          urgencyLevel: 'normal',
          contextualFactors: []
        },
        responseType: 'success',
        operationType: 'STORY_DECOMPOSE'
      });

      expect(style.tone).toBe('professional');
      expect(style.detailLevel).toBe('comprehensive');
      expect(style.useEmoji).toBe(true);
      expect(style.includeTechnicalDetails).toBe(true);
    });

    it('should select executive style for managers', () => {
      const style = analyzer.selectResponseStyle({
        analysis: {
          userExperience: 'expert',
          communicationPreference: 'summary',
          urgencyLevel: 'normal',
          contextualFactors: []
        },
        responseType: 'report',
        operationType: 'VALUE_ANALYZE'
      });

      expect(style.tone).toBe('executive');
      expect(style.detailLevel).toBe('summary');
      expect(style.includeMetrics).toBe(true);
      expect(style.emphasizeBusinessValue).toBe(true);
    });

    it('should adapt style for errors', () => {
      const style = analyzer.selectResponseStyle({
        analysis: {
          userExperience: 'beginner',
          communicationPreference: 'detailed',
          urgencyLevel: 'high',
          contextualFactors: []
        },
        responseType: 'error',
        operationType: 'ART_PLAN'
      });

      expect(style.tone).toBe('helpful');
      expect(style.includeExamples).toBe(true);
      expect(style.includeLinks).toBe(true);
    });
  });

  describe('contextual factors', () => {
    it('should detect PI planning context', () => {
      const context: ResponseContext = {
        operation: {
          type: 'ART_PLAN',
          complexity: 'long-running',
          startTime: new Date()
        },
        command: {
          intent: 'ART_PLAN',
          parameters: { piId: 'PI-2024-Q1' },
          raw: 'plan PI-2024-Q1'
        }
      };

      const analysis = analyzer.analyzeContext(context);

      expect(analysis.contextualFactors).toContain('pi_planning');
    });

    it('should detect team context', () => {
      const context: ResponseContext = {
        issue: {
          id: 'issue-1',
          identifier: 'TEST-123',
          type: 'Story',
          state: 'Open',
          priority: 2,
          team: {
            id: 'team-1',
            name: 'Platform Team'
          }
        },
        operation: {
          type: 'STATUS_CHECK',
          complexity: 'simple',
          startTime: new Date()
        }
      };

      const analysis = analyzer.analyzeContext(context);

      expect(analysis.contextualFactors).toContain('team_context');
    });
  });
});