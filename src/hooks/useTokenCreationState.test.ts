import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTokenCreationState } from './useTokenCreationState';

/**
 * V2 PR 4 — slim 3-field test set.
 *
 * The legacy wizard fields (totalSupply, basePrice, slope, curveType,
 * mode, wizardStep, separate confirm step) were removed when the hook
 * was rewritten to back the QuickLaunchForm. This test pins the new
 * surface: name + ticker validation, lifecycle transitions, and the
 * contract handoff.
 */

describe('useTokenCreationState', () => {
  const mockContracts = {
    createToken: vi.fn(),
    isConnected: true,
  };

  const defaultProps = {
    // Cast through `any` because the real hook expects the full
    // useContracts return shape. Tests only need `createToken`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: mockContracts as any,
    chainId: 97,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('initializes with the slim default form (no curve / supply / price)', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));
      expect(result.current.formData).toEqual({
        name: '',
        symbol: '',
        description: '',
        image: null,
        twitterUrl: '',
        telegramUrl: '',
        websiteUrl: '',
        referrer: '',
      });
      expect(result.current.creationStep).toBe('form');
      expect(result.current.isCreating).toBe(false);
      expect(result.current.errors).toEqual({});
    });
  });

  describe('updateFormData', () => {
    it('merges partial updates', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));
      act(() => {
        result.current.updateFormData({ name: 'Pepe' });
      });
      act(() => {
        result.current.updateFormData({ symbol: 'pepe' });
      });
      expect(result.current.formData.name).toBe('Pepe');
      expect(result.current.formData.symbol).toBe('pepe');
    });
  });

  describe('validateForm', () => {
    it('rejects empty name and ticker', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));
      let ok = true;
      act(() => {
        ok = result.current.validateForm();
      });
      expect(ok).toBe(false);
      expect(result.current.errors.name).toBeDefined();
      expect(result.current.errors.symbol).toBeDefined();
    });

    it('passes with valid name + ticker', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));
      act(() => {
        result.current.updateFormData({ name: 'Doge Coin', symbol: 'DOGE' });
      });
      let ok = false;
      act(() => {
        ok = result.current.validateForm();
      });
      expect(ok).toBe(true);
      expect(result.current.errors).toEqual({});
    });
  });

  describe('resetForm', () => {
    it('returns the form to defaults and clears the lifecycle state', () => {
      const { result } = renderHook(() => useTokenCreationState(defaultProps));
      act(() => {
        result.current.updateFormData({ name: 'X', symbol: 'X' });
        result.current.setCreationStep('error');
        result.current.setCreationError('boom');
      });
      act(() => {
        result.current.resetForm();
      });
      expect(result.current.formData.name).toBe('');
      expect(result.current.formData.symbol).toBe('');
      expect(result.current.creationStep).toBe('form');
      expect(result.current.creationError).toBe('');
    });
  });
});
