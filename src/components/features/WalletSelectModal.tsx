'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, X, ExternalLink, QrCode, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnect } from 'wagmi';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { useMobileWallet } from '../../hooks/useMobileWallet';
import { Button } from '../ui';
import { cn } from '../../utils';

interface WalletSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  onClick: () => void;
  isAvailable: boolean;
  installUrl?: string;
}

export const WalletSelectModal: React.FC<WalletSelectModalProps> = ({ isOpen, onClose }) => {
  const wallet = useMultichainWallet();
  const { connect, connectors, isPending } = useConnect();
  
  // Use portal to render modal at root level (above everything)
  // MUST be called before any conditional returns (Rules of Hooks)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async (connectorId: string) => {
    try {
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        console.error(`Connector ${connectorId} not found. Available connectors:`, connectors.map(c => c.id));
        alert(`Wallet connector "${connectorId}" is not available. Please try another option.`);
        return;
      }
      
      console.log(`Attempting to connect with ${connectorId}...`);
      await connect({ connector });
      console.log(`Successfully connected with ${connectorId}`);
      onClose();
    } catch (error: any) {
      console.error('Failed to connect:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      alert(`Failed to connect wallet: ${errorMessage}`);
    }
  };

  const detectInjectedWallet = () => {
    if (typeof window === 'undefined') return null;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;
    
    if (ethereum.isMetaMask) return 'metaMask';
    if (ethereum.isTrust || ethereum.isTrustWallet) return 'trust';
    if (ethereum.isRabby) return 'rabby';
    if (ethereum.isOKExWallet || ethereum.okexchain) return 'okx';
    if (ethereum.isTokenPocket) return 'tokenpocket';
    if (ethereum.isBinance) return 'binance';
    return 'injected';
  };

  const walletOptions: WalletOption[] = [
    {
      id: 'metaMask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask extension',
      onClick: () => handleConnect('metaMask'),
      isAvailable: connectors.some(c => c.id === 'metaMask') || detectInjectedWallet() === 'metaMask',
      installUrl: 'https://metamask.io/download/',
    },
    {
      id: 'walletConnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan QR code with any WalletConnect-compatible wallet',
      onClick: () => handleConnect('walletConnect'),
      isAvailable: connectors.some(c => c.id === 'walletConnect'),
    },
    {
      id: 'coinbaseWallet',
      name: 'Coinbase Wallet',
      icon: '📱',
      description: 'Connect using Coinbase Wallet',
      onClick: () => handleConnect('coinbaseWallet'),
      isAvailable: connectors.some(c => c.id === 'coinbaseWallet') || false,
      installUrl: 'https://www.coinbase.com/wallet',
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '🛡️',
      description: 'Connect using Trust Wallet extension',
      onClick: () => handleConnect('injected'),
      isAvailable: detectInjectedWallet() === 'trust' || connectors.some(c => c.id === 'injected'),
      installUrl: 'https://trustwallet.com/download',
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      icon: '🐰',
      description: 'Connect using Rabby extension',
      onClick: () => handleConnect('injected'),
      isAvailable: detectInjectedWallet() === 'rabby' || wallet.availableConnectors?.some(c => c.id === 'injected'),
      installUrl: 'https://rabby.io/',
    },
    {
      id: 'okx',
      name: 'OKX Wallet',
      icon: '⚡',
      description: 'Connect using OKX Wallet extension',
      onClick: () => handleConnect('injected'),
      isAvailable: detectInjectedWallet() === 'okx' || wallet.availableConnectors?.some(c => c.id === 'injected'),
      installUrl: 'https://www.okx.com/web3',
    },
    {
      id: 'binance',
      name: 'Binance Wallet',
      icon: '🟡',
      description: 'Connect using Binance Wallet extension',
      onClick: () => handleConnect('injected'),
      isAvailable: detectInjectedWallet() === 'binance' || wallet.availableConnectors?.some(c => c.id === 'injected'),
      installUrl: 'https://www.binance.com/en/web3wallet',
    },
    {
      id: 'injected',
      name: 'Browser Wallet',
      icon: '🌐',
      description: 'Connect using your browser wallet',
      onClick: () => handleConnect('injected'),
      isAvailable: wallet.availableConnectors?.some(c => c.id === 'injected') && detectInjectedWallet() !== null,
    },
  ];

  const availableWallets = walletOptions.filter(w => w.isAvailable);
  const installableWallets = walletOptions.filter(w => !w.isAvailable && w.installUrl);

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('WalletSelectModal opened');
      console.log('Available connectors:', connectors.map(c => c.id));
      console.log('Available wallets:', availableWallets.map(w => w.name));
    }
  }, [isOpen, connectors, availableWallets]);

  // Don't render portal on server side or if not mounted
  if (!mounted || typeof window === 'undefined' || !isOpen) {
    return null;
  }

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-hidden"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            pointerEvents: 'auto',
            maxWidth: '100vw',
            maxHeight: '100vh',
          }}
        >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full overflow-hidden"
          style={{
            maxWidth: 'min(28rem, calc(100vw - 2rem))',
            maxHeight: 'calc(100vh - 2rem)',
            margin: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            <p className="text-gray-400 text-sm mb-6">
              Choose a wallet to connect to KasPump
            </p>

            {/* Available Wallets */}
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Available Wallets</h3>
              {availableWallets.map((wallet) => (
                <motion.button
                  key={wallet.id}
                  onClick={wallet.onClick}
                  className="w-full flex items-center space-x-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-all hover:border-purple-500/50 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isPending}
                >
                  <div className="text-3xl">{wallet.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                      {wallet.name}
                      {isPending && (
                        <span className="text-xs text-purple-400 animate-pulse">Connecting...</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{wallet.description}</div>
                  </div>
                  {wallet.id === 'walletConnect' && (
                    <ExternalLink size={16} className="text-gray-400" />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Install Wallets */}
            {installableWallets.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Get a Wallet</h3>
                {installableWallets.map((wallet) => (
                  <a
                    key={wallet.id}
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full flex items-center space-x-4 p-4 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl transition-all"
                  >
                    <div className="text-3xl">{wallet.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-300">{wallet.name}</div>
                      <div className="text-xs text-gray-500">Install to connect</div>
                    </div>
                    <ExternalLink size={16} className="text-gray-500" />
                  </a>
                ))}
              </div>
            )}

            {availableWallets.length === 0 && installableWallets.length === 0 && (
              <div className="text-center py-8">
                <Wallet size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">
                  No wallets detected. Please install a wallet to continue.
                </p>
              </div>
            )}
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Render modal in portal at document body level
  // This ensures it's above all other content including headers
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  
  if (!portalTarget) {
    return null;
  }

  return createPortal(modalContent, portalTarget);
};

