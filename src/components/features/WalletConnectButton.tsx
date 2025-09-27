// Real Wallet Connection Component (replaces mock version)
'use client';

import React from 'react';
import { Wallet, Power, Copy, ExternalLink } from 'lucide-react';
import { useKasplexWallet, formatKasBalance, formatAddress } from '../../hooks/useWallet';
import { Button } from '../ui';
import { cn, copyToClipboard } from '../../utils';

interface WalletConnectButtonProps {
  className?: string;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ className }) => {
  const wallet = useKasplexWallet();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [copySuccess, setCopySuccess] = React.useState(false);

  const handleCopyAddress = async () => {
    if (wallet.address) {
      const success = await copyToClipboard(wallet.address);
      if (success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  const handleConnect = async () => {
    try {
      await wallet.connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await wallet.disconnectWallet();
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  if (!wallet.isSupported) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="secondary"
          onClick={() => window.open('https://kasplex.io/wallet', '_blank')}
          icon={<Wallet size={16} />}
        >
          Install Kasplex Wallet
        </Button>
      </div>
    );
  }

  if (!wallet.connected) {
    return (
      <div className={cn("relative", className)}>
        <Button
          onClick={handleConnect}
          loading={wallet.isConnecting}
          disabled={wallet.isConnecting}
          icon={<Wallet size={16} />}
          variant="primary"
        >
          {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
        
        {wallet.error && (
          <div className="absolute top-full mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 max-w-sm">
            {wallet.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        variant="secondary"
        className="min-w-[160px] justify-between"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>{formatAddress(wallet.address!)}</span>
        </div>
        <svg
          className={cn("ml-2 h-4 w-4 transition-transform", showDropdown && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Account Info */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Account</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleCopyAddress}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                  title="Copy address"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => window.open(`https://explorer.kasplex.io/address/${wallet.address}`, '_blank')}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                  title="View on explorer"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
            <div className="font-mono text-sm text-gray-900 break-all">
              {wallet.address}
            </div>
            {copySuccess && (
              <div className="text-xs text-green-600 mt-1">Address copied!</div>
            )}
          </div>

          {/* Balance */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Balance</span>
              <button
                onClick={wallet.refreshBalance}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Refresh
              </button>
            </div>
            <div className="text-lg font-semibold text-gray-900 mt-1">
              {formatKasBalance(wallet.kasBalance)}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4">
            <Button
              onClick={handleDisconnect}
              variant="danger"
              size="sm"
              fullWidth
              icon={<Power size={14} />}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

// Wallet connection status indicator for other components
export const WalletStatus: React.FC<{ className?: string }> = ({ className }) => {
  const wallet = useKasplexWallet();

  if (!wallet.isSupported) {
    return (
      <div className={cn("flex items-center text-amber-600", className)}>
        <div className="w-2 h-2 bg-amber-500 rounded-full mr-2" />
        <span className="text-sm">Wallet not installed</span>
      </div>
    );
  }

  if (wallet.isConnecting) {
    return (
      <div className={cn("flex items-center text-blue-600", className)}>
        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse" />
        <span className="text-sm">Connecting...</span>
      </div>
    );
  }

  if (wallet.connected) {
    return (
      <div className={cn("flex items-center text-green-600", className)}>
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
        <span className="text-sm">Connected</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center text-red-600", className)}>
      <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
      <span className="text-sm">Not connected</span>
    </div>
  );
};

// Hook for wallet connection requirements in other components
export const useWalletGuard = () => {
  const wallet = useKasplexWallet();

  const requireConnection = (action: string = 'perform this action') => {
    if (!wallet.isSupported) {
      throw new Error('Kasplex wallet is not installed. Please install it to continue.');
    }
    
    if (!wallet.connected) {
      throw new Error(`Please connect your wallet to ${action}.`);
    }

    return true;
  };

  return {
    ...wallet,
    requireConnection,
  };
};

// Component for showing wallet requirements
export const WalletRequired: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const wallet = useKasplexWallet();

  if (!wallet.isSupported) {
    return (
      fallback || (
        <div className="text-center p-8 bg-amber-50 rounded-lg border border-amber-200">
          <Wallet size={48} className="mx-auto text-amber-600 mb-4" />
          <h3 className="text-lg font-semibold text-amber-800 mb-2">
            Kasplex Wallet Required
          </h3>
          <p className="text-amber-700 mb-4">
            You need to install the Kasplex wallet to use this feature.
          </p>
          <Button
            onClick={() => window.open('https://kasplex.io/wallet', '_blank')}
            variant="primary"
          >
            Install Wallet
          </Button>
        </div>
      )
    );
  }

  if (!wallet.connected) {
    return (
      fallback || (
        <div className="text-center p-8 bg-blue-50 rounded-lg border border-blue-200">
          <Wallet size={48} className="mx-auto text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-blue-700 mb-4">
            Please connect your Kasplex wallet to continue.
          </p>
          <WalletConnectButton />
        </div>
      )
    );
  }

  return <>{children}</>;
};
