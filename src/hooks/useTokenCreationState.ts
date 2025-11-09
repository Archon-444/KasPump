/**
 * useTokenCreationState Hook
 * Manages state and logic for token creation modal
 *
 * Extracted from TokenCreationModal to improve maintainability
 * and separate concerns (UI vs state management)
 *
 * @example
 * ```typescript
 * const {
 *   formData,
 *   errors,
 *   isCreating,
 *   creationStep,
 *   creationResult,
 *   creationError,
 *   mode,
 *   wizardStep,
 *   updateFormData,
 *   validateForm,
 *   handleSubmit,
 *   handleConfirmCreation,
 *   resetForm,
 *   setMode,
 *   setWizardStep
 * } = useTokenCreationState({
 *   contracts,
 *   chainId,
 *   onSuccess
 * });
 * ```
 */

import { useState, useCallback } from 'react';
import { TokenCreationForm, TokenCreationResult } from '../types';
import { isValidTokenName, isValidTokenSymbol } from '../utils';
import { areContractsDeployed, getChainMetadata } from '../config/contracts';

export interface UseTokenCreationStateOptions {
  contracts: any; // useContracts return type
  chainId: number | undefined;
  onSuccess: (tokenData: TokenCreationResult) => void;
  nativeCurrencySymbol: string;
}

export interface UseTokenCreationStateReturn {
  // Form state
  formData: TokenCreationForm;
  errors: Partial<Record<keyof TokenCreationForm, string>>;
  updateFormData: (updates: Partial<TokenCreationForm>) => void;
  setErrors: (errors: Partial<Record<keyof TokenCreationForm, string>>) => void;

  // Creation state
  isCreating: boolean;
  creationStep: 'form' | 'confirm' | 'creating' | 'success' | 'error';
  creationResult: TokenCreationResult | null;
  creationError: string;

  // Creation state setters (for advanced use cases like multi-chain)
  setIsCreating: (value: boolean) => void;
  setCreationStep: (step: 'form' | 'confirm' | 'creating' | 'success' | 'error') => void;
  setCreationResult: (result: TokenCreationResult | null) => void;
  setCreationError: (error: string) => void;

  // Mode and wizard state
  mode: 'beginner' | 'advanced';
  wizardStep: 1 | 2 | 3;
  setMode: (mode: 'beginner' | 'advanced') => void;
  setWizardStep: (step: 1 | 2 | 3) => void;

  // Actions
  validateForm: () => boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleConfirmCreation: (ipfsImageUrl?: string) => Promise<void>;
  resetForm: () => void;
}

const DEFAULT_FORM_DATA: TokenCreationForm = {
  name: '',
  symbol: '',
  description: '',
  image: null,
  totalSupply: 1000000000, // 1 billion default
  curveType: 'linear',
  basePrice: 0.000001,
  slope: 0.00000001,
};

export function useTokenCreationState({
  contracts,
  chainId,
  onSuccess,
  nativeCurrencySymbol
}: UseTokenCreationStateOptions): UseTokenCreationStateReturn {
  const [formData, setFormData] = useState<TokenCreationForm>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof TokenCreationForm, string>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'form' | 'confirm' | 'creating' | 'success' | 'error'>('form');
  const [creationResult, setCreationResult] = useState<TokenCreationResult | null>(null);
  const [creationError, setCreationError] = useState<string>('');
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  const updateFormData = useCallback((updates: Partial<TokenCreationForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof TokenCreationForm, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required';
    } else if (!isValidTokenName(formData.name)) {
      newErrors.name = 'Invalid token name format';
    }

    // Symbol validation
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (!isValidTokenSymbol(formData.symbol.toUpperCase())) {
      newErrors.symbol = 'Symbol must be 1-10 uppercase letters/numbers';
    }

    // Supply validation
    if (formData.totalSupply < 1000000) {
      newErrors.totalSupply = 'Minimum supply is 1,000,000 tokens';
    } else if (formData.totalSupply > 1000000000000) {
      newErrors.totalSupply = 'Maximum supply is 1,000,000,000,000 tokens';
    }

    // Price validation
    if (formData.basePrice <= 0) {
      newErrors.basePrice = 'Base price must be positive';
    } else if (formData.basePrice > 1) {
      newErrors.basePrice = `Base price too high (max 1 ${nativeCurrencySymbol})`;
    }

    // Slope validation
    if (formData.slope <= 0) {
      newErrors.slope = 'Slope must be positive';
    } else if (formData.slope > 0.001) {
      newErrors.slope = 'Slope too high (max 0.001)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, nativeCurrencySymbol]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const contractsDeployed = chainId ? areContractsDeployed(chainId) : false;
    const chainMetadata = chainId ? getChainMetadata(chainId) : null;

    if (!contractsDeployed) {
      setCreationError(
        `Token creation is not available on ${chainMetadata?.name || 'this chain'}. ` +
        'Please switch to BSC Testnet (chain 97) where contracts are deployed.'
      );
      setCreationStep('error');
      return;
    }

    if (validateForm()) {
      setCreationStep('confirm');
    }
  }, [chainId, validateForm]);

  const handleConfirmCreation = useCallback(async (ipfsImageUrl?: string) => {
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

      // Call success callback after delay
      setTimeout(() => {
        onSuccess(result);
      }, 2000);
    } catch (error: unknown) {
      console.error('Token creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setCreationError(errorMessage);
      setCreationStep('error');
    } finally {
      setIsCreating(false);
    }
  }, [contracts, formData, onSuccess]);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setCreationStep('form');
    setCreationResult(null);
    setCreationError('');
    setWizardStep(1);
    setMode('beginner');
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
    mode,
    wizardStep,
    setMode,
    setWizardStep,
    validateForm,
    handleSubmit,
    handleConfirmCreation,
    resetForm,
  };
}
