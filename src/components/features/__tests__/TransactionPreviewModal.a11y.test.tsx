import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionPreviewModal } from '../TransactionPreviewModal';
import { KasPumpToken } from '../../../types';

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    { get: () => ({ children, ...props }: any) => {
      const { initial, animate, exit, ...rest } = props;
      return <div {...rest}>{children}</div>;
    } }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const token: KasPumpToken = {
  address: '0xabc', name: 'Test', symbol: 'TEST', description: '', image: '',
  creator: '0xC', totalSupply: 1e6, currentSupply: 5e5, marketCap: 1000,
  price: 0.1, change24h: 0, volume24h: 0, holders: 1, createdAt: new Date('2024-01-01'),
  curveType: 'sigmoid', bondingCurveProgress: 10, ammAddress: '0xAMM', isGraduated: false,
};

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  token,
  type: 'buy' as const,
  amount: '1',
  expectedOutput: 10,
  priceImpact: 1,
  slippage: 1,
  minimumReceived: 9.9,
  fees: 0.01,
  gasFee: 0.001,
};

beforeEach(() => vi.clearAllMocks());

describe('TransactionPreviewModal accessibility', () => {
  it('exposes dialog semantics with an accessible name', () => {
    render(<TransactionPreviewModal {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // aria-labelledby points at the "Buy TEST" heading
    expect(dialog).toHaveAccessibleName(/buy TEST/i);
  });

  it('closes on Escape when no trade is in flight', async () => {
    const onClose = vi.fn();
    render(<TransactionPreviewModal {...baseProps} onClose={onClose} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while a trade is processing', async () => {
    const onClose = vi.fn();
    render(<TransactionPreviewModal {...baseProps} onClose={onClose} loading={true} />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables Confirm on very high price impact', () => {
    render(<TransactionPreviewModal {...baseProps} priceImpact={7} />);
    expect(screen.getByRole('button', { name: /confirm buy/i })).toBeDisabled();
  });
});
