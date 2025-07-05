/**
 * Simple Tests for LinearCycleManager (LIN-49)
 * Focus on constructor and basic functionality
 */

import { LinearCycleManager } from '../../../src/safe/linear-cycle-manager';

describe('LinearCycleManager Simple Tests', () => {
  let manager: LinearCycleManager;

  beforeEach(() => {
    manager = new LinearCycleManager('test-api-key');
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(LinearCycleManager);
    });

    it('should accept configuration', () => {
      const customManager = new LinearCycleManager('test-key', {
        cycleLengthDays: 15,
        cycleBufferDays: 2
      });
      expect(customManager).toBeDefined();
    });

    it('should use default configuration when no config provided', () => {
      const defaultManager = new LinearCycleManager('test-key');
      expect(defaultManager).toBeDefined();
    });
  });

  describe('basic functionality', () => {
    it('should be an instance of LinearCycleManager', () => {
      expect(manager).toBeInstanceOf(LinearCycleManager);
    });
  });
});