/**
 * Hook for centralized error handling
 * Provides error state management and recovery options
 */

'use client';

import { useState, useCallback, useRef } from 'react';

export interface ErrorInfo {
  message: string;
  code?: string;
  retryable?: boolean;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => Promise<void>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  setError: (error: ErrorInfo | null) => void;
  handleError: (error: Error | string, options?: Partial<ErrorInfo>) => void;
  clearError: () => void;
  retry: () => Promise<void>;
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

