'use client';

import React from 'react';
import { Wallet, Power, Copy, ExternalLink, Settings, ChevronDown } from 'lucide-react';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { WalletSelectModal } from './WalletSelectModal';
import { Button } from '../ui';
import { cn, copyToClipboard, truncateAddress } from '../../utils';

interface WalletConnectButtonProps {
  className?: string;
}

const formatBalance = (balance: string): string => {
  const num = parseFloat(balance);
  if (num === 0) return '0.00';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(4);
  return num.toFixed(2);
};

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({ className }) => {
  const wallet = useMultichainWallet();
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [showWalletModal, setShowWalletModal] = React.useState(false);
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

  const handleDisconnect = async () => {
    try {
      await wallet.disconnectWallet();
      setShowDropdown(false);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  if (!wallet.connected) {
    return (
      <>
        <button
          onClick={() => setShowWalletModal(true)}
          disabled={wallet.isConnecting}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
            'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-glow-sm',
            'hover:from-yellow-400 hover:to-orange-400 hover:shadow-glow',
            'active:scale-[0.97]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
        >
          {wallet.isConnecting ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Wallet size={14} />
          )}
          <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>

        <WalletSelectModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
        />
      </>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200',
          'bg-white/[0.06] border border-white/[0.08] text-gray-200',
          'hover:bg-white/[0.1] hover:border-white/[0.12]',
          'active:scale-[0.97]'
        )}
      >
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-[8px] font-bold text-white">
          {wallet.address!.slice(2, 4).toUpperCase()}
        </div>
        <span className="font-mono">{truncateAddress(wallet.address!, 4, 3)}</span>
        <ChevronDown size={12} className={cn('text-gray-500 transition-transform', showDropdown && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute top-full right-0 mt-2 w-72 bg-[hsl(225,15%,8%)] border border-white/[0.08] rounded-2xl shadow-elevated z-50 overflow-hidden animate-scale-in">
            {/* Address */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Account</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
                    title="Copy address"
                  >
                    <Copy size={12} className={copySuccess ? 'text-green-400' : ''} />
                  </button>
                  <button
                    onClick={() => {
                      const base = wallet.chainId === 97 ? 'https://testnet.bscscan.com'
                        : wallet.chainId === 56 ? 'https://bscscan.com'
                        : wallet.chainId === 42161 ? 'https://arbiscan.io'
                        : wallet.chainId === 8453 ? 'https://basescan.org'
                        : 'https://testnet.bscscan.com';
                      window.open(`${base}/address/${wallet.address}`, '_blank');
                    }}
                    className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
              <code className="text-xs text-gray-300 font-mono break-all leading-relaxed">
                {wallet.address}
              </code>
              {copySuccess && (
                <p className="text-[10px] text-green-400 mt-1">Copied!</p>
              )}
            </div>

            {/* Balance */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Balance</span>
                <button
                  onClick={wallet.refreshBalance}
                  className="text-[10px] text-yellow-400/70 hover:text-yellow-400 transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="text-lg font-bold text-white mt-1 tabular-nums font-mono">
                {wallet.balanceFormatted || formatBalance(wallet.balance)} <span className="text-xs text-gray-500 font-sans">BNB</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2">
              <a
                href="/settings"
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                <Settings size={13} />
                Settings
              </a>
              <a
                href={`/profile/${wallet.address}`}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                <Wallet size={13} />
                My Profile
              </a>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] rounded-lg transition-colors"
              >
                <Power size={13} />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}

      <WalletSelectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </div>
  );
};

export const WalletStatus: React.FC<{ className?: string }> = ({ className }) => {
  const wallet = useMultichainWallet();

  if (wallet.isConnecting) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
        <span className="text-[10px] text-gray-400">Connecting...</span>
      </div>
    );
  }

  if (wallet.connected) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        <span className="text-[10px] text-gray-400">Connected</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
      <span className="text-[10px] text-gray-500">Not connected</span>
    </div>
  );
};

export const useWalletGuard = () => {
  const wallet = useMultichainWallet();

  const requireConnection = (action: string = 'perform this action') => {
    if (!wallet.connected) {
      throw new Error(`Please connect your wallet to ${action}.`);
    }
    return true;
  };

  return { ...wallet, requireConnection };
};

export const WalletRequired: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const wallet = useMultichainWallet();

  if (!wallet.connected) {
    return (
      fallback || (
        <div className="text-center p-10 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
            <Wallet size={24} className="text-gray-500" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1.5">
            Connect Your Wallet
          </h3>
          <p className="text-sm text-gray-500 mb-5">
            Please connect your wallet to continue.
          </p>
          <WalletConnectButton />
        </div>
      )
    );
  }

  return <>{children}</>;
};
