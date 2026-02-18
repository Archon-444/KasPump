/**
 * useErrorHandler Hook
 * Centralized error handling with automatic retry logic and recovery options
 *
 * Features:
 * - Automatic retry with configurable max attempts
 * - Error categorization and tracking
 * - Custom recovery actions
 * - Retry state management
 *
 * @example
 * ```typescript
 * const { error, handleError, clearError, retry, isRetrying } = useErrorHandler(3);
 *
 * // Handle async operation errors
 * try {
 *   await contract.createToken();
 * } catch (err) {
 *   handleError(err, {
 *     retryable: true,
 *     onRetry: () => contract.createToken(),
 *     action: {
 *       label: 'Switch Network',
 *       onClick: () => switchNetwork()
 *     }
 *   });
 * }
 *
 * // Display error UI
 * {error && (
 *   <Alert>
 *     {error.message}
 *     {error.retryable && <Button onClick={retry}>Retry</Button>}
 *   </Alert>
 * )}
 * ```
 *
 * @param defaultMaxRetries - Maximum retry attempts (default: 3)
 * @returns Object containing error state and management functions
 */

'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Error information structure
 */
export interface ErrorInfo {
  /** Error message to display */
  message: string;
  /** Error code for categorization */
  code?: string;
  /** Whether error can be retried */
  retryable?: boolean;
  /** Current retry attempt count */
  retryCount?: number;
  /** Maximum retry attempts allowed */
  maxRetries?: number;
  /** Function to call on retry */
  onRetry?: (() => Promise<void>) | undefined;
  /** Custom action button */
  action?: {
    label: string;
    onClick: () => void;
  } | undefined;
}

/**
 * Return type for useErrorHandler hook
 */
export interface UseErrorHandlerReturn {
  /** Current error state */
  error: ErrorInfo | null;
  /** Manually set error */
  setError: (error: ErrorInfo | null) => void;
  /** Handle an error */
  handleError: (error: Error | string, options?: Partial<ErrorInfo>) => void;
  /** Clear current error */
  clearError: () => void;
  /** Retry the failed operation */
  retry: () => Promise<void>;
  /** Whether a retry is in progress */
  isRetrying: boolean;
}

export const useErrorHandler = (
  defaultMaxRetries: number = 3
): UseErrorHandlerReturn => {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryCountRef = useRef(0);

  const handleError = useCallback(
    (error: Error | string, options?: Partial<ErrorInfo>) => {
      const message = typeof error === 'string' ? error : error.message;
      const code = (error as any)?.code || options?.code;
      
      setError({
        message,
        code,
        retryable: options?.retryable ?? true,
        retryCount: retryCountRef.current,
        maxRetries: options?.maxRetries ?? defaultMaxRetries,
        onRetry: options?.onRetry,
        action: options?.action,
      });
    },
    [defaultMaxRetries]
  );

  const clearError = useCallback(() => {
    setError(null);
    retryCountRef.current = 0;
  }, []);

  const retry = useCallback(async () => {
    if (!error || !error.retryable) return;

    const maxRetries = error.maxRetries ?? defaultMaxRetries;
    if (retryCountRef.current >= maxRetries) {
      setError({
        ...error,
        message: `Failed after ${maxRetries} attempts. ${error.message}`,
        retryable: false,
      });
      return;
    }

    setIsRetrying(true);
    retryCountRef.current += 1;

    try {
      if (error.onRetry) {
        await error.onRetry();
      }
      clearError();
    } catch (retryError) {
      handleError(retryError as Error, {
        ...error,
        retryCount: retryCountRef.current,
      });
    } finally {
      setIsRetrying(false);
    }
  }, [error, defaultMaxRetries, clearError, handleError]);

  return {
    error,
    setError,
    handleError,
    clearError,
    retry,
    isRetrying,
  };
};

