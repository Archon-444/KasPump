import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTradingInterface } from './MobileTradingInterface';
import { KasPumpToken, SwapQuote } from '../../types';
import * as useContractsModule from '../../hooks/useContracts';

vi.mock('../../hooks/useContracts');

// framer-motion: render motion.* as plain elements, stub the motion-value hooks.
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => {
        // Strip framer-only props that React would warn about.
        const { drag, dragConstraints, dragElastic, onDragEnd, whileHover, whileTap, style, initial, animate, transition, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  useTransform: () => 0,
}));

// Stand-in modal so we can assert the confirmation step is reached and wire
// the confirm callback, without depending on the modal's internals.
vi.mock('../features/TransactionPreviewModal', () => ({
  TransactionPreviewModal: ({ isOpen, onClose, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="preview-modal">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Confirm Trade</button>
      </div>
    ) : null,
}));

const mockToken: KasPumpToken = {
  address: '0x1234567890abcdef',
  name: 'Test Token',
  symbol: 'TEST',
  description: 'A test token',
  image: 'https://example.com/image.png',
  creator: '0xCreator',
  totalSupply: 1000000,
  currentSupply: 500000,
  marketCap: 50000,
  price: 0.1,
  change24h: 5.5,
  volume24h: 10000,
  holders: 100,
  createdAt: new Date('2024-01-01'),
  curveType: 'sigmoid',
  bondingCurveProgress: 50,
  ammAddress: '0xAMM',
  isGraduated: false,
};

const mockGetSwapQuote = vi.fn();
const mockOnTrade = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(useContractsModule, 'useContracts').mockReturnValue({
    getSwapQuote: mockGetSwapQuote,
  } as any);
  mockGetSwapQuote.mockResolvedValue({
    inputAmount: 1,
    outputAmount: 10,
    priceImpact: 2.5,
    slippage: 1.0,
    gasFee: 0.001,
    route: 'bonding-curve',
    minimumOutput: 9.9,
  } as SwapQuote);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MobileTradingInterface confirmation flow', () => {
  it('opens the confirmation sheet instead of trading directly on a single tap', async () => {
    const user = userEvent.setup();
    render(
      <MobileTradingInterface token={mockToken} onTrade={mockOnTrade} userBalance={10} userTokenBalance={100} />
    );

    await user.type(screen.getByPlaceholderText('0.00'), '1');

    // Wait for the quote so the trade button enables.
    await waitFor(() => expect(mockGetSwapQuote).toHaveBeenCalled());

    const tradeButton = screen.getByRole('button', { name: /buy TEST/i });
    await user.click(tradeButton);

    // The trade must NOT have fired — a confirmation sheet is shown first.
    expect(mockOnTrade).not.toHaveBeenCalled();
    expect(screen.getByTestId('preview-modal')).toBeInTheDocument();
  });

  it('fires the trade only after confirming in the sheet', async () => {
    const user = userEvent.setup();
    render(
      <MobileTradingInterface token={mockToken} onTrade={mockOnTrade} userBalance={10} userTokenBalance={100} />
    );

    await user.type(screen.getByPlaceholderText('0.00'), '1');
    await waitFor(() => expect(mockGetSwapQuote).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /buy TEST/i }));
    await user.click(screen.getByRole('button', { name: /confirm trade/i }));

    await waitFor(() => expect(mockOnTrade).toHaveBeenCalledTimes(1));
    expect(mockOnTrade).toHaveBeenCalledWith(
      expect.objectContaining({ tokenAddress: mockToken.address, action: 'buy', baseAmount: 1 })
    );
  });

  it('does not open the sheet when the amount exceeds the balance', async () => {
    const user = userEvent.setup();
    render(
      <MobileTradingInterface token={mockToken} onTrade={mockOnTrade} userBalance={0.5} userTokenBalance={100} />
    );

    await user.type(screen.getByPlaceholderText('0.00'), '5');
    await waitFor(() => expect(mockGetSwapQuote).toHaveBeenCalled());

    // Insufficient-balance disables the trade button, so no sheet appears.
    await user.click(screen.getByRole('button', { name: /insufficient balance/i }));
    expect(screen.queryByTestId('preview-modal')).not.toBeInTheDocument();
    expect(mockOnTrade).not.toHaveBeenCalled();
  });
});
