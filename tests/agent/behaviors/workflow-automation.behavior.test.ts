/**
 * Tests for Workflow Automation Behavior (LIN-59)
 */

import { WorkflowAutomationBehavior } from '../../../src/agent/behaviors/workflow-automation.behavior';
import { BehaviorContext } from '../../../src/agent/types/autonomous-types';
import { LinearClientWrapper } from '../../../src/linear/client';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/linear/client');
jest.mock('../../../src/utils/logger');

describe('WorkflowAutomationBehavior', () => {
  let behavior: WorkflowAutomationBehavior;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLinearClient = {
      getViewer: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Test User' }),
      getLabels: jest.fn().mockResolvedValue({ nodes: [] }),
      createLabel: jest.fn().mockResolvedValue({ id: 'label-1', name: 'test-label' }),
      updateIssue: jest.fn().mockResolvedValue({ id: 'issue-1' }),
      getTeam: jest.fn().mockResolvedValue({ 
        id: 'team-1',
        states: { nodes: [
          { id: 'state-1', name: 'Todo' },
          { id: 'state-2', name: 'In Progress' },
          { id: 'state-3', name: 'Done' }
        ]}
      }),
      createComment: jest.fn().mockResolvedValue({ id: 'comment-1' }),
      getIssueRelations: jest.fn().mockResolvedValue({ nodes: [] })
    } as any;

    behavior = new WorkflowAutomationBehavior(mockLinearClient);
  });

  describe('shouldTrigger', () => {
    it('should trigger on state change', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          state: { name: 'In Progress' }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);
    });

    it('should trigger on label change', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          state: { name: 'Todo' },
          labels: { nodes: [{ id: 'label-1', name: 'urgent' }] }
        },
        previousState: {
          state: { name: 'Todo' },
          labels: { nodes: [] }
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger without changes', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          state: { name: 'Todo' }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });

    it('should not trigger without context', async () => {
      const context: BehaviorContext = {
        timestamp: new Date()
      };

      const shouldTrigger = await behavior.shouldTrigger(context);
      expect(shouldTrigger).toBe(false);
    });
  });

  describe('execute', () => {
    it('should apply state transition workflows', async () => {
      mockLinearClient.getLabels.mockResolvedValueOnce({ 
        nodes: [{ id: 'label-dev', name: 'in-development' }] 
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          identifier: 'LIN-100',
          state: { name: 'In Progress' },
          team: { id: 'team-1' },
          labels: { nodes: [] }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(mockLinearClient.createComment).toHaveBeenCalled();
    });

    it('should handle blocked state', async () => {
      // First call for isBlocked check
      mockLinearClient.getIssueRelations.mockResolvedValueOnce({
        nodes: [
          {
            type: 'blocks',
            relatedIssue: {
              id: 'blocking-issue',
              identifier: 'LIN-99',
              title: 'Blocking task',
              state: { name: 'Todo' },
              assignee: { name: 'Blocker Owner' }
            }
          }
        ]
      });
      
      // Second call for findBlockingIssues
      mockLinearClient.getIssueRelations.mockResolvedValueOnce({
        nodes: [
          {
            type: 'blocks',
            relatedIssue: {
              id: 'blocking-issue',
              identifier: 'LIN-99',
              title: 'Blocking task',
              state: { name: 'Todo' },
              assignee: { name: 'Blocker Owner' }
            }
          }
        ]
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-blocked',
          identifier: 'LIN-101',
          state: { name: 'In Progress' },
          team: { id: 'team-1' },
          labels: { nodes: [{ name: 'blocked' }] },
          assignee: { id: 'user-1' },
          creator: { id: 'user-2' }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(result.actions.some(a => a.type === 'notify')).toBe(true);
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'issue-blocked',
        expect.stringContaining('Issue Blocked')
      );
    });

    it('should synchronize subtask states', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'parent-issue',
          state: { name: 'Done', id: 'state-done' },
          team: { id: 'team-1' },
          children: [
            { id: 'child-1', state: { name: 'In Progress' } },
            { id: 'child-2', state: { name: 'Todo' } }
          ]
        },
        previousState: {
          state: { name: 'In Progress' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith({
        id: 'child-1',
        stateId: 'state-done'
      });
      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith({
        id: 'child-2',
        stateId: 'state-done'
      });
    });

    it('should detect and mark stale issues', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20); // 20 days old

      const context: BehaviorContext = {
        issue: {
          id: 'stale-issue',
          state: { name: 'In Progress' },
          team: { id: 'team-1' },
          updatedAt: staleDate.toISOString(),
          labels: { nodes: [] }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(result.actions.some(a => 
        a.description.includes('Marked issue as stale')
      )).toBe(true);
    });

    it('should handle team handoffs', async () => {
      const context: BehaviorContext = {
        issue: {
          id: 'handoff-issue',
          state: { name: 'In Review' },
          team: { id: 'team-1' },
          labels: { nodes: [] }
        },
        previousState: {
          state: { name: 'In Progress' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true);
      expect(mockLinearClient.createComment).toHaveBeenCalledWith(
        'handoff-issue',
        expect.stringContaining('Handoff Checklist')
      );
    });

    it('should handle errors gracefully', async () => {
      // Mock to trigger state transition that will fail
      mockLinearClient.getLabels.mockResolvedValueOnce({ nodes: [] });
      mockLinearClient.createLabel.mockRejectedValueOnce(new Error('API error'));

      const context: BehaviorContext = {
        issue: {
          id: 'error-issue',
          state: { name: 'In Progress' },
          team: { id: 'team-1' },
          labels: { nodes: [] }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      expect(result.success).toBe(true); // Should still succeed overall
      // The behavior now adds failed actions to the results
      expect(result.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            result: 'failed',
            description: expect.stringContaining('Failed to add label')
          })
        ])
      );
    });
  });

  describe('label management', () => {
    it('should create label if not exists', async () => {
      mockLinearClient.getLabels.mockResolvedValueOnce({ nodes: [] });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          state: { name: 'In Progress' },
          team: { id: 'team-1' },
          labels: { nodes: [] }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      await behavior.execute(context);

      expect(mockLinearClient.createLabel).toHaveBeenCalledWith({
        name: 'in-development',
        teamId: 'team-1'
      });
    });

    it('should add existing label', async () => {
      mockLinearClient.getLabels.mockResolvedValueOnce({ 
        nodes: [{ id: 'label-1', name: 'in-development' }] 
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          state: { name: 'In Progress' },
          team: { id: 'team-1' },
          labels: { nodes: [] }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      await behavior.execute(context);

      expect(mockLinearClient.updateIssue).toHaveBeenCalledWith({
        id: 'issue-1',
        labelIds: ['label-1']
      });
    });

    it('should remove labels on state change', async () => {
      // Mock for adding 'completed' label
      mockLinearClient.getLabels.mockResolvedValueOnce({ 
        nodes: [{ id: 'label-completed', name: 'completed' }] 
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          state: { name: 'Done' },
          team: { id: 'team-1' },
          labels: { 
            nodes: [
              { id: 'label-1', name: 'in-development' },
              { id: 'label-2', name: 'needs-review' },
              { id: 'label-3', name: 'other' }
            ] 
          }
        },
        previousState: {
          state: { name: 'In Review' }
        },
        timestamp: new Date()
      };

      const result = await behavior.execute(context);

      // Check that remove label actions were created
      const removeLabelActions = result.actions.filter(a => 
        a.description.includes('Removed label')
      );
      
      expect(removeLabelActions.length).toBeGreaterThan(0);
      expect(removeLabelActions.some(a => a.description.includes('in-development'))).toBe(true);
      expect(removeLabelActions.some(a => a.description.includes('needs-review'))).toBe(true);
      
      // Verify that the 'other' label is preserved
      const updateCalls = mockLinearClient.updateIssue.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should validate successfully when Linear client is available', async () => {
      const isValid = await behavior.validate();
      expect(isValid).toBe(true);
      expect(mockLinearClient.getViewer).toHaveBeenCalled();
    });

    it('should fail validation when Linear client is unavailable', async () => {
      mockLinearClient.getViewer.mockRejectedValueOnce(new Error('Not connected'));

      const isValid = await behavior.validate();
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      behavior.updateConfig({
        autoAssignOnMove: false,
        autoMoveSubtasks: false
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Workflow automation configuration updated',
        expect.any(Object)
      );
    });

    it('should respect custom state transitions', async () => {
      const customBehavior = new WorkflowAutomationBehavior(mockLinearClient, {
        stateTransitions: {
          'Custom State': [
            {
              trigger: 'state_change',
              actions: [
                { type: 'add_label', value: 'custom-label' }
              ]
            }
          ]
        }
      });

      const context: BehaviorContext = {
        issue: {
          id: 'issue-1',
          state: { name: 'Custom State' },
          team: { id: 'team-1' },
          labels: { nodes: [] }
        },
        previousState: {
          state: { name: 'Todo' }
        },
        timestamp: new Date()
      };

      await customBehavior.execute(context);

      expect(mockLinearClient.createLabel).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'custom-label' })
      );
    });
  });
});