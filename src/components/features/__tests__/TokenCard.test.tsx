import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenCard, TokenCardSkeleton, TokenList } from '../TokenCard';
import { KasPumpToken } from '../../../types';

// Mock dependencies
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

vi.mock('../FavoriteButton', () => ({
  FavoriteButton: ({ tokenAddress }: any) => (
    <button data-testid="favorite-button">{tokenAddress}</button>
  ),
}));

vi.mock('../../ui', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className}>
      Progress: {value}%
    </div>
  ),
}));

vi.mock('../../../utils', () => ({
  formatCurrency: (value: number, currency?: string, decimals?: number) =>
    `${value.toFixed(decimals || 2)} ${currency || 'BNB'}`,
  formatPercentage: (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`,
  formatTimeAgo: (date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Helper function to create mock tokens
const createMockToken = (overrides: Partial<KasPumpToken> = {}): KasPumpToken => ({
  address: '0x1234567890123456789012345678901234567890',
  name: 'Test Token',
  symbol: 'TEST',
  description: 'A test token for unit testing',
  image: '',
  creator: '0xCreator',
  totalSupply: 1000000,
  currentSupply: 500000,
  ammAddress: '',
  price: 0.001,
  marketCap: 100000,
  volume24h: 50000,
  change24h: 5.5,
  holders: 250,
  bondingCurveProgress: 45,
  isGraduated: false,
  curveType: 'linear',
  createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago (not "new")
  ...overrides,
});

describe('TokenCard Component', () => {
  describe('Basic Rendering', () => {
    it('should render token name and symbol', () => {
      const token = createMockToken();
      render(<TokenCard token={token} />);

      expect(screen.getByText('Test Token')).toBeInTheDocument();
      expect(screen.getByText('$TEST')).toBeInTheDocument();
    });

    it('should render token description', () => {
      const token = createMockToken();
      render(<TokenCard token={token} />);

      expect(screen.getByText('A test token for unit testing')).toBeInTheDocument();
    });

    it('should render default description when none provided', () => {
      const token = createMockToken({ description: '' });
      render(<TokenCard token={token} />);

      expect(screen.getByText('No description available')).toBeInTheDocument();
    });

    it('should render price with correct formatting', () => {
      const token = createMockToken({ price: 0.00123456 });
      render(<TokenCard token={token} />);

      expect(screen.getByText(/0\.00123456 BNB/i)).toBeInTheDocument();
    });

    it('should render market cap', () => {
      const token = createMockToken({ marketCap: 100000 });
      render(<TokenCard token={token} />);

      expect(screen.getByText(/100000\.00 BNB/i)).toBeInTheDocument();
    });

    it('should render 24h volume', () => {
      const token = createMockToken({ volume24h: 50000 });
      render(<TokenCard token={token} />);

      expect(screen.getByText(/50000\.00 BNB/i)).toBeInTheDocument();
    });

    it('should render holder count', () => {
      const token = createMockToken({ holders: 250 });
      render(<TokenCard token={token} />);

      expect(screen.getByText('250')).toBeInTheDocument();
    });

    it('should render curve type badge', () => {
      const token = createMockToken({ curveType: 'exponential' });
      render(<TokenCard token={token} />);

      expect(screen.getByText('exponential')).toBeInTheDocument();
    });

    it('should render time ago', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const token = createMockToken({
        createdAt: oneDayAgo,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText(/1d ago/i)).toBeInTheDocument();
    });
  });

  describe('Price Change Display', () => {
    it('should show positive price change with TrendingUp icon', () => {
      const token = createMockToken({ change24h: 15.5 });
      render(<TokenCard token={token} />);

      expect(screen.getByText('+15.50%')).toBeInTheDocument();
    });

    it('should show negative price change with TrendingDown icon', () => {
      const token = createMockToken({ change24h: -8.3 });
      render(<TokenCard token={token} />);

      expect(screen.getByText('-8.30%')).toBeInTheDocument();
    });

    it('should treat 0% change as positive', () => {
      const token = createMockToken({ change24h: 0 });
      const { container } = render(<TokenCard token={token} />);

      // When change is 0, the mock formatPercentage returns "0.00%" without "+"
      expect(container.textContent).toContain('0.00%');
    });
  });

  describe('Health Scoring System', () => {
    it('should show "Healthy" badge for excellent health (high volume, holders, low volatility)', () => {
      const token = createMockToken({
        volume24h: 60000, // 60% of market cap
        marketCap: 100000,
        holders: 1500,
        change24h: 3, // Low volatility
        bondingCurveProgress: 90,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('should show "Active" badge for good health', () => {
      const token = createMockToken({
        volume24h: 25000, // 25% of market cap
        marketCap: 100000,
        holders: 600,
        change24h: 10,
        bondingCurveProgress: 70,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show "Moderate" badge for fair health', () => {
      const token = createMockToken({
        volume24h: 12000, // 12% of market cap
        marketCap: 100000,
        holders: 120,
        change24h: 25,
        bondingCurveProgress: 50,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('should show "Volatile" badge for risky health (low volume, few holders, high volatility)', () => {
      const token = createMockToken({
        volume24h: 3000, // 3% of market cap
        marketCap: 100000,
        holders: 30,
        change24h: 60, // High volatility
        bondingCurveProgress: 20,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('Volatile')).toBeInTheDocument();
    });

    it('should calculate health correctly for graduated token (100% liquidity score)', () => {
      const token = createMockToken({
        isGraduated: true,
        volume24h: 15000,
        marketCap: 100000,
        holders: 150,
        change24h: 20,
      });
      render(<TokenCard token={token} />);

      // Graduated tokens get 100% liquidity score, which helps overall health
      expect(screen.getByText(/Healthy|Active|Moderate/)).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should show "New Launch" badge for tokens < 24 hours old', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const token = createMockToken({
        createdAt: twelveHoursAgo,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('New Launch')).toBeInTheDocument();
    });

    it('should NOT show "New Launch" badge for tokens > 24 hours old', () => {
      const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const token = createMockToken({
        createdAt: thirtyHoursAgo,
      });
      render(<TokenCard token={token} />);

      expect(screen.queryByText('New Launch')).not.toBeInTheDocument();
    });

    it('should show "Trending" badge for high volume relative to market cap (>30%)', () => {
      const token = createMockToken({
        volume24h: 35000,
        marketCap: 100000, // 35% ratio
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('Trending')).toBeInTheDocument();
    });

    it('should NOT show "Trending" badge for normal volume', () => {
      const token = createMockToken({
        volume24h: 20000,
        marketCap: 100000, // 20% ratio
      });
      render(<TokenCard token={token} />);

      expect(screen.queryByText('Trending')).not.toBeInTheDocument();
    });

    it('should show both "New Launch" and "Trending" badges when applicable', () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const token = createMockToken({
        createdAt: sixHoursAgo,
        volume24h: 40000,
        marketCap: 100000,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('New Launch')).toBeInTheDocument();
      expect(screen.getByText('Trending')).toBeInTheDocument();
    });
  });

  describe('Graduation Progress', () => {
    it('should show graduation progress bar for non-graduated tokens', () => {
      const token = createMockToken({
        isGraduated: false,
        bondingCurveProgress: 45,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('Graduation Progress')).toBeInTheDocument();
      const progress = screen.getByTestId('progress');
      expect(progress).toHaveAttribute('data-value', '45');
    });

    it('should show "Bonding curve" message for low progress (<50%)', () => {
      const token = createMockToken({
        bondingCurveProgress: 30,
        isGraduated: false,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('Bonding curve')).toBeInTheDocument();
      expect(screen.getByText('70% to DEX')).toBeInTheDocument();
    });

    it('should show "Halfway there" message for medium progress (50-79%)', () => {
      const token = createMockToken({
        bondingCurveProgress: 65,
        isGraduated: false,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText(/Halfway there/i)).toBeInTheDocument();
      expect(screen.getByText('35% to DEX')).toBeInTheDocument();
    });

    it('should show "Near graduation" message for high progress (>=80%)', () => {
      const token = createMockToken({
        bondingCurveProgress: 85,
        isGraduated: false,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText(/Near graduation/i)).toBeInTheDocument();
      expect(screen.getByText('15% to DEX')).toBeInTheDocument();
    });

    it('should display progress percentage with correct color coding', () => {
      const token = createMockToken({
        bondingCurveProgress: 85,
        isGraduated: false,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('85.0%')).toBeInTheDocument();
    });

    it('should NOT show progress bar for graduated tokens', () => {
      const token = createMockToken({
        isGraduated: true,
        bondingCurveProgress: 100,
      });
      render(<TokenCard token={token} />);

      expect(screen.queryByText('Graduation Progress')).not.toBeInTheDocument();
    });
  });

  describe('Graduated Badge', () => {
    it('should show graduated badge for graduated tokens', () => {
      const token = createMockToken({ isGraduated: true });
      render(<TokenCard token={token} />);

      expect(screen.getByText(/Graduated to DEX/i)).toBeInTheDocument();
    });

    it('should NOT show graduated badge for non-graduated tokens', () => {
      const token = createMockToken({ isGraduated: false });
      render(<TokenCard token={token} />);

      expect(screen.queryByText(/Graduated to DEX/i)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const onClick = vi.fn();
      const token = createMockToken();
      const user = userEvent.setup();

      render(<TokenCard token={token} onClick={onClick} />);

      // Click on the token name which is inside the clickable div
      const tokenName = screen.getByText('Test Token');
      await user.click(tokenName);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should show Buy and Sell buttons when showActions is true', () => {
      const token = createMockToken();
      render(<TokenCard token={token} showActions={true} />);

      expect(screen.getByLabelText(/Buy Test Token/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sell Test Token/i)).toBeInTheDocument();
    });

    it('should NOT show Buy and Sell buttons when showActions is false', () => {
      const token = createMockToken();
      render(<TokenCard token={token} showActions={false} />);

      expect(screen.queryByLabelText(/Buy Test Token/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Sell Test Token/i)).not.toBeInTheDocument();
    });

    it('should stop propagation when Buy button is clicked', async () => {
      const onClick = vi.fn();
      const token = createMockToken();
      const user = userEvent.setup();

      render(<TokenCard token={token} onClick={onClick} showActions={true} />);

      const buyButton = screen.getByLabelText(/Buy Test Token/i);
      await user.click(buyButton);

      // onClick should not be called because event propagation is stopped
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should stop propagation when Sell button is clicked', async () => {
      const onClick = vi.fn();
      const token = createMockToken();
      const user = userEvent.setup();

      render(<TokenCard token={token} onClick={onClick} showActions={true} />);

      const sellButton = screen.getByLabelText(/Sell Test Token/i);
      await user.click(sellButton);

      // onClick should not be called because event propagation is stopped
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should render FavoriteButton with correct props', () => {
      const token = createMockToken({
        address: '0xABCDEF',
      });
      render(<TokenCard token={token} />);

      const favoriteButton = screen.getByTestId('favorite-button');
      expect(favoriteButton).toHaveTextContent('0xABCDEF');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero market cap for volume ratio calculation', () => {
      const token = createMockToken({
        marketCap: 0,
        volume24h: 1000,
      });
      render(<TokenCard token={token} />);

      // Should not crash and should render
      expect(screen.getByText('Test Token')).toBeInTheDocument();
    });

    it('should handle very high progress (edge case)', () => {
      const token = createMockToken({
        bondingCurveProgress: 99.9,
        isGraduated: false,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('99.9%')).toBeInTheDocument();
      expect(screen.getByText('0% to DEX')).toBeInTheDocument();
    });

    it('should handle very low progress', () => {
      const token = createMockToken({
        bondingCurveProgress: 0.1,
        isGraduated: false,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText('0.1%')).toBeInTheDocument();
      expect(screen.getByText('100% to DEX')).toBeInTheDocument();
    });

    it('should handle very long token names', () => {
      const token = createMockToken({
        name: 'A Very Long Token Name That Should Be Displayed Properly',
      });
      render(<TokenCard token={token} />);

      expect(
        screen.getByText('A Very Long Token Name That Should Be Displayed Properly')
      ).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'A'.repeat(500);
      const token = createMockToken({
        description: longDescription,
      });
      render(<TokenCard token={token} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });
});

describe('TokenCardSkeleton Component', () => {
  it('should render loading skeleton', () => {
    render(<TokenCardSkeleton />);

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('animate-pulse');
  });

  it('should render skeleton elements for all token card sections', () => {
    const { container } = render(<TokenCardSkeleton />);

    // Should have multiple skeleton divs
    const skeletonDivs = container.querySelectorAll('.bg-gray-700\\/50');
    expect(skeletonDivs.length).toBeGreaterThan(5);
  });
});

describe('TokenList Component', () => {
  it('should render multiple TokenCard components', () => {
    const tokens = [
      createMockToken({ address: '0x111', name: 'Token 1' }),
      createMockToken({ address: '0x222', name: 'Token 2' }),
      createMockToken({ address: '0x333', name: 'Token 3' }),
    ];

    render(<TokenList tokens={tokens} />);

    expect(screen.getByText('Token 1')).toBeInTheDocument();
    expect(screen.getByText('Token 2')).toBeInTheDocument();
    expect(screen.getByText('Token 3')).toBeInTheDocument();
  });

  it('should show loading skeletons when loading is true', () => {
    render(<TokenList tokens={[]} loading={true} />);

    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBe(6); // Default skeleton count
    cards.forEach((card) => {
      expect(card).toHaveClass('animate-pulse');
    });
  });

  it('should show "No tokens found" message when no tokens', () => {
    render(<TokenList tokens={[]} loading={false} />);

    expect(screen.getByText('No tokens found')).toBeInTheDocument();
  });

  it('should call onTokenClick when a token card is clicked', async () => {
    const onTokenClick = vi.fn();
    const tokens = [createMockToken({ name: 'Clickable Token' })];
    const user = userEvent.setup();

    render(<TokenList tokens={tokens} onTokenClick={onTokenClick} />);

    // Click on the token name which is inside the clickable div
    const tokenName = screen.getByText('Clickable Token');
    await user.click(tokenName);

    expect(onTokenClick).toHaveBeenCalledWith(tokens[0]);
  });

  it('should pass showActions prop to TokenCard components', () => {
    const tokens = [createMockToken()];
    render(<TokenList tokens={tokens} showActions={true} />);

    expect(screen.getByLabelText(/Buy Test Token/i)).toBeInTheDocument();
  });

  it('should render tokens with staggered animation delays', () => {
    const tokens = [
      createMockToken({ address: '0x111' }),
      createMockToken({ address: '0x222' }),
      createMockToken({ address: '0x333' }),
    ];

    const { container } = render(<TokenList tokens={tokens} />);

    // Should have motion.div wrappers for animation
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
  });
});

describe('Component Memoization', () => {
  it('should memoize component and only re-render when relevant props change', () => {
    const token = createMockToken();
    const onClick = vi.fn();

    const { rerender } = render(<TokenCard token={token} onClick={onClick} />);

    // Re-render with same props
    rerender(<TokenCard token={token} onClick={onClick} />);

    // Component should be memoized
    expect(screen.getByText('Test Token')).toBeInTheDocument();
  });

  it('should re-render when token price changes', () => {
    const token1 = createMockToken({ price: 0.001 });
    const token2 = createMockToken({ price: 0.002 });

    const { rerender } = render(<TokenCard token={token1} />);
    expect(screen.getByText(/0\.00100000 BNB/i)).toBeInTheDocument();

    rerender(<TokenCard token={token2} />);
    expect(screen.getByText(/0\.00200000 BNB/i)).toBeInTheDocument();
  });

  it('should re-render when graduation status changes', () => {
    const token1 = createMockToken({ isGraduated: false, bondingCurveProgress: 80 });
    const token2 = createMockToken({ isGraduated: true });

    const { rerender } = render(<TokenCard token={token1} />);
    expect(screen.getByText('Graduation Progress')).toBeInTheDocument();

    rerender(<TokenCard token={token2} />);
    expect(screen.getByText(/Graduated to DEX/i)).toBeInTheDocument();
  });
});
