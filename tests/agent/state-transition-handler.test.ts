/**
 * State Transition Handler Tests (LIN-64)
 * 
 * Test suite for state transition business logic,
 * validation rules, and cascading updates.
 */

import { StateTransitionHandler, TransitionWorkItem, TransitionContext, WorkItemState } from '../../src/agent/state-transition-handler';
import { LinearClientWrapper } from '../../src/linear/client';
import { createDefaultConfig } from '../../src/agent/progress-config';

// Mock Linear client
jest.mock('../../src/linear/client');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('State Transition Handler', () => {
  let handler: StateTransitionHandler;
  let mockLinearClient: jest.Mocked<LinearClientWrapper>;
  let testContext: TransitionContext;

  beforeEach(() => {
    mockLinearClient = new LinearClientWrapper('test', 'test') as jest.Mocked<LinearClientWrapper>;
    const config = createDefaultConfig('test');
    handler = new StateTransitionHandler(mockLinearClient, config);
    
    testContext = {
      userId: 'user-1',
      teamId: 'team-1',
      reason: 'Test transition'
    };
  });

  describe('Valid State Transitions', () => {
    it('should allow valid forward transitions', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'Todo',
        type: 'Story'
      };

      // Mock successful execution
      jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(item, 'In Progress', testContext);

      expect(result.success).toBe(true);
      expect(result.fromState).toBe('Todo');
      expect(result.toState).toBe('In Progress');
      expect(result.violations).toHaveLength(0);
    });

    it('should allow backward transitions', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'In Progress',
        type: 'Story'
      };

      jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(item, 'Todo', testContext);

      expect(result.success).toBe(true);
      expect(result.fromState).toBe('In Progress');
      expect(result.toState).toBe('Todo');
    });

    it('should allow reopening done items', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'Done',
        type: 'Story'
      };

      jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(item, 'In Review', testContext);

      expect(result.success).toBe(true);
      expect(result.toState).toBe('In Review');
    });
  });

  describe('Invalid State Transitions', () => {
    it('should block invalid transitions', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'Backlog',
        type: 'Story'
      };

      const result = await handler.handleStateTransition(item, 'Done', testContext);

      expect(result.success).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations![0].rule).toBe('invalid-state-transition');
      expect(result.violations![0].severity).toBe('error');
    });

    it('should allow invalid transitions with force flag', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'Backlog',
        type: 'Story'
      };

      const forceContext = { ...testContext, force: true };

      jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(item, 'Done', forceContext);

      expect(result.success).toBe(true);
      expect(result.violations).toHaveLength(1); // Violation recorded but not blocking
    });
  });

  describe('Dependency Validation', () => {
    it('should block completion with incomplete dependencies', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'In Review',
        type: 'Story',
        dependencyIds: ['dep-1', 'dep-2']
      };

      // Mock incomplete dependencies
      jest.spyOn(handler as any, 'fetchDependencies').mockResolvedValue([
        { id: 'dep-1', state: 'Done', title: 'Completed Dep' },
        { id: 'dep-2', state: 'In Progress', title: 'Incomplete Dep' }
      ]);

      const result = await handler.handleStateTransition(item, 'Done', testContext);

      expect(result.success).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'incomplete-dependencies',
          severity: 'error'
        })
      );
    });

    it('should allow completion with all dependencies done', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'In Review',
        type: 'Story',
        dependencyIds: ['dep-1', 'dep-2']
      };

      // Mock complete dependencies
      jest.spyOn(handler as any, 'fetchDependencies').mockResolvedValue([
        { id: 'dep-1', state: 'Done', title: 'Completed Dep 1' },
        { id: 'dep-2', state: 'Done', title: 'Completed Dep 2' }
      ]);

      jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(item, 'Done', testContext);

      expect(result.success).toBe(true);
    });
  });

  describe('Blocker Validation', () => {
    it('should warn about active blockers when starting work', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'Todo',
        type: 'Story',
        blockedByIds: ['blocker-1']
      };

      // Mock active blocker
      jest.spyOn(handler as any, 'fetchDependencies').mockResolvedValue([
        { id: 'blocker-1', state: 'In Progress', title: 'Active Blocker' }
      ]);

      jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(item, 'In Progress', testContext);

      expect(result.success).toBe(true); // Warning doesn't block
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'active-blockers',
          severity: 'warning'
        })
      );
    });
  });

  describe('Epic State Management', () => {
    it('should block epic completion with incomplete children', async () => {
      const epic: TransitionWorkItem = {
        id: 'epic-1',
        title: 'Test Epic',
        state: 'In Progress',
        type: 'Epic',
        childIds: ['child-1', 'child-2']
      };

      // Mock incomplete children
      jest.spyOn(handler as any, 'fetchChildren').mockResolvedValue([
        { id: 'child-1', state: 'Done', title: 'Completed Child' },
        { id: 'child-2', state: 'In Progress', title: 'Incomplete Child' }
      ]);

      const result = await handler.handleStateTransition(epic, 'Done', testContext);

      expect(result.success).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'incomplete-epic-children',
          severity: 'error'
        })
      );
    });

    it('should allow epic completion with all children done', async () => {
      const epic: TransitionWorkItem = {
        id: 'epic-1',
        title: 'Test Epic',
        state: 'In Progress',
        type: 'Epic',
        childIds: ['child-1', 'child-2']
      };

      // Mock complete children
      jest.spyOn(handler as any, 'fetchChildren').mockResolvedValue([
        { id: 'child-1', state: 'Done', title: 'Completed Child 1' },
        { id: 'child-2', state: 'Done', title: 'Completed Child 2' }
      ]);

      jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(epic, 'Done', testContext);

      expect(result.success).toBe(true);
    });
  });

  describe('Parent State Updates', () => {
    it('should update parent to Done when all children are complete', async () => {
      const childItem: TransitionWorkItem = {
        id: 'child-1',
        title: 'Last Child',
        state: 'In Review',
        type: 'Story',
        parentId: 'epic-1'
      };

      const parentEpic: TransitionWorkItem = {
        id: 'epic-1',
        title: 'Parent Epic',
        state: 'In Progress',
        type: 'Epic',
        childIds: ['child-1', 'child-2']
      };

      // Mock parent and siblings
      jest.spyOn(handler as any, 'fetchWorkItem').mockResolvedValue(parentEpic);
      jest.spyOn(handler as any, 'fetchChildren').mockResolvedValue([
        { id: 'child-1', state: 'In Review', title: 'Last Child' }, // Will become Done
        { id: 'child-2', state: 'Done', title: 'Already Done Child' }
      ]);

      const executeTransitionSpy = jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(childItem, 'Done', testContext);

      expect(result.success).toBe(true);
      expect(result.cascadedUpdates).toHaveLength(1);
      expect(result.cascadedUpdates![0]).toEqual({
        itemId: 'epic-1',
        itemType: 'Epic',
        fromState: 'In Progress',
        toState: 'Done',
        reason: 'Auto-updated based on child item state change'
      });

      // Should execute transition for both child and parent
      expect(executeTransitionSpy).toHaveBeenCalledWith('child-1', 'Done');
      expect(executeTransitionSpy).toHaveBeenCalledWith('epic-1', 'Done');
    });

    it('should update parent to In Progress when child starts', async () => {
      const childItem: TransitionWorkItem = {
        id: 'child-1',
        title: 'Child Story',
        state: 'Todo',
        type: 'Story',
        parentId: 'epic-1'
      };

      const parentEpic: TransitionWorkItem = {
        id: 'epic-1',
        title: 'Parent Epic',
        state: 'Backlog',
        type: 'Epic',
        childIds: ['child-1']
      };

      jest.spyOn(handler as any, 'fetchWorkItem').mockResolvedValue(parentEpic);
      jest.spyOn(handler as any, 'fetchChildren').mockResolvedValue([
        { id: 'child-1', state: 'Todo', title: 'Child Story' }
      ]);

      const executeTransitionSpy = jest.spyOn(handler as any, 'executeTransition').mockResolvedValue(undefined);
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'commitTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(childItem, 'In Progress', testContext);

      expect(result.success).toBe(true);
      expect(result.cascadedUpdates).toHaveLength(1);
      expect(result.cascadedUpdates![0].toState).toBe('In Progress');

      expect(executeTransitionSpy).toHaveBeenCalledWith('epic-1', 'In Progress');
    });
  });

  describe('Transaction Management', () => {
    it('should rollback on failure', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Test Story',
        state: 'Todo',
        type: 'Story'
      };

      // Mock transaction failure
      jest.spyOn(handler as any, 'beginTransaction').mockResolvedValue('txn-1');
      jest.spyOn(handler as any, 'executeTransition').mockRejectedValue(new Error('Execution failed'));
      const rollbackSpy = jest.spyOn(handler as any, 'rollbackTransaction').mockResolvedValue(undefined);

      const result = await handler.handleStateTransition(item, 'In Progress', testContext);

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(rollbackSpy).toHaveBeenCalledWith('txn-1');
    });
  });

  describe('Subtask Validation', () => {
    it('should block completion with incomplete subtasks when configured', async () => {
      const item: TransitionWorkItem = {
        id: 'item-1',
        title: 'Parent Story',
        state: 'In Review',
        type: 'Story',
        subtaskIds: ['subtask-1', 'subtask-2']
      };

      // Mock incomplete subtasks
      jest.spyOn(handler as any, 'fetchChildren').mockResolvedValue([
        { id: 'subtask-1', state: 'Done', title: 'Completed Subtask' },
        { id: 'subtask-2', state: 'In Progress', title: 'Incomplete Subtask' }
      ]);

      const result = await handler.handleStateTransition(item, 'Done', testContext);

      expect(result.success).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          rule: 'incomplete-subtasks',
          severity: 'error'
        })
      );
    });
  });
});