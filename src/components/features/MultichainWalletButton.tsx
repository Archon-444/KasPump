// Multichain Wallet Connection Component
'use client';

import React, { useState } from 'react';
import { Wallet, Power, Copy, ExternalLink, ChevronDown } from 'lucide-react';
import { useMultichainWallet, formatAddress } from '../../hooks/useMultichainWallet';
import { Button } from '../ui';
import { cn, copyToClipboard } from '../../utils';
import { getExplorerUrl, getChainMetadata } from '../../config/chains';

interface MultichainWalletButtonProps {
  className?: string;
}

export const MultichainWalletButton: React.FC<MultichainWalletButtonProps> = ({ className }) => {
  const wallet = useMultichainWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
    await wallet.disconnectWallet();
    setShowDropdown(false);
  };

  const chainMeta = wallet.chainId ? getChainMetadata(wallet.chainId) : null;
  const explorerUrl = wallet.address && wallet.chainId
    ? getExplorerUrl(wallet.chainId, 'address', wallet.address)
    : '';

  // Not connected - show connect options
  if (!wallet.connected) {
    return (
      <>
        <div className={cn("relative", className)}>
          <Button
            onClick={() => setShowConnectModal(true)}
            loading={wallet.isConnecting}
            disabled={wallet.isConnecting}
            icon={<Wallet size={16} />}
            variant="primary"
          >
            {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>

          {wallet.error && (
            <div className="absolute top-full mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 max-w-sm backdrop-blur-sm z-50">
              {wallet.error}
            </div>
          )}
        </div>

        {/* Connect Modal */}
        {showConnectModal && (
          <>
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setShowConnectModal(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
                  <button
                    onClick={() => setShowConnectModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {/* MetaMask */}
                  <button
                    onClick={async () => {
                      await wallet.connectInjected();
                      setShowConnectModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 border border-white/10 rounded-xl hover:border-yellow-500/30 hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
                        <Wallet size={20} className="text-orange-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">MetaMask</div>
                        <div className="text-sm text-gray-400">Connect using MetaMask</div>
                      </div>
                    </div>
                    <ChevronDown className="rotate-[-90deg] text-gray-500" size={20} />
                  </button>

                  {/* WalletConnect */}
                  <button
                    onClick={async () => {
                      await wallet.connectWalletConnect();
                      setShowConnectModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 border border-white/10 rounded-xl hover:border-yellow-500/30 hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
                        <Wallet size={20} className="text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">WalletConnect</div>
                        <div className="text-sm text-gray-400">Scan with mobile wallet</div>
                      </div>
                    </div>
                    <ChevronDown className="rotate-[-90deg] text-gray-500" size={20} />
                  </button>

                  {/* Coinbase Wallet */}
                  <button
                    onClick={async () => {
                      await wallet.connectCoinbase();
                      setShowConnectModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 border border-white/10 rounded-xl hover:border-yellow-500/30 hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
                        <Wallet size={20} className="text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white">Coinbase Wallet</div>
                        <div className="text-sm text-gray-400">Connect using Coinbase</div>
                      </div>
                    </div>
                    <ChevronDown className="rotate-[-90deg] text-gray-500" size={20} />
                  </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                  By connecting, you agree to our Terms of Service
                </div>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // Connected - show account info
  return (
    <div className={cn("relative", className)}>
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        variant="secondary"
        className="min-w-[180px] justify-between"
      >
        <div className="flex items-center space-x-2">
          {chainMeta && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: chainMeta.color }}
            />
          )}
          <span className="font-mono text-sm">{formatAddress(wallet.address!)}</span>
        </div>
        <ChevronDown
          className={cn("ml-2 h-4 w-4 transition-transform", showDropdown && "rotate-180")}
        />
      </Button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50">
            {/* Network Info */}
            {chainMeta && (
              <div className="p-4 border-b border-white/5">
                <div className="text-xs font-medium text-gray-400 mb-2">Network</div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: chainMeta.color }}
                  />
                  <span className="font-semibold text-white">{chainMeta.name}</span>
                  <span className="text-xs text-gray-500">({chainMeta.shortName})</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Fees: {chainMeta.estimatedFees} • Block time: {chainMeta.blockTime}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Account</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Copy address"
                  >
                    <Copy size={14} />
                  </button>
                  {explorerUrl && (
                    <button
                      onClick={() => window.open(explorerUrl, '_blank')}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="font-mono text-xs text-gray-300 break-all bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                {wallet.address}
              </div>
              {copySuccess && (
                <div className="text-xs text-green-400 mt-1">Address copied!</div>
              )}
              {wallet.connectorName && (
                <div className="text-xs text-gray-500 mt-2">
                  Connected via {wallet.connectorName}
                </div>
              )}
            </div>

            {/* Balance */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-400">Balance</span>
                <button
                  onClick={wallet.refreshBalance}
                  className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="text-lg font-semibold text-white">
                {wallet.balanceFormatted}
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
        </>
      )}
    </div>
  );
};

// Export wallet status indicator
export const WalletStatus: React.FC<{ className?: string }> = ({ className }) => {
  const wallet = useMultichainWallet();

  if (wallet.isConnecting) {
    return (
      <div className={cn("flex items-center text-blue-400", className)}>
        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse" />
        <span className="text-sm">Connecting...</span>
      </div>
    );
  }

  if (wallet.connected) {
    return (
      <div className={cn("flex items-center text-green-400", className)}>
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
        <span className="text-sm">Connected to {wallet.chainName}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center text-gray-400", className)}>
      <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
      <span className="text-sm">Not connected</span>
    </div>
  );
};
