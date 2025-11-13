/**
 * Tests for useErrorHandler hook
 * Tests error handling, retry logic, and recovery options
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useErrorHandler } from './useErrorHandler';

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with no error', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.isRetrying).toBe(false);
    });

    it('should initialize with default max retries of 3', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error');
      });

      expect(result.current.error?.maxRetries).toBe(3);
    });

    it('should accept custom max retries', () => {
      const { result } = renderHook(() => useErrorHandler(5));

      act(() => {
        result.current.handleError('Test error');
      });

      expect(result.current.error?.maxRetries).toBe(5);
    });
  });

  describe('Handling Errors', () => {
    it('should handle string errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Something went wrong');
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Something went wrong');
    });

    it('should handle Error objects', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('Network error');

      act(() => {
        result.current.handleError(error);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('should extract error code from Error object', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = Object.assign(new Error('Contract error'), { code: 'CALL_EXCEPTION' });

      act(() => {
        result.current.handleError(error);
      });

      expect(result.current.error?.code).toBe('CALL_EXCEPTION');
    });

    it('should set error code from options', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Error', { code: 'CUSTOM_ERROR' });
      });

      expect(result.current.error?.code).toBe('CUSTOM_ERROR');
    });

    it('should mark errors as retryable by default', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Error');
      });

      expect(result.current.error?.retryable).toBe(true);
    });

    it('should allow marking errors as non-retryable', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Fatal error', { retryable: false });
      });

      expect(result.current.error?.retryable).toBe(false);
    });

    it('should track retry count', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Error');
      });

      expect(result.current.error?.retryCount).toBe(0);
    });

    it('should store onRetry callback', () => {
      const { result } = renderHook(() => useErrorHandler());
      const onRetry = vi.fn().mockResolvedValue(undefined);

      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      expect(result.current.error?.onRetry).toBe(onRetry);
    });

    it('should store custom action', () => {
      const { result } = renderHook(() => useErrorHandler());
      const action = {
        label: 'Switch Network',
        onClick: vi.fn(),
      };

      act(() => {
        result.current.handleError('Error', { action });
      });

      expect(result.current.error?.action).toEqual(action);
    });
  });

  describe('Clearing Errors', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Error');
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset retry count when clearing', () => {
      const { result } = renderHook(() => useErrorHandler());
      const onRetry = vi.fn().mockResolvedValue(undefined);

      // Trigger error and retry to increment count
      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      act(async () => {
        await result.current.retry();
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      // New error should have retry count of 0
      act(() => {
        result.current.handleError('New error');
      });

      expect(result.current.error?.retryCount).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    it('should call onRetry callback when retrying', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const onRetry = vi.fn().mockResolvedValue(undefined);

      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should clear error on successful retry', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const onRetry = vi.fn().mockResolvedValue(undefined);

      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBeNull();
    });

    it('should set isRetrying flag during retry', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let resolveRetry: () => void;
      const onRetry = vi.fn(() => new Promise<void>(resolve => { resolveRetry = resolve; }));

      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      const retryPromise = act(async () => {
        await result.current.retry();
      });

      // Should be retrying now
      expect(result.current.isRetrying).toBe(true);

      // Resolve the retry
      resolveRetry!();
      await retryPromise;

      expect(result.current.isRetrying).toBe(false);
    });

    it('should increment retry count on each retry', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let attemptCount = 0;
      const onRetry = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Still failing');
        }
        return Promise.resolve();
      });

      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      // First retry
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error?.retryCount).toBe(1);

      // Second retry (should succeed)
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBeNull(); // Cleared after success
    });

    it('should not retry if error is not retryable', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const onRetry = vi.fn().mockResolvedValue(undefined);

      act(() => {
        result.current.handleError('Fatal error', {
          retryable: false,
          onRetry,
        });
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(onRetry).not.toHaveBeenCalled();
    });

    it('should stop retrying after max attempts', async () => {
      const { result } = renderHook(() => useErrorHandler(2)); // Max 2 retries
      const onRetry = vi.fn().mockRejectedValue(new Error('Keep failing'));

      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      // First retry
      await act(async () => {
        await result.current.retry();
      });
      expect(result.current.error?.retryable).toBe(true);

      // Second retry
      await act(async () => {
        await result.current.retry();
      });
      expect(result.current.error?.retryable).toBe(true);

      // Third retry should mark as non-retryable
      await act(async () => {
        await result.current.retry();
      });
      expect(result.current.error?.retryable).toBe(false);
      expect(result.current.error?.message).toContain('Failed after 2 attempts');
    });

    it('should handle retry errors', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));

      act(() => {
        result.current.handleError('Initial error', { onRetry });
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error?.message).toBe('Retry failed');
      expect(result.current.error?.retryCount).toBe(1);
    });

    it('should preserve error options across retries', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const action = { label: 'Fix', onClick: vi.fn() };
      const onRetry = vi.fn().mockRejectedValue(new Error('Still failing'));

      act(() => {
        result.current.handleError('Error', {
          onRetry,
          action,
          code: 'ERR_CODE',
        });
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error?.action).toEqual(action);
      expect(result.current.error?.code).toBe('ERR_CODE');
    });

    it('should not retry if no error exists', async () => {
      const { result } = renderHook(() => useErrorHandler());

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Manual Error Setting', () => {
    it('should allow manually setting error', () => {
      const { result } = renderHook(() => useErrorHandler());
      const customError = {
        message: 'Custom error',
        code: 'CUSTOM',
        retryable: false,
      };

      act(() => {
        result.current.setError(customError);
      });

      expect(result.current.error).toEqual(customError);
    });

    it('should allow manually clearing error via setError(null)', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Error');
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Custom Max Retries Per Error', () => {
    it('should respect per-error maxRetries over default', async () => {
      const { result } = renderHook(() => useErrorHandler(3)); // Default 3
      const onRetry = vi.fn().mockRejectedValue(new Error('Keep failing'));

      act(() => {
        result.current.handleError('Error', {
          onRetry,
          maxRetries: 1, // Override to 1
        });
      });

      // First retry
      await act(async () => {
        await result.current.retry();
      });

      // Second retry should mark as non-retryable
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.error?.retryable).toBe(false);
      expect(result.current.error?.message).toContain('Failed after 1 attempts');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sequential errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Error 1');
        result.current.handleError('Error 2');
        result.current.handleError('Error 3');
      });

      expect(result.current.error?.message).toBe('Error 3');
    });

    it('should handle clearing during retry', async () => {
      const { result } = renderHook(() => useErrorHandler());
      let resolveRetry: () => void;
      const onRetry = vi.fn(() => new Promise<void>(resolve => { resolveRetry = resolve; }));

      act(() => {
        result.current.handleError('Error', { onRetry });
      });

      const retryPromise = act(async () => {
        await result.current.retry();
      });

      // Clear while retrying
      act(() => {
        result.current.clearError();
      });

      resolveRetry!();
      await retryPromise;

      // Error should be null after clearing
      expect(result.current.error).toBeNull();
    });

    it('should handle onRetry being undefined', async () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Error'); // No onRetry provided
      });

      await act(async () => {
        await result.current.retry();
      });

      // Should clear error even without onRetry
      expect(result.current.error).toBeNull();
    });
  });
});
