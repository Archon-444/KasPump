'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnect } from 'wagmi';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';

interface WalletSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  onClick: () => void;
  isAvailable: boolean;
  installUrl?: string;
}

export const WalletSelectModal: React.FC<WalletSelectModalProps> = ({ isOpen, onClose }) => {
  const wallet = useMultichainWallet();
  const { connect, connectors, isPending } = useConnect();
  const [mounted, setMounted] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleConnect = async (connectorId: string) => {
    try {
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) return;

      setConnectingId(connectorId);
      await connect({ connector });
      onClose();
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setConnectingId(null);
    }
  };

  const detectInjected = () => {
    if (typeof window === 'undefined') return null;
    const eth = (window as any).ethereum;
    if (!eth) return null;
    if (eth.isMetaMask) return 'metaMask';
    if (eth.isTrust) return 'trust';
    if (eth.isRabby) return 'rabby';
    return 'injected';
  };

  const walletOptions: WalletOption[] = [
    {
      id: 'metaMask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Browser extension',
      onClick: () => handleConnect('metaMask'),
      isAvailable: connectors.some(c => c.id === 'metaMask') || detectInjected() === 'metaMask',
      installUrl: 'https://metamask.io/download/',
    },
    {
      id: 'walletConnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan QR code',
      onClick: () => handleConnect('walletConnect'),
      isAvailable: connectors.some(c => c.id === 'walletConnect'),
    },
    {
      id: 'coinbaseWallet',
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Coinbase app or extension',
      onClick: () => handleConnect('coinbaseWallet'),
      isAvailable: connectors.some(c => c.id === 'coinbaseWallet'),
      installUrl: 'https://www.coinbase.com/wallet',
    },
    {
      id: 'injected',
      name: 'Browser Wallet',
      icon: '🌐',
      description: 'Detected browser wallet',
      onClick: () => handleConnect('injected'),
      isAvailable: connectors.some(c => c.id === 'injected') && detectInjected() !== null,
    },
  ];

  const available = walletOptions.filter(w => w.isAvailable);
  const installable = walletOptions.filter(w => !w.isAvailable && w.installUrl);

  if (!mounted || typeof window === 'undefined' || !isOpen) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-[hsl(225,15%,7%)] border border-white/[0.08] rounded-2xl shadow-elevated overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-base font-semibold text-white">Connect Wallet</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Wallet List */}
            <div className="p-3 max-h-[60vh] overflow-y-auto">
              {available.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-2 mb-2">Available</p>
                  <div className="space-y-1">
                    {available.map((w) => {
                      const isConnecting = connectingId === w.id || (isPending && connectingId === w.id);
                      return (
                        <button
                          key={w.id}
                          onClick={w.onClick}
                          disabled={isPending}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-all duration-150 group disabled:opacity-50"
                        >
                          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-lg flex-shrink-0">
                            {w.icon}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors flex items-center gap-2">
                              {w.name}
                              {isConnecting && (
                                <div className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">{w.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {installable.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-2 mb-2">Install</p>
                  <div className="space-y-1">
                    {installable.map((w) => (
                      <a
                        key={w.id}
                        href={w.installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg flex-shrink-0 opacity-60">
                          {w.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm text-gray-400">{w.name}</div>
                          <div className="text-[10px] text-gray-600">Get wallet</div>
                        </div>
                        <ExternalLink size={12} className="text-gray-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {available.length === 0 && installable.length === 0 && (
                <div className="text-center py-8">
                  <Wallet size={28} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500">No wallets detected</p>
                  <p className="text-xs text-gray-600 mt-1">Install MetaMask to get started</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/[0.06]">
              <p className="text-[10px] text-gray-600 text-center">
                By connecting, you agree to the Terms of Service
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
