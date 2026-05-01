/**
 * useTokenCreationState — V2 (PR 4)
 *
 * Slimmed down for the QuickLaunchForm. The wizard's mode/step machinery
 * and the curve/supply/price form fields are gone. What remains is the
 * minimal state required for a 3-field flow:
 *   - form data (name, symbol, description, image, social links, referrer)
 *   - validation
 *   - submit + creation lifecycle (`form` → `creating` → `success` | `error`)
 *
 * Image upload is handled by `useIPFSUpload` and passed in as `ipfsImageUrl`
 * by the caller — same pattern as before.
 */

import { useState, useCallback } from 'react';
import { TokenCreationForm, TokenCreationResult } from '../types';
import { isValidTokenName, isValidTokenSymbol } from '../utils';
import { areContractsDeployed, getChainName } from '../config/contracts';
import type { useContracts } from './useContracts';

export type UseContractsReturn = ReturnType<typeof useContracts>;

export interface UseTokenCreationStateOptions {
  contracts: UseContractsReturn;
  chainId: number | undefined;
  onSuccess: (tokenData: TokenCreationResult) => void;
}

export interface UseTokenCreationStateReturn {
  formData: TokenCreationForm;
  errors: Partial<Record<keyof TokenCreationForm, string>>;
  updateFormData: (updates: Partial<TokenCreationForm>) => void;
  setErrors: (errors: Partial<Record<keyof TokenCreationForm, string>>) => void;

  isCreating: boolean;
  creationStep: 'form' | 'creating' | 'success' | 'error';
  creationResult: TokenCreationResult | null;
  creationError: string;

  setIsCreating: (value: boolean) => void;
  setCreationStep: (step: 'form' | 'creating' | 'success' | 'error') => void;
  setCreationResult: (result: TokenCreationResult | null) => void;
  setCreationError: (error: string) => void;

  validateForm: () => boolean;
  handleSubmit: (e: React.FormEvent, ipfsImageUrl?: string) => Promise<void>;
  resetForm: () => void;
}

const DEFAULT_FORM_DATA: TokenCreationForm = {
  name: '',
  symbol: '',
  description: '',
  image: null,
  twitterUrl: '',
  telegramUrl: '',
  websiteUrl: '',
  referrer: '',
};

export function useTokenCreationState({
  contracts,
  chainId,
  onSuccess,
}: UseTokenCreationStateOptions): UseTokenCreationStateReturn {
  const [formData, setFormData] = useState<TokenCreationForm>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof TokenCreationForm, string>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<
    'form' | 'creating' | 'success' | 'error'
  >('form');
  const [creationResult, setCreationResult] = useState<TokenCreationResult | null>(null);
  const [creationError, setCreationError] = useState<string>('');

  const updateFormData = useCallback((updates: Partial<TokenCreationForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof TokenCreationForm, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required';
    } else if (!isValidTokenName(formData.name)) {
      newErrors.name = 'Invalid token name format';
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (!isValidTokenSymbol(formData.symbol.toUpperCase())) {
      newErrors.symbol = 'Symbol must be 1-10 uppercase letters/numbers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent, ipfsImageUrl?: string) => {
      e.preventDefault();
      const contractsDeployed = chainId ? areContractsDeployed(chainId) : false;
      const chainName = chainId ? getChainName(chainId) : null;

      if (!contractsDeployed) {
        setCreationError(
          `Token launch is not available on ${chainName || 'this chain'}. ` +
            'Switch to a supported chain (Base in Phase 1).'
        );
        setCreationStep('error');
        return;
      }

      if (!validateForm()) return;

      setIsCreating(true);
      setCreationStep('creating');

      try {
        const result = await contracts.createToken(
          {
            ...formData,
            symbol: formData.symbol.toUpperCase(),
          },
          ipfsImageUrl
        );

        setCreationResult(result);
        setCreationStep('success');

        // Brief delay so the success state can render before navigating away.
        setTimeout(() => {
          onSuccess(result);
        }, 2000);
      } catch (error: unknown) {
        console.error('Token creation failed:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setCreationError(errorMessage);
        setCreationStep('error');
      } finally {
        setIsCreating(false);
      }
    },
    [chainId, contracts, formData, onSuccess, validateForm]
  );

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setCreationStep('form');
    setCreationResult(null);
    setCreationError('');
  }, []);

  return {
    formData,
    errors,
    updateFormData,
    setErrors,
    isCreating,
    creationStep,
    creationResult,
    creationError,
    setIsCreating,
    setCreationStep,
    setCreationResult,
    setCreationError,
    validateForm,
    handleSubmit,
    resetForm,
  };
}
