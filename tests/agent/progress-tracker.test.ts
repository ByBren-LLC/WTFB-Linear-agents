/**
 * Unit tests for Progress Tracker (LIN-60)
 */

import { ProgressTracker } from '../../src/agent/progress-tracker';
import { ProgressUpdate } from '../../src/agent/types/response-types';

// Mock Linear client
jest.mock('../../src/linear/client');
jest.mock('../../src/utils/logger');

describe('ProgressTracker', () => {
  let progressTracker: ProgressTracker;
  let mockLinearClient: any;

  beforeEach(() => {
    mockLinearClient = {
      createComment: jest.fn().mockResolvedValue({ id: 'comment-1' }),
      updateComment: jest.fn().mockResolvedValue({ id: 'comment-1' })
    };
    
    progressTracker = new ProgressTracker(mockLinearClient);
  });

  describe('trackOperation', () => {
    it('should track simple operation without updates', async () => {
      const operation = Promise.resolve({ data: 'test' });
      const steps = [
        { name: 'Step 1', description: 'First step', estimatedDuration: 100 }
      ];

      const result = await progressTracker.trackOperation(
        'op-1',
        'issue-1',
        operation,
        steps
      );

      expect(result).toEqual({ data: 'test' });
      expect(mockLinearClient.createComment).not.toHaveBeenCalled();
    });

    it('should send updates for long operations', async () => {
      jest.useFakeTimers();
      
      const operation = new Promise(resolve => {
        setTimeout(() => resolve({ data: 'complete' }), 15000);
      });

      const steps = [
        { name: 'Fetching data', description: 'Getting work items', estimatedDuration: 5000 },
        { name: 'Processing', description: 'Analyzing data', estimatedDuration: 5000 },
        { name: 'Generating', description: 'Creating output', estimatedDuration: 5000 }
      ];

      const progressUpdates: ProgressUpdate[] = [];
      const trackingPromise = progressTracker.trackOperation(
        'op-2',
        'issue-2',
        operation,
        steps,
        (update) => progressUpdates.push(update)
      );

      // Advance time to trigger progress updates
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // Let promises settle

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].currentStep).toBe('Fetching data');
      expect(progressUpdates[0].progress).toBeGreaterThan(0);

      jest.advanceTimersByTime(13000);
      const result = await trackingPromise;

      expect(result).toEqual({ data: 'complete' });
      expect(mockLinearClient.createComment).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle operation errors gracefully', async () => {
      const operation = Promise.reject(new Error('Operation failed'));
      const steps = [
        { name: 'Step 1', description: 'Will fail', estimatedDuration: 1000 }
      ];

      await expect(
        progressTracker.trackOperation('op-3', 'issue-3', operation, steps)
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress based on elapsed time', () => {
      const tracker = progressTracker as any;
      
      const progress = tracker.calculateProgress(
        5000, // elapsed
        10000 // total estimated
      );

      expect(progress).toBe(50);
    });

    it('should cap progress at 95%', () => {
      const tracker = progressTracker as any;
      
      const progress = tracker.calculateProgress(
        15000, // elapsed
        10000 // total estimated
      );

      expect(progress).toBe(95);
    });
  });

  describe('progress formatting', () => {
    it('should format progress update for Linear', () => {
      const tracker = progressTracker as any;
      
      const formatted = tracker.formatProgressUpdate({
        operationId: 'op-1',
        currentStep: 'Processing data',
        progress: 60,
        description: 'Analyzing work items',
        startTime: new Date(),
        estimatedCompletion: new Date(Date.now() + 5000)
      });

      expect(formatted).toContain('Processing data');
      expect(formatted).toContain('60%');
      expect(formatted).toContain('Analyzing work items');
    });
  });

  describe('completion updates', () => {
    it('should send completion update', async () => {
      const tracker = progressTracker as any;
      
      await tracker.sendCompletionUpdate('issue-1', 'comment-1', {
        success: true,
        message: 'Operation completed successfully',
        duration: 10000
      });

      expect(mockLinearClient.updateComment).toHaveBeenCalledWith(
        'comment-1',
        expect.objectContaining({
          body: expect.stringContaining('completed successfully')
        })
      );
    });

    it('should handle completion update errors', async () => {
      mockLinearClient.updateComment.mockRejectedValueOnce(new Error('Update failed'));
      const tracker = progressTracker as any;
      
      // Should not throw
      await tracker.sendCompletionUpdate('issue-1', 'comment-1', {
        success: true,
        message: 'Done',
        duration: 1000
      });
    });
  });
});