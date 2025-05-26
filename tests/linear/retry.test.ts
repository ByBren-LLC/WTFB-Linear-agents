import { retry, defaultRetryOptions } from '../../src/linear/retry';
import { LinearRateLimitError, LinearNetworkError } from '../../src/linear/errors';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock setTimeout
jest.useFakeTimers();

describe('Retry Logic', () => {
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    jest.clearAllTimers();
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  it('should return the result if the function succeeds', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = retry(fn);

    // The function should be called once
    expect(fn).toHaveBeenCalledTimes(1);

    // The result should be the resolved value
    expect(await result).toBe('success');
  });

  it('should retry if the function fails with a retryable error', async () => {
    const error = new LinearNetworkError('Network error', new Error('Original error'));
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const resultPromise = retry(fn);

    // The function should be called once initially
    expect(fn).toHaveBeenCalledTimes(1);

    // Fast-forward time to trigger the retry
    jest.runAllTimers();

    // Wait for the promise to resolve
    const result = await resultPromise;

    // The function should be called again
    expect(fn).toHaveBeenCalledTimes(2);

    // The result should be the resolved value
    expect(result).toBe('success');
  });

  it('should retry multiple times if the function keeps failing with retryable errors', async () => {
    const error = new LinearNetworkError('Network error', new Error('Original error'));
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const resultPromise = retry(fn);

    // The function should be called once initially
    expect(fn).toHaveBeenCalledTimes(1);

    // Fast-forward time to trigger all retries
    jest.runAllTimers();

    // Wait for the promise to resolve
    const result = await resultPromise;

    // The function should be called 4 times total (1 initial + 3 retries)
    expect(fn).toHaveBeenCalledTimes(4);

    // The result should be the resolved value
    expect(result).toBe('success');
  });

  it('should throw the error if the function fails with a non-retryable error', async () => {
    const error = new Error('Non-retryable error');
    const fn = jest.fn().mockRejectedValue(error);

    const result = retry(fn);

    // The function should be called once
    expect(fn).toHaveBeenCalledTimes(1);

    // The result should be rejected with the error
    await expect(result).rejects.toThrow('Non-retryable error');
  });

  it('should throw the error if the function fails after all retries', async () => {
    const error = new LinearNetworkError('Network error', new Error('Original error'));
    const fn = jest.fn().mockRejectedValue(error);

    const resultPromise = retry(fn, { maxRetries: 2 });

    // The function should be called once initially
    expect(fn).toHaveBeenCalledTimes(1);

    // Fast-forward time to trigger all retries
    jest.runAllTimers();

    // The result should be rejected with the error
    await expect(resultPromise).rejects.toThrow('Network error');

    // The function should be called 3 times total (1 initial + 2 retries)
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use the retry-after header for rate limit errors', async () => {
    const error = new LinearRateLimitError('Rate limit exceeded', 429, {}, 10);
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const resultPromise = retry(fn);

    // The function should be called once initially
    expect(fn).toHaveBeenCalledTimes(1);

    // setTimeout should be called with the retry-after value (10 seconds = 10000ms)
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

    // Fast-forward time to trigger the retry
    jest.runAllTimers();

    // Wait for the promise to resolve
    const result = await resultPromise;

    // The function should be called again
    expect(fn).toHaveBeenCalledTimes(2);

    // The result should be the resolved value
    expect(result).toBe('success');
  });

  it('should use custom retry options', async () => {
    const error = new LinearNetworkError('Network error', new Error('Original error'));
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const customOptions = {
      maxRetries: 5,
      initialDelay: 2000,
      backoffFactor: 3
    };

    const resultPromise = retry(fn, customOptions);

    // The function should be called once initially
    expect(fn).toHaveBeenCalledTimes(1);

    // setTimeout should be called with the custom initial delay (2000ms)
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

    // Fast-forward time to trigger the retry
    jest.runAllTimers();

    // Wait for the promise to resolve
    const result = await resultPromise;

    // The function should be called again
    expect(fn).toHaveBeenCalledTimes(2);

    // The result should be the resolved value
    expect(result).toBe('success');
  });
});
