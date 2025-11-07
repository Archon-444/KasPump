// Network Selector Component for Multichain Support
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Check, ChevronDown, Loader2, Zap, Shield } from 'lucide-react';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { Button } from '../ui';
import { cn } from '../../utils';
import { supportedChains, getChainMetadata, isTestnet } from '../../config/chains';

interface NetworkSelectorProps {
  className?: string;
  showTestnets?: boolean;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  className,
  showTestnets = false,
}) => {
  const wallet = useMultichainWallet();
  const [showDropdown, setShowDropdown] = useState(false);

  const currentChain = wallet.chainId;
  const currentChainMeta = currentChain ? getChainMetadata(currentChain) : null;

  const handleNetworkSwitch = async (chainId: number) => {
    const success = await wallet.switchNetwork(chainId);
    if (success) {
      setShowDropdown(false);
    }
  };

  // Filter chains based on testnet preference
  const displayChains = supportedChains.filter(
    (chain) => showTestnets || !isTestnet(chain.id)
  );

  if (!wallet.connected) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="secondary"
          disabled
          icon={<Network size={16} />}
          className="opacity-50"
        >
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={wallet.isSwitchingNetwork}
        className={cn(
          "min-w-[160px] flex items-center justify-between gap-3 px-4 py-2.5",
          "bg-gray-800/50 border border-gray-700 rounded-lg",
          "hover:bg-gray-800 hover:border-yellow-500/30",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          wallet.isSwitchingNetwork && "cursor-wait"
        )}
      >
        <div className="flex items-center space-x-2.5 flex-1 min-w-0">
          <Network size={16} className="text-yellow-400 flex-shrink-0" />
          {currentChainMeta ? (
            <>
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-yellow-500/30"
                style={{ backgroundColor: currentChainMeta.color }}
              />
              <span className="text-sm font-medium text-white truncate">
                {currentChainMeta.shortName}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-gray-400">Unknown</span>
          )}
        </div>
        {wallet.isSwitchingNetwork ? (
          <Loader2 size={16} className="text-yellow-400 animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-400 transition-transform duration-200 flex-shrink-0",
              showDropdown && "rotate-180 text-yellow-400"
            )}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-80 glassmorphism border border-gray-700 rounded-xl shadow-2xl z-50 max-h-[500px] overflow-y-auto scrollbar-hide"
            >
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="font-semibold text-white text-lg flex items-center space-x-2">
                  <Network size={18} className="text-yellow-400" />
                  <span>Select Network</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Switch to a different blockchain network
                </p>
              </div>

              {/* Mainnets */}
              <div className="p-3">
                <div className="text-xs font-medium text-gray-400 px-3 py-2 uppercase tracking-wider">
                  Mainnets
                </div>
                <div className="space-y-1">
                  {displayChains
                    .filter((chain) => !isTestnet(chain.id))
                    .map((chain, index) => {
                      const meta = getChainMetadata(chain.id);
                      const isActive = chain.id === currentChain;
                      const isSwitching = wallet.isSwitchingNetwork;

                      return (
                        <motion.button
                          key={chain.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleNetworkSwitch(chain.id)}
                          disabled={isActive || isSwitching}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200",
                            "border-2",
                            isActive
                              ? "bg-yellow-500/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20"
                              : "border-transparent hover:border-gray-600 hover:bg-gray-800/50",
                            (isSwitching && !isActive) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-gray-900 transition-all",
                                isActive && "ring-yellow-500/50 scale-110"
                              )}
                              style={{ 
                                backgroundColor: meta.color
                              }}
                            />
                            <div className="text-left flex-1">
                              <div className="font-semibold text-sm text-white flex items-center space-x-2">
                                <span>{meta.name}</span>
                                {isActive && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full"
                                  >
                                    Active
                                  </motion.span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-400">{meta.estimatedFees}</span>
                                <span className="text-gray-600">•</span>
                                <span className="text-xs text-gray-400">{meta.blockTime}</span>
                              </div>
                            </div>
                          </div>
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex-shrink-0"
                            >
                              <Check size={20} className="text-yellow-400" />
                            </motion.div>
                          )}
                          {isSwitching && chain.id === currentChain && (
                            <Loader2 size={20} className="text-yellow-400 animate-spin flex-shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                </div>
              </div>

              {/* Testnets */}
              {showTestnets && (
                <div className="p-3 border-t border-gray-700/50">
                  <div className="text-xs font-medium text-gray-400 px-3 py-2 uppercase tracking-wider">
                    Testnets
                  </div>
                  <div className="space-y-1">
                    {displayChains
                      .filter((chain) => isTestnet(chain.id))
                      .map((chain, index) => {
                        const meta = getChainMetadata(chain.id);
                        const isActive = chain.id === currentChain;

                        return (
                          <motion.button
                            key={chain.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleNetworkSwitch(chain.id)}
                            disabled={isActive}
                            className={cn(
                              "w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200",
                              "border-2",
                              isActive
                                ? "bg-yellow-500/20 border-yellow-500/50 shadow-lg shadow-yellow-500/20"
                                : "border-transparent hover:border-gray-600 hover:bg-gray-800/50"
                            )}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-gray-900 transition-all",
                                  isActive && "ring-yellow-500/50 scale-110"
                                )}
                                style={{ 
                                  backgroundColor: meta.color
                                }}
                              />
                              <div className="text-left flex-1">
                                <div className="font-semibold text-sm text-white flex items-center space-x-2">
                                  <span>{meta.name}</span>
                                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30">
                                    Testnet
                                  </span>
                                  {isActive && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full"
                                    >
                                      Active
                                    </motion.span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{meta.estimatedFees}</div>
                              </div>
                            </div>
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex-shrink-0"
                              >
                                <Check size={20} className="text-yellow-400" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Network info footer */}
              {currentChainMeta && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 border-t border-gray-700/50 bg-gray-800/30"
                >
                  <div className="text-xs">
                    <div className="font-medium text-white mb-2 flex items-center space-x-2">
                      <Shield size={14} className="text-yellow-400" />
                      <span>Network Features</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentChainMeta.features.map((feature, index) => (
                        <motion.span
                          key={feature}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-gray-700/50 border border-gray-600 rounded-lg text-xs text-gray-300"
                        >
                          <Zap size={10} className="text-yellow-400" />
                          <span>{feature}</span>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Compact network indicator (for mobile)
export const NetworkIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const wallet = useMultichainWallet();
  const chainMeta = wallet.chainId ? getChainMetadata(wallet.chainId) : null;

  if (!wallet.connected || !chainMeta) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={cn(
        "flex items-center space-x-2 text-sm px-3 py-1.5",
        "bg-gray-800/50 border border-gray-700 rounded-lg",
        "hover:border-yellow-500/30 transition-colors",
        className
      )}
    >
      <div
        className="w-2.5 h-2.5 rounded-full ring-2 ring-yellow-500/20"
        style={{ backgroundColor: chainMeta.color }}
      />
      <span className="font-medium text-white">{chainMeta.shortName}</span>
    </motion.div>
  );
};
