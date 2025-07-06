/**
 * State Transition Handler (LIN-64)
 * 
 * Manages work item state transitions with business rule validation,
 * parent-child relationships, and dependency management.
 */

import { LinearClientWrapper } from '../linear/client';
import { ProgressTrackerConfig } from './progress-config';
import * as logger from '../utils/logger';

/**
 * Work item state
 */
export type WorkItemState = 'Backlog' | 'Todo' | 'In Progress' | 'In Review' | 'Done' | 'Canceled';

/**
 * Transition context
 */
export interface TransitionContext {
  userId: string;
  teamId: string;
  reason?: string;
  force?: boolean;
}

/**
 * Transition result
 */
export interface TransitionResult {
  success: boolean;
  itemId: string;
  fromState: WorkItemState;
  toState: WorkItemState;
  cascadedUpdates?: CascadedUpdate[];
  violations?: BusinessRuleViolation[];
  rollbackPerformed?: boolean;
}

/**
 * Cascaded update
 */
export interface CascadedUpdate {
  itemId: string;
  itemType: string;
  fromState: WorkItemState;
  toState: WorkItemState;
  reason: string;
}

/**
 * Business rule violation
 */
export interface BusinessRuleViolation {
  rule: string;
  severity: 'warning' | 'error';
  message: string;
  recommendation?: string;
}

/**
 * Work item for state transitions
 */
export interface TransitionWorkItem {
  id: string;
  title: string;
  state: WorkItemState;
  type: 'Story' | 'Enabler' | 'Epic' | 'Feature';
  parentId?: string;
  childIds?: string[];
  dependencyIds?: string[];
  blockedByIds?: string[];
  subtaskIds?: string[];
}

/**
 * State transition handler with business logic
 */
export class StateTransitionHandler {
  constructor(
    private linearClient: LinearClientWrapper,
    private config: ProgressTrackerConfig
  ) {}
  
  /**
   * Handle state transition with validation and cascading
   */
  async handleStateTransition(
    item: TransitionWorkItem,
    newState: WorkItemState,
    context: TransitionContext
  ): Promise<TransitionResult> {
    const startTime = Date.now();
    const result: TransitionResult = {
      success: false,
      itemId: item.id,
      fromState: item.state,
      toState: newState,
      cascadedUpdates: [],
      violations: []
    };
    
    try {
      // Validate transition
      const validation = await this.validateTransition(item, newState, context);
      result.violations = validation.violations;
      
      if (!validation.isValid && !context.force) {
        logger.warn('State transition blocked by business rules', {
          itemId: item.id,
          violations: validation.violations
        });
        return result;
      }
      
      // Create transaction for rollback capability
      const transaction = await this.beginTransaction();
      
      try {
        // Execute primary transition
        await this.executeTransition(item.id, newState);
        
        // Handle cascading updates
        if (this.config.stateTransition.autoProgressParentEpics) {
          const parentUpdates = await this.updateParentStates(item, newState);
          result.cascadedUpdates?.push(...parentUpdates);
        }
        
        // Handle dependency validations
        if (this.config.stateTransition.requireDependencyCompletion) {
          const depValidation = await this.validateDependencies(item, newState);
          if (!depValidation.isValid) {
            throw new Error('Dependency validation failed');
          }
        }
        
        // Handle subtask requirements
        if (!this.config.stateTransition.allowIncompleteSubtasks) {
          const subtaskValidation = await this.validateSubtasks(item, newState);
          if (!subtaskValidation.isValid) {
            result.violations?.push(...subtaskValidation.violations);
            if (!context.force) {
              throw new Error('Subtask validation failed');
            }
          }
        }
        
        // Commit transaction
        await this.commitTransaction(transaction);
        result.success = true;
        
        // Log successful transition
        logger.info('State transition completed', {
          itemId: item.id,
          fromState: item.state,
          toState: newState,
          cascadedUpdates: result.cascadedUpdates?.length,
          duration: Date.now() - startTime
        });
        
      } catch (error) {
        // Rollback on failure
        await this.rollbackTransaction(transaction);
        result.rollbackPerformed = true;
        throw error;
      }
      
    } catch (error) {
      logger.error('State transition failed', {
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
      result.success = false;
    }
    
    return result;
  }
  
  /**
   * Validate state transition
   */
  private async validateTransition(
    item: TransitionWorkItem,
    newState: WorkItemState,
    context: TransitionContext
  ): Promise<{ isValid: boolean; violations: BusinessRuleViolation[] }> {
    const violations: BusinessRuleViolation[] = [];
    
    // Validate state flow
    if (!this.isValidStateTransition(item.state, newState)) {
      violations.push({
        rule: 'invalid-state-transition',
        severity: 'error',
        message: `Cannot transition from ${item.state} to ${newState}`,
        recommendation: 'Follow the standard workflow: Backlog → Todo → In Progress → In Review → Done'
      });
    }
    
    // Validate dependencies for Done state
    if (newState === 'Done' && this.config.stateTransition.requireDependencyCompletion) {
      const dependencies = await this.fetchDependencies(item.dependencyIds || []);
      const incompleteDeps = dependencies.filter(dep => dep.state !== 'Done' && dep.state !== 'Canceled');
      
      if (incompleteDeps.length > 0) {
        violations.push({
          rule: 'incomplete-dependencies',
          severity: 'error',
          message: `Cannot complete item with ${incompleteDeps.length} incomplete dependencies`,
          recommendation: 'Complete all dependencies before marking this item as Done'
        });
      }
    }
    
    // Validate blockers
    if (newState === 'In Progress' && item.blockedByIds && item.blockedByIds.length > 0) {
      const blockers = await this.fetchDependencies(item.blockedByIds);
      const activeBlockers = blockers.filter(blocker => blocker.state !== 'Done' && blocker.state !== 'Canceled');
      
      if (activeBlockers.length > 0) {
        violations.push({
          rule: 'active-blockers',
          severity: 'warning',
          message: `Item has ${activeBlockers.length} active blockers`,
          recommendation: 'Consider resolving blockers before starting work'
        });
      }
    }
    
    // Epic-specific validations
    if (item.type === 'Epic' && newState === 'Done') {
      const children = await this.fetchChildren(item.childIds || []);
      const incompleteChildren = children.filter(child => child.state !== 'Done' && child.state !== 'Canceled');
      
      if (incompleteChildren.length > 0 && !this.config.stateTransition.allowPartialEpicCompletion) {
        violations.push({
          rule: 'incomplete-epic-children',
          severity: 'error',
          message: `Epic has ${incompleteChildren.length} incomplete child items`,
          recommendation: 'Complete all child items before closing the epic'
        });
      }
    }
    
    return {
      isValid: violations.filter(v => v.severity === 'error').length === 0,
      violations
    };
  }
  
  /**
   * Check if state transition is valid
   */
  private isValidStateTransition(from: WorkItemState, to: WorkItemState): boolean {
    const validTransitions: Record<WorkItemState, WorkItemState[]> = {
      'Backlog': ['Todo', 'Canceled'],
      'Todo': ['In Progress', 'Backlog', 'Canceled'],
      'In Progress': ['In Review', 'Todo', 'Canceled'],
      'In Review': ['Done', 'In Progress', 'Canceled'],
      'Done': ['In Review'], // Allow reopening
      'Canceled': ['Backlog', 'Todo'] // Allow uncanceling
    };
    
    return validTransitions[from]?.includes(to) || false;
  }
  
  /**
   * Update parent states based on children
   */
  private async updateParentStates(
    item: TransitionWorkItem,
    newState: WorkItemState
  ): Promise<CascadedUpdate[]> {
    const updates: CascadedUpdate[] = [];
    
    if (!item.parentId) {
      return updates;
    }
    
    const parent = await this.fetchWorkItem(item.parentId);
    if (!parent) {
      return updates;
    }
    
    const siblings = await this.fetchChildren(parent.childIds || []);
    
    // Determine parent state based on children
    let parentNewState: WorkItemState | null = null;
    
    if (newState === 'Done') {
      // Check if all siblings are done
      const allDone = siblings.every(s => s.id === item.id ? true : s.state === 'Done' || s.state === 'Canceled');
      if (allDone && parent.state !== 'Done') {
        parentNewState = 'Done';
      }
    } else if (newState === 'In Progress') {
      // Parent should be at least in progress
      if (parent.state === 'Backlog' || parent.state === 'Todo') {
        parentNewState = 'In Progress';
      }
    } else if (newState === 'Canceled') {
      // Check if all siblings are canceled
      const allCanceled = siblings.every(s => s.id === item.id ? true : s.state === 'Canceled');
      if (allCanceled && parent.state !== 'Canceled') {
        parentNewState = 'Canceled';
      }
    }
    
    // Execute parent update if needed
    if (parentNewState) {
      try {
        await this.executeTransition(parent.id, parentNewState);
        updates.push({
          itemId: parent.id,
          itemType: parent.type,
          fromState: parent.state,
          toState: parentNewState,
          reason: `Auto-updated based on child item state change`
        });
        
        // Recursively update grandparents
        const grandparentUpdates = await this.updateParentStates(parent, parentNewState);
        updates.push(...grandparentUpdates);
      } catch (error) {
        logger.error('Failed to update parent state', {
          parentId: parent.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return updates;
  }
  
  /**
   * Validate dependencies
   */
  private async validateDependencies(
    item: TransitionWorkItem,
    newState: WorkItemState
  ): Promise<{ isValid: boolean; violations: BusinessRuleViolation[] }> {
    if (newState !== 'Done' || !item.dependencyIds || item.dependencyIds.length === 0) {
      return { isValid: true, violations: [] };
    }
    
    const dependencies = await this.fetchDependencies(item.dependencyIds);
    const incompleteDeps = dependencies.filter(dep => dep.state !== 'Done' && dep.state !== 'Canceled');
    
    if (incompleteDeps.length > 0) {
      return {
        isValid: false,
        violations: [{
          rule: 'dependency-validation',
          severity: 'error',
          message: `${incompleteDeps.length} dependencies must be completed first`,
          recommendation: incompleteDeps.map(dep => dep.title).join(', ')
        }]
      };
    }
    
    return { isValid: true, violations: [] };
  }
  
  /**
   * Validate subtasks
   */
  private async validateSubtasks(
    item: TransitionWorkItem,
    newState: WorkItemState
  ): Promise<{ isValid: boolean; violations: BusinessRuleViolation[] }> {
    if (newState !== 'Done' || !item.subtaskIds || item.subtaskIds.length === 0) {
      return { isValid: true, violations: [] };
    }
    
    const subtasks = await this.fetchChildren(item.subtaskIds);
    const incompleteSubtasks = subtasks.filter(task => task.state !== 'Done' && task.state !== 'Canceled');
    
    if (incompleteSubtasks.length > 0) {
      return {
        isValid: false,
        violations: [{
          rule: 'incomplete-subtasks',
          severity: 'error',
          message: `${incompleteSubtasks.length} subtasks must be completed first`,
          recommendation: 'Complete all subtasks before marking parent as Done'
        }]
      };
    }
    
    return { isValid: true, violations: [] };
  }
  
  // Transaction management (simplified for this implementation)
  private async beginTransaction(): Promise<string> {
    return `txn_${Date.now()}`;
  }
  
  private async commitTransaction(transactionId: string): Promise<void> {
    logger.debug('Transaction committed', { transactionId });
  }
  
  private async rollbackTransaction(transactionId: string): Promise<void> {
    logger.warn('Transaction rolled back', { transactionId });
  }
  
  // Linear API helpers (would use actual Linear client in production)
  private async executeTransition(itemId: string, newState: WorkItemState): Promise<void> {
    // In production, this would call Linear API
    logger.info('Executing state transition', { itemId, newState });
  }
  
  private async fetchWorkItem(itemId: string): Promise<TransitionWorkItem | null> {
    // In production, this would fetch from Linear
    return null;
  }
  
  private async fetchChildren(childIds: string[]): Promise<TransitionWorkItem[]> {
    // In production, this would fetch from Linear
    return [];
  }
  
  private async fetchDependencies(dependencyIds: string[]): Promise<TransitionWorkItem[]> {
    // In production, this would fetch from Linear
    return [];
  }
}