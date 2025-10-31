// Network Selector Component for Multichain Support
'use client';

import React, { useState } from 'react';
import { Network, Check, ChevronDown } from 'lucide-react';
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
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        variant="secondary"
        icon={<Network size={16} />}
        className="min-w-[160px] justify-between"
        loading={wallet.isSwitchingNetwork}
      >
        <div className="flex items-center space-x-2">
          {currentChainMeta && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentChainMeta.color }}
            />
          )}
          <span>{currentChainMeta?.shortName || 'Unknown'}</span>
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
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[500px] overflow-y-auto">
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Select Network</h3>
              <p className="text-xs text-gray-500 mt-1">
                Switch to a different blockchain network
              </p>
            </div>

            {/* Mainnets */}
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1">Mainnets</div>
              {displayChains
                .filter((chain) => !isTestnet(chain.id))
                .map((chain) => {
                  const meta = getChainMetadata(chain.id);
                  const isActive = chain.id === currentChain;

                  return (
                    <button
                      key={chain.id}
                      onClick={() => handleNetworkSwitch(chain.id)}
                      disabled={isActive}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-blue-50 border-2 border-blue-500"
                          : "hover:bg-gray-50 border-2 border-transparent"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <div className="text-left">
                          <div className="font-semibold text-sm">{meta.name}</div>
                          <div className="text-xs text-gray-500">{meta.estimatedFees}</div>
                        </div>
                      </div>
                      {isActive && (
                        <Check size={18} className="text-blue-600" />
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Testnets */}
            {showTestnets && (
              <div className="p-2 border-t border-gray-100">
                <div className="text-xs font-medium text-gray-500 px-2 py-1">Testnets</div>
                {displayChains
                  .filter((chain) => isTestnet(chain.id))
                  .map((chain) => {
                    const meta = getChainMetadata(chain.id);
                    const isActive = chain.id === currentChain;

                    return (
                      <button
                        key={chain.id}
                        onClick={() => handleNetworkSwitch(chain.id)}
                        disabled={isActive}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                          isActive
                            ? "bg-blue-50 border-2 border-blue-500"
                            : "hover:bg-gray-50 border-2 border-transparent"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          <div className="text-left">
                            <div className="font-semibold text-sm">{meta.name}</div>
                            <div className="text-xs text-gray-500">{meta.estimatedFees}</div>
                          </div>
                        </div>
                        {isActive && (
                          <Check size={18} className="text-blue-600" />
                        )}
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Network info footer */}
            {currentChainMeta && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <div className="text-xs text-gray-600">
                  <div className="font-medium mb-1">Current Network Features:</div>
                  <div className="flex flex-wrap gap-1">
                    {currentChainMeta.features.map((feature) => (
                      <span
                        key={feature}
                        className="inline-block px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Compact network indicator (for mobile)
export const NetworkIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const wallet = useMultichainWallet();
  const chainMeta = wallet.chainId ? getChainMetadata(wallet.chainId) : null;

  if (!wallet.connected || !chainMeta) return null;

  return (
    <div className={cn("flex items-center space-x-2 text-sm", className)}>
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: chainMeta.color }}
      />
      <span className="font-medium">{chainMeta.shortName}</span>
    </div>
  );
};
