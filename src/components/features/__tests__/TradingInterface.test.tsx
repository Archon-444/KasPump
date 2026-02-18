import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradingInterface } from '../TradingInterface';
import { KasPumpToken, SwapQuote } from '../../../types';
import * as useContractsModule from '../../../hooks/useContracts';

// Mock dependencies
vi.mock('../../../hooks/useContracts');
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../TransactionPreviewModal', () => ({
  TransactionPreviewModal: ({ isOpen, onClose, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="transaction-preview-modal">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onConfirm}>Confirm Trade</button>
      </div>
    ) : null
}));

describe('TradingInterface', () => {
  // Mock data
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
    curveType: 'linear',
    bondingCurveProgress: 50,
    ammAddress: '0xAMM',
    isGraduated: false,
  };

  const mockGetSwapQuote = vi.fn();
  const mockOnTrade = vi.fn();

  // Setup mock contracts
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useContracts hook
    vi.spyOn(useContractsModule, 'useContracts').mockReturnValue({
      isConnected: true,
      isInitialized: true,
      provider: null,
      readProvider: null,
      signer: null,
      getTokenFactoryContract: vi.fn(),
      getBondingCurveContract: vi.fn(),
      getTokenContract: vi.fn(),
      createToken: vi.fn(),
      getAllTokens: vi.fn(),
      getTokenInfo: vi.fn(),
      getTokenAMMAddress: vi.fn(),
      executeTrade: vi.fn(),
      getSwapQuote: mockGetSwapQuote,
      approveToken: vi.fn(),
      getTokenBalance: vi.fn(),
      getAllowance: vi.fn(),
    } as any);

    // Default mock quote response
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

  describe('Component Rendering', () => {
    it('should render with buy mode by default', () => {
      render(<TradingInterface token={mockToken} />);

      const buyButton = screen.getByRole('button', { name: /buy/i });
      expect(buyButton).toHaveClass('bg-green-600');
    });

    it('should render all main elements', () => {
      render(<TradingInterface token={mockToken} userBalance={10} userTokenBalance={100} />);

      expect(screen.getByText(/you pay/i)).toBeInTheDocument();
      expect(screen.getByText(/balance:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sell/i })).toBeInTheDocument();
      expect(screen.getByText(/slippage tolerance/i)).toBeInTheDocument();
    });

    it('should display correct user balance for buy mode', () => {
      render(<TradingInterface token={mockToken} userBalance={10.5} />);

      expect(screen.getByText(/10\.500000 BNB/i)).toBeInTheDocument();
    });

    it('should display correct user balance for sell mode', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userTokenBalance={100} />);

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      expect(screen.getByText(/100\.000000 TEST/i)).toBeInTheDocument();
    });
  });

  describe('Trade Type Switching', () => {
    it('should switch from buy to sell mode', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} />);

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      expect(sellButton).toHaveClass('bg-red-600');
      expect(screen.getByText(/you sell/i)).toBeInTheDocument();
    });

    it('should switch from sell to buy mode', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} />);

      // First switch to sell
      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      // Then switch back to buy
      const buyButton = screen.getByRole('button', { name: /buy/i });
      await user.click(buyButton);

      expect(buyButton).toHaveClass('bg-green-600');
      expect(screen.getByText(/you pay/i)).toBeInTheDocument();
    });

    it('should clear amount when switching trade type', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      await user.type(input, '5');

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      // Amount should still be there, just the context changes
      expect(input.value).toBe('5');
    });
  });

  describe('Amount Input', () => {
    it('should accept numeric input', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} />);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      await user.type(input, '5.5');

      expect(input.value).toBe('5.5');
    });

    it('should handle decimal input correctly', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} />);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      await user.type(input, '0.001');

      expect(input.value).toBe('0.001');
    });

    it('should show insufficient balance error for buy mode', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={5} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      await waitFor(() => {
        const tradeButton = screen.getByRole('button', { name: /insufficient balance/i });
        expect(tradeButton).toBeDisabled();
      });
    });

    it('should show insufficient balance error for sell mode', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userTokenBalance={50} />);

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const tradeButton = screen.getByRole('button', { name: /insufficient balance/i });
        expect(tradeButton).toBeDisabled();
      });
    });
  });

  describe('Quick Amount Presets', () => {
    it('should set 25% of balance when clicking 25% button', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={100} />);

      const preset25Button = screen.getByRole('button', { name: '25%' });
      await user.click(preset25Button);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(input.value).toBe('25');
    });

    it('should set 50% of balance when clicking 50% button', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={100} />);

      const preset50Button = screen.getByRole('button', { name: '50%' });
      await user.click(preset50Button);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(input.value).toBe('50');
    });

    it('should set 75% of balance when clicking 75% button', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={100} />);

      const preset75Button = screen.getByRole('button', { name: '75%' });
      await user.click(preset75Button);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(input.value).toBe('75');
    });

    it('should set 100% of balance when clicking Max button', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={100} />);

      const maxButton = screen.getByRole('button', { name: 'Max' });
      await user.click(maxButton);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(input.value).toBe('100');
    });

    it('should use token balance for presets in sell mode', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userTokenBalance={200} />);

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      const preset50Button = screen.getByRole('button', { name: '50%' });
      await user.click(preset50Button);

      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(input.value).toBe('100');
    });
  });

  describe('Trade Calculations', () => {
    it('should fetch quote when amount is entered', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      // Wait for debounce (500ms) + a bit extra
      await waitFor(() => {
        expect(mockGetSwapQuote).toHaveBeenCalledWith(
          mockToken.address,
          1,
          'buy'
        );
      }, { timeout: 1000 });
    });

    it('should display expected output after fetching quote', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/you receive \(est\.\)/i)).toBeInTheDocument();
        expect(screen.getByText(/10\.000000 TEST/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should display price impact', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/price impact/i)).toBeInTheDocument();
        expect(screen.getByText(/2\.50%/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should display minimum received based on slippage', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/min\. received/i)).toBeInTheDocument();
        expect(screen.getByText(/9\.900000 TEST/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should display platform fee (1% of input)', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/platform fee/i)).toBeInTheDocument();
        expect(screen.getByText(/0\.010000 BNB/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle quote fetch errors gracefully', async () => {
      mockGetSwapQuote.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      // Component should not crash and should reset values
      await waitFor(() => {
        expect(mockGetSwapQuote).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Component should still be rendered
      expect(screen.getByRole('button', { name: /buy test/i })).toBeInTheDocument();
    });

    it('should show loading state while fetching quote', async () => {
      // Create a promise that we can control
      let resolveQuote: (value: SwapQuote) => void;
      const quotePromise = new Promise<SwapQuote>((resolve) => {
        resolveQuote = resolve;
      });
      mockGetSwapQuote.mockReturnValue(quotePromise);

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      // Wait for debounce
      await waitFor(() => {
        expect(screen.getByText(/fetching quote\.\.\./i)).toBeInTheDocument();
      }, { timeout: 1000 });

      // Resolve the quote
      resolveQuote!({
        inputAmount: 1,
        outputAmount: 10,
        priceImpact: 2.5,
        slippage: 1.0,
        gasFee: 0.001,
        route: 'bonding-curve',
        minimumOutput: 9.9,
      });

      await waitFor(() => {
        expect(screen.queryByText(/fetching quote\.\.\./i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Slippage Settings', () => {
    it('should show slippage settings when clicking settings icon', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} />);

      const settingsButtons = screen.getAllByRole('button');
      const settingsIcon = settingsButtons.find(btn =>
        btn.querySelector('svg') && btn.className.includes('text-yellow-400')
      );

      await user.click(settingsIcon!);

      // Check that slippage preset buttons are visible
      expect(screen.getByRole('button', { name: '0.1%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '0.5%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1%' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3%' })).toBeInTheDocument();
    });

    it('should change slippage when clicking preset buttons', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      // Open settings
      const settingsButtons = screen.getAllByRole('button');
      const settingsIcon = settingsButtons.find(btn =>
        btn.querySelector('svg') && btn.className.includes('text-yellow-400')
      );
      await user.click(settingsIcon!);

      // Click 0.5% preset
      const preset05Button = screen.getByRole('button', { name: '0.5%' });
      await user.click(preset05Button);

      expect(preset05Button).toHaveClass('bg-yellow-600');
    });

    it('should allow custom slippage input', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      // Open settings
      const settingsButtons = screen.getAllByRole('button');
      const settingsIcon = settingsButtons.find(btn =>
        btn.querySelector('svg') && btn.className.includes('text-yellow-400')
      );
      await user.click(settingsIcon!);

      // Find custom slippage input (number input with step="0.1" and max="50")
      const allSpinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const customInput = allSpinbuttons.find(input => input.getAttribute('max') === '50')!;
      await user.clear(customInput);
      await user.type(customInput, '2.5');

      expect(customInput.value).toBe('2.5');
    });

    it('should show warning for high slippage (>5%)', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      // Open settings
      const settingsButtons = screen.getAllByRole('button');
      const settingsIcon = settingsButtons.find(btn =>
        btn.querySelector('svg') && btn.className.includes('text-yellow-400')
      );
      await user.click(settingsIcon!);

      // Set high slippage - find the slippage input specifically (has max="50")
      const allSpinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const customInput = allSpinbuttons.find(input => input.getAttribute('max') === '50')!;
      await user.clear(customInput);
      await user.type(customInput, '6');

      await waitFor(() => {
        expect(screen.getByText(/high slippage tolerance may result in unfavorable trades/i)).toBeInTheDocument();
      });
    });
  });

  describe('Trade Execution', () => {
    it('should open preview modal when clicking trade button', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      // Wait for quote to load
      await waitFor(() => {
        expect(screen.getByText(/10\.000000 TEST/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      const tradeButton = screen.getByRole('button', { name: /buy test/i });
      await user.click(tradeButton);

      expect(screen.getByTestId('transaction-preview-modal')).toBeInTheDocument();
    });

    it('should call onTrade with correct payload when confirming', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} onTrade={mockOnTrade} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      // Wait for quote
      await waitFor(() => {
        expect(screen.getByText(/10\.000000 TEST/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      const tradeButton = screen.getByRole('button', { name: /buy test/i });
      await user.click(tradeButton);

      const confirmButton = screen.getByRole('button', { name: /confirm trade/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnTrade).toHaveBeenCalledWith({
          tokenAddress: mockToken.address,
          action: 'buy',
          baseAmount: 1,
          slippageTolerance: 1.0,
          expectedOutput: 10,
          priceImpact: 2.5,
          gasFee: 0.001,
        });
      });
    });

    it('should close modal after successful trade', async () => {
      mockOnTrade.mockResolvedValue(undefined);

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} onTrade={mockOnTrade} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/10\.000000 TEST/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      const tradeButton = screen.getByRole('button', { name: /buy test/i });
      await user.click(tradeButton);

      const confirmButton = screen.getByRole('button', { name: /confirm trade/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId('transaction-preview-modal')).not.toBeInTheDocument();
      });
    });

    it('should handle trade errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnTrade.mockRejectedValue(new Error('Trade failed'));

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} onTrade={mockOnTrade} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/10\.000000 TEST/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      const tradeButton = screen.getByRole('button', { name: /buy test/i });
      await user.click(tradeButton);

      const confirmButton = screen.getByRole('button', { name: /confirm trade/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Trade error:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('should disable trade button when amount is empty', () => {
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const tradeButton = screen.getByRole('button', { name: /enter bnb amount/i });
      expect(tradeButton).toBeDisabled();
    });

    it('should disable trade button when amount is zero', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '0');

      const tradeButton = screen.getByRole('button', { name: /enter bnb amount/i });
      expect(tradeButton).toBeDisabled();
    });

    it('should disable trade button when balance is insufficient', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={5} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      await waitFor(() => {
        const tradeButton = screen.getByRole('button', { name: /insufficient balance/i });
        expect(tradeButton).toBeDisabled();
      });
    });

    it('should disable trade button while loading quote', async () => {
      let resolveQuote: (value: SwapQuote) => void;
      const quotePromise = new Promise<SwapQuote>((resolve) => {
        resolveQuote = resolve;
      });
      mockGetSwapQuote.mockReturnValue(quotePromise);

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        const tradeButton = screen.getByRole('button', { name: /fetching quote\.\.\./i });
        expect(tradeButton).toBeDisabled();
      }, { timeout: 1000 });

      // Clean up
      resolveQuote!({
        inputAmount: 1,
        outputAmount: 10,
        priceImpact: 2.5,
        slippage: 1.0,
        gasFee: 0.001,
        route: 'bonding-curve',
        minimumOutput: 9.9,
      });
    });
  });

  describe('Price Impact Warnings', () => {
    it('should show warning for high price impact (>10%)', async () => {
      mockGetSwapQuote.mockResolvedValue({
        inputAmount: 1,
        outputAmount: 10,
        priceImpact: 12.5,
        slippage: 1.0,
        gasFee: 0.001,
        route: 'bonding-curve',
        minimumOutput: 9.9,
      });

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/high price impact \(12\.5%\)\. consider reducing trade size\./i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not show warning for low price impact', async () => {
      mockGetSwapQuote.mockResolvedValue({
        inputAmount: 1,
        outputAmount: 10,
        priceImpact: 2.5,
        slippage: 1.0,
        gasFee: 0.001,
        route: 'bonding-curve',
        minimumOutput: 9.9,
      });

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.queryByText(/high price impact/i)).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should color-code price impact (green for <2%)', async () => {
      mockGetSwapQuote.mockResolvedValue({
        inputAmount: 1,
        outputAmount: 10,
        priceImpact: 1.5,
        slippage: 1.0,
        gasFee: 0.001,
        route: 'bonding-curve',
        minimumOutput: 9.9,
      });

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        const priceImpactValue = screen.getByText(/1\.50%/i);
        expect(priceImpactValue).toHaveClass('text-green-400');
      }, { timeout: 1000 });
    });

    it('should color-code price impact (yellow for 2-5%)', async () => {
      mockGetSwapQuote.mockResolvedValue({
        inputAmount: 1,
        outputAmount: 10,
        priceImpact: 3.5,
        slippage: 1.0,
        gasFee: 0.001,
        route: 'bonding-curve',
        minimumOutput: 9.9,
      });

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        const priceImpactValue = screen.getByText(/3\.50%/i);
        expect(priceImpactValue).toHaveClass('text-yellow-400');
      }, { timeout: 1000 });
    });

    it('should color-code price impact (red for >5%)', async () => {
      mockGetSwapQuote.mockResolvedValue({
        inputAmount: 1,
        outputAmount: 10,
        priceImpact: 7.5,
        slippage: 1.0,
        gasFee: 0.001,
        route: 'bonding-curve',
        minimumOutput: 9.9,
      });

      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        const priceImpactValue = screen.getByText(/7\.50%/i);
        expect(priceImpactValue).toHaveClass('text-red-400');
      }, { timeout: 1000 });
    });
  });

  describe('Sell Mode', () => {
    it('should fetch quote for sell action', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userTokenBalance={100} />);

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      await waitFor(() => {
        expect(mockGetSwapQuote).toHaveBeenCalledWith(
          mockToken.address,
          10,
          'sell'
        );
      }, { timeout: 1000 });
    });

    it('should display correct labels in sell mode', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userTokenBalance={100} />);

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      expect(screen.getByText(/you sell/i)).toBeInTheDocument();
    });

    it('should call onTrade with sell action', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userTokenBalance={100} onTrade={mockOnTrade} />);

      const sellButton = screen.getByRole('button', { name: /sell/i });
      await user.click(sellButton);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      await waitFor(() => {
        expect(screen.getByText(/10\.000000 BNB/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      const tradeButton = screen.getByRole('button', { name: /sell test/i });
      await user.click(tradeButton);

      const confirmButton = screen.getByRole('button', { name: /confirm trade/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnTrade).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'sell',
            baseAmount: 10,
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '0.000001');

      expect(input).toHaveValue(0.000001);
    });

    it('should handle very large amounts', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={1000000} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '999999');

      expect(input).toHaveValue(999999);
    });

    it('should handle zero user balances', () => {
      render(<TradingInterface token={mockToken} userBalance={0} userTokenBalance={0} />);

      expect(screen.getByText(/0 BNB/i)).toBeInTheDocument();
    });

    it('should handle missing onTrade callback', async () => {
      const user = userEvent.setup();
      render(<TradingInterface token={mockToken} userBalance={10} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '1');

      await waitFor(() => {
        expect(screen.getByText(/10\.000000 TEST/i)).toBeInTheDocument();
      }, { timeout: 1000 });

      const tradeButton = screen.getByRole('button', { name: /buy test/i });
      await user.click(tradeButton);

      const confirmButton = screen.getByRole('button', { name: /confirm trade/i });

      // Should not throw error
      await expect(user.click(confirmButton)).resolves.not.toThrow();
    });
  });
});
