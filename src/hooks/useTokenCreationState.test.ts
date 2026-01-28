import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTokenCreationState } from './useTokenCreationState';

describe('useTokenCreationState', () => {
  const mockContracts = {
    createToken: vi.fn(),
    isConnected: true,
  };

  const defaultProps = {
    contracts: mockContracts,
    chainId: 97,
    onSuccess: vi.fn(),
    nativeCurrencySymbol: 'BNB',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY = '0xfactory';
    process.env.NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT = '0xfee';
    process.env.NEXT_PUBLIC_BSC_TESTNET_DEX_ROUTER_REGISTRY = '0xregistry';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY;
    delete process.env.NEXT_PUBLIC_BSC_TESTNET_FEE_RECIPIENT;
    delete process.env.NEXT_PUBLIC_BSC_TESTNET_DEX_ROUTER_REGISTRY;
  });

  describe('Initial State', () => {
    it('should initialize with default form data', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      expect(result.current.formData).toEqual({
        name: '',
        symbol: '',
        description: '',
        image: null,
        totalSupply: 1000000000,
        curveType: 'linear',
        basePrice: 0.000001,
        slope: 0.00000001,
      });
    });

    it('should initialize with empty errors', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      expect(result.current.errors).toEqual({});
    });

    it('should initialize with form step', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      expect(result.current.creationStep).toBe('form');
      expect(result.current.isCreating).toBe(false);
    });

    it('should initialize with beginner mode and wizard step 1', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      expect(result.current.mode).toBe('beginner');
      expect(result.current.wizardStep).toBe(1);
    });
  });

  describe('Form Data Updates', () => {
    it('should update form data', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({ name: 'Test Token' });
      });

      expect(result.current.formData.name).toBe('Test Token');
    });

    it('should update multiple fields', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Test Token',
          symbol: 'TEST',
          totalSupply: 5000000,
        });
      });

      expect(result.current.formData.name).toBe('Test Token');
      expect(result.current.formData.symbol).toBe('TEST');
      expect(result.current.formData.totalSupply).toBe(5000000);
    });
  });

  describe('Form Validation', () => {
    it('should validate empty name', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.validateForm();
      });

      expect(result.current.errors.name).toBe('Token name is required');
    });

    it('should validate empty symbol', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({ name: 'Valid Name' });
        result.current.validateForm();
      });

      expect(result.current.errors.symbol).toBe('Token symbol is required');
    });

    it('should validate minimum supply', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Name',
          symbol: 'VALID',
          totalSupply: 100,
        });
        result.current.validateForm();
      });

      expect(result.current.errors.totalSupply).toBe('Minimum supply is 1,000,000 tokens');
    });

    it('should validate maximum supply', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Name',
          symbol: 'VALID',
          totalSupply: 2000000000000,
        });
        result.current.validateForm();
      });

      expect(result.current.errors.totalSupply).toBe('Maximum supply is 1,000,000,000,000 tokens');
    });

    it('should validate base price range', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Name',
          symbol: 'VALID',
          basePrice: 2,
        });
        result.current.validateForm();
      });

      expect(result.current.errors.basePrice).toBe('Base price too high (max 1 BNB)');
    });

    it('should validate slope range', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Name',
          symbol: 'VALID',
          slope: 0.002,
        });
        result.current.validateForm();
      });

      expect(result.current.errors.slope).toBe('Slope too high (max 0.001)');
    });

    it('should pass validation with valid data', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Token',
          symbol: 'VALID',
          totalSupply: 1000000000,
          basePrice: 0.0001,
          slope: 0.00001,
        });
      });

      const isValid = act(() => result.current.validateForm());

      expect(isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });

  describe('Wizard Navigation', () => {
    it('should change wizard step', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.setWizardStep(2);
      });

      expect(result.current.wizardStep).toBe(2);
    });

    it('should change mode', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.setMode('advanced');
      });

      expect(result.current.mode).toBe('advanced');
    });
  });

  describe('Form Submission', () => {
    it('should prevent submission with invalid data', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        const event = new Event('submit') as any;
        event.preventDefault = vi.fn();
        result.current.handleSubmit(event);
      });

      expect(result.current.creationStep).toBe('form');
    });

    it('should move to confirm step with valid data', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Token',
          symbol: 'VALID',
          totalSupply: 1000000000,
          basePrice: 0.0001,
          slope: 0.00001,
        });
      });

      act(() => {
        const event = new Event('submit') as any;
        event.preventDefault = vi.fn();
        result.current.handleSubmit(event);
      });

      expect(result.current.creationStep).toBe('confirm');
    });
  });

  describe('Token Creation', () => {
    it('should handle successful token creation', async () => {
      const mockResult = {
        tokenAddress: '0x123',
        ammAddress: '0x456',
        txHash: '0x789',
      };

      mockContracts.createToken.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Token',
          symbol: 'VALID',
        });
      });

      await act(async () => {
        await result.current.handleConfirmCreation();
      });

      await waitFor(() => {
        expect(result.current.creationStep).toBe('success');
      });

      expect(result.current.creationResult).toEqual(mockResult);
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockResult);
    });

    it('should handle token creation error', async () => {
      const mockError = new Error('Transaction failed');
      mockContracts.createToken.mockRejectedValue(mockError);

      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Valid Token',
          symbol: 'VALID',
        });
      });

      await act(async () => {
        await result.current.handleConfirmCreation();
      });

      await waitFor(() => {
        expect(result.current.creationStep).toBe('error');
      });

      expect(result.current.creationError).toBe('Transaction failed');
    });
  });

  describe('Form Reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));

      act(() => {
        result.current.updateFormData({
          name: 'Test Token',
          symbol: 'TEST',
        });
        result.current.setWizardStep(3);
        result.current.setMode('advanced');
      });

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData.name).toBe('');
      expect(result.current.formData.symbol).toBe('');
      expect(result.current.wizardStep).toBe(1);
      expect(result.current.mode).toBe('beginner');
      expect(result.current.creationStep).toBe('form');
      expect(result.current.errors).toEqual({});
    });
  });
});
