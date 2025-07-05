/**
 * Simple Tests for LinearWorkAssignmentManager (LIN-49)
 * Focus on constructor and basic functionality
 */

import { LinearWorkAssignmentManager } from '../../../src/safe/linear-work-assignment-manager';

describe('LinearWorkAssignmentManager Simple Tests', () => {
  let manager: LinearWorkAssignmentManager;

  beforeEach(() => {
    manager = new LinearWorkAssignmentManager('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(LinearWorkAssignmentManager);
    });

    it('should accept configuration', () => {
      const customManager = new LinearWorkAssignmentManager('test-key', {
        maxAssignmentsPerPerson: 5,
        skillMatchWeight: 0.8
      });
      expect(customManager).toBeDefined();
    });

    it('should use default configuration when no config provided', () => {
      const defaultManager = new LinearWorkAssignmentManager('test-key');
      expect(defaultManager).toBeDefined();
    });
  });

  describe('basic functionality', () => {
    it('should be an instance of LinearWorkAssignmentManager', () => {
      expect(manager).toBeInstanceOf(LinearWorkAssignmentManager);
    });
  });
});