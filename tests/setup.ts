/**
 * Jest Test Setup
 *
 * Global test configuration and utilities for timer mocking
 */

// Global test utilities for timer mocking
declare global {
  var mockSetTimeout: jest.SpyInstance;
  var mockClearTimeout: jest.SpyInstance;
}

// Export timer utilities for tests
export const setupTimerMocks = () => {
  // Enable fake timers with modern implementation
  jest.useFakeTimers({
    advanceTimers: true,
    doNotFake: ['nextTick', 'setImmediate']
  });

  // Spy on timer functions after enabling fake timers
  global.mockSetTimeout = jest.spyOn(global, 'setTimeout');
  global.mockClearTimeout = jest.spyOn(global, 'clearTimeout');
};

export const cleanupTimerMocks = () => {
  // Clear all timers and restore real timers
  jest.clearAllTimers();
  jest.useRealTimers();

  // Restore original timer functions
  if (global.mockSetTimeout) {
    global.mockSetTimeout.mockRestore();
  }
  if (global.mockClearTimeout) {
    global.mockClearTimeout.mockRestore();
  }
};
