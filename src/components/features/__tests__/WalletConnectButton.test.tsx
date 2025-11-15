import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletConnectButton, WalletStatus, useWalletGuard, WalletRequired } from '../WalletConnectButton';
import * as useMultichainWalletModule from '../../../hooks/useMultichainWallet';
import { renderHook } from '@testing-library/react';

// Mock dependencies
vi.mock('../../../hooks/useMultichainWallet');
vi.mock('../WalletSelectModal', () => ({
  WalletSelectModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="wallet-select-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}));

vi.mock('../../../utils', async () => {
  const actual = await vi.importActual('../../../utils');
  return {
    ...actual,
    copyToClipboard: vi.fn(),
  };
});

describe('WalletConnectButton', () => {
  const mockWalletDisconnected = {
    connected: false,
    isConnecting: false,
    address: null,
    balance: '0',
    balanceFormatted: '0.0000',
    chainId: null,
    error: null,
    availableConnectors: [{ id: 'metamask', name: 'MetaMask' }],
    disconnectWallet: vi.fn(),
    refreshBalance: vi.fn(),
  };

  const mockWalletConnected = {
    connected: true,
    isConnecting: false,
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    balance: '1.5678',
    balanceFormatted: '1.5678',
    chainId: 97,
    error: null,
    availableConnectors: [{ id: 'metamask', name: 'MetaMask' }],
    disconnectWallet: vi.fn(),
    refreshBalance: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.open
    global.open = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Disconnected State', () => {
    it('should render connect button when wallet is not connected', () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletDisconnected as any);

      render(<WalletConnectButton />);

      expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
    });

    it('should show connecting state', () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletDisconnected,
        isConnecting: true,
      } as any);

      render(<WalletConnectButton />);

      expect(screen.getByRole('button', { name: /connecting\.\.\./i })).toBeInTheDocument();
    });

    it('should disable button while connecting', () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletDisconnected,
        isConnecting: true,
      } as any);

      render(<WalletConnectButton />);

      const button = screen.getByRole('button', { name: /connecting\.\.\./i });
      expect(button).toBeDisabled();
    });

    it('should show error message when wallet.error exists', () => {
      const errorMessage = 'Failed to connect to wallet';
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletDisconnected,
        error: errorMessage,
      } as any);

      render(<WalletConnectButton />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should open wallet select modal when connect button is clicked', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletDisconnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);

      expect(screen.getByTestId('wallet-select-modal')).toBeInTheDocument();
    });

    it('should close wallet select modal when close is clicked', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletDisconnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open modal
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(screen.queryByTestId('wallet-select-modal')).not.toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    it('should display formatted address when connected', () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      render(<WalletConnectButton />);

      // Check for truncated address with ... separator
      expect(screen.getByText(/0x742d/)).toBeInTheDocument();
    });

    it('should show green indicator when connected', () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      render(<WalletConnectButton />);

      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should toggle dropdown when button is clicked', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      expect(screen.getByText(/account/i)).toBeInTheDocument();
      expect(screen.getByText(mockWalletConnected.address)).toBeInTheDocument();
    });

    it('should display full address in dropdown', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      expect(screen.getByText(mockWalletConnected.address)).toBeInTheDocument();
    });

    it('should display balance in dropdown', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      expect(screen.getByText(/1\.5678/i)).toBeInTheDocument();
    });

    it('should copy address to clipboard when copy button is clicked', async () => {
      const { copyToClipboard } = await import('../../../utils');
      vi.mocked(copyToClipboard).mockResolvedValue(true);

      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click copy button
      const copyButton = screen.getByTitle(/copy address/i);
      await user.click(copyButton);

      expect(copyToClipboard).toHaveBeenCalledWith(mockWalletConnected.address);

      await waitFor(() => {
        expect(screen.getByText(/address copied!/i)).toBeInTheDocument();
      });
    });

    it('should open blockchain explorer when explorer button is clicked', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click explorer button
      const explorerButton = screen.getByTitle(/view on explorer/i);
      await user.click(explorerButton);

      expect(global.open).toHaveBeenCalledWith(
        `https://testnet.bscscan.com/address/${mockWalletConnected.address}`,
        '_blank'
      );
    });

    it('should use correct explorer URL for mainnet', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletConnected,
        chainId: 56, // BSC Mainnet
      } as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click explorer button
      const explorerButton = screen.getByTitle(/view on explorer/i);
      await user.click(explorerButton);

      expect(global.open).toHaveBeenCalledWith(
        `https://bscscan.com/address/${mockWalletConnected.address}`,
        '_blank'
      );
    });

    it('should use correct explorer URL for Arbitrum', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletConnected,
        chainId: 42161, // Arbitrum One
      } as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click explorer button
      const explorerButton = screen.getByTitle(/view on explorer/i);
      await user.click(explorerButton);

      expect(global.open).toHaveBeenCalledWith(
        `https://arbiscan.io/address/${mockWalletConnected.address}`,
        '_blank'
      );
    });

    it('should use correct explorer URL for Base', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletConnected,
        chainId: 8453, // Base
      } as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click explorer button
      const explorerButton = screen.getByTitle(/view on explorer/i);
      await user.click(explorerButton);

      expect(global.open).toHaveBeenCalledWith(
        `https://basescan.org/address/${mockWalletConnected.address}`,
        '_blank'
      );
    });

    it('should call refreshBalance when refresh button is clicked', async () => {
      const refreshBalance = vi.fn();
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletConnected,
        refreshBalance,
      } as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(refreshBalance).toHaveBeenCalled();
    });

    it('should call disconnectWallet when disconnect button is clicked', async () => {
      const disconnectWallet = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletConnected,
        disconnectWallet,
      } as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click disconnect button
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await user.click(disconnectButton);

      expect(disconnectWallet).toHaveBeenCalled();
    });

    it('should close dropdown after disconnect', async () => {
      const disconnectWallet = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
        ...mockWalletConnected,
        disconnectWallet,
      } as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click disconnect
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(screen.queryByText(/account/i)).not.toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click outside (the overlay)
      const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
      await user.click(overlay);

      expect(screen.queryByText(/account/i)).not.toBeInTheDocument();
    });

    it('should show settings link in dropdown', async () => {
      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      const settingsLink = screen.getByRole('link', { name: /settings/i });
      expect(settingsLink).toHaveAttribute('href', '/settings');
    });
  });

  describe('Copy Feedback', () => {
    it('should show "Address copied!" message after successful copy', async () => {
      const { copyToClipboard } = await import('../../../utils');
      vi.mocked(copyToClipboard).mockResolvedValue(true);

      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click copy button
      const copyButton = screen.getByTitle(/copy address/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/address copied!/i)).toBeInTheDocument();
      });
    });

    it('should hide "Address copied!" message after 2 seconds', async () => {
      vi.useFakeTimers();

      const { copyToClipboard } = await import('../../../utils');
      vi.mocked(copyToClipboard).mockResolvedValue(true);

      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click copy button
      const copyButton = screen.getByTitle(/copy address/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/address copied!/i)).toBeInTheDocument();
      });

      // Fast-forward time by 2 seconds
      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.queryByText(/address copied!/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('should not show message if copy fails', async () => {
      const { copyToClipboard } = await import('../../../utils');
      vi.mocked(copyToClipboard).mockResolvedValue(false);

      vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue(mockWalletConnected as any);

      const user = userEvent.setup();
      render(<WalletConnectButton />);

      // Open dropdown
      // Find button by looking for element containing the truncated address
      const buttons = screen.getAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes('0x742d'))!;
      await user.click(button);

      // Click copy button
      const copyButton = screen.getByTitle(/copy address/i);
      await user.click(copyButton);

      // Wait a bit to ensure no message appears
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(screen.queryByText(/address copied!/i)).not.toBeInTheDocument();
    });
  });
});

describe('WalletStatus', () => {
  it('should show "Wallet not installed" when no connectors available', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [],
    } as any);

    render(<WalletStatus />);

    expect(screen.getByText(/wallet not installed/i)).toBeInTheDocument();
  });

  it('should show "Connecting..." when wallet is connecting', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      isConnecting: true,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    render(<WalletStatus />);

    expect(screen.getByText(/connecting\.\.\./i)).toBeInTheDocument();
  });

  it('should show "Connected" when wallet is connected', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: true,
      isConnecting: false,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    render(<WalletStatus />);

    expect(screen.getByText(/^connected$/i)).toBeInTheDocument();
  });

  it('should show "Not connected" when wallet is not connected', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      isConnecting: false,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    render(<WalletStatus />);

    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
  });
});

describe('useWalletGuard', () => {
  it('should throw error when no wallet is available', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [],
    } as any);

    const { result } = renderHook(() => useWalletGuard());

    expect(() => result.current.requireConnection()).toThrow('Wallet is not installed');
  });

  it('should throw error when wallet is not connected', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    const { result } = renderHook(() => useWalletGuard());

    expect(() => result.current.requireConnection()).toThrow('Please connect your wallet');
  });

  it('should include action in error message', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    const { result } = renderHook(() => useWalletGuard());

    expect(() => result.current.requireConnection('trade tokens')).toThrow('Please connect your wallet to trade tokens');
  });

  it('should return true when wallet is connected', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: true,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    const { result } = renderHook(() => useWalletGuard());

    expect(result.current.requireConnection()).toBe(true);
  });

  it('should expose wallet properties', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: true,
      address: '0x123',
      balance: '1.0',
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    const { result } = renderHook(() => useWalletGuard());

    expect(result.current.connected).toBe(true);
    expect(result.current.address).toBe('0x123');
    expect(result.current.balance).toBe('1.0');
  });
});

describe('WalletRequired', () => {
  it('should show fallback when no wallet is available', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [],
    } as any);

    render(
      <WalletRequired>
        <div>Protected Content</div>
      </WalletRequired>
    );

    expect(screen.getByText(/wallet required/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should show install wallet button when no wallet available', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [],
    } as any);

    render(
      <WalletRequired>
        <div>Protected Content</div>
      </WalletRequired>
    );

    expect(screen.getByRole('button', { name: /install wallet/i })).toBeInTheDocument();
  });

  it('should open MetaMask download page when install button is clicked', async () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [],
    } as any);

    const user = userEvent.setup();
    render(
      <WalletRequired>
        <div>Protected Content</div>
      </WalletRequired>
    );

    const installButton = screen.getByRole('button', { name: /install wallet/i });

    // Use fireEvent instead of user.click to avoid timing issues
    fireEvent.click(installButton);

    expect(global.open).toHaveBeenCalledWith('https://metamask.io/download/', '_blank');
  });

  it('should show connect prompt when wallet available but not connected', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      isConnecting: false,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    render(
      <WalletRequired>
        <div>Protected Content</div>
      </WalletRequired>
    );

    // Use getByRole to get the heading specifically
    expect(screen.getByRole('heading', { name: /connect your wallet/i })).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should render children when wallet is connected', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: true,
      availableConnectors: [{ id: 'metamask' }],
    } as any);

    render(
      <WalletRequired>
        <div>Protected Content</div>
      </WalletRequired>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
    expect(screen.queryByText(/wallet required/i)).not.toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    vi.spyOn(useMultichainWalletModule, 'useMultichainWallet').mockReturnValue({
      connected: false,
      availableConnectors: [],
    } as any);

    render(
      <WalletRequired fallback={<div>Custom Fallback</div>}>
        <div>Protected Content</div>
      </WalletRequired>
    );

    expect(screen.getByText(/custom fallback/i)).toBeInTheDocument();
    expect(screen.queryByText(/wallet required/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });
});
