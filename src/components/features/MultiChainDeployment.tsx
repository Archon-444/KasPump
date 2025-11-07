'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, AlertCircle, Network } from 'lucide-react';
import { Card, Button } from '../ui';
import { DeploymentState } from '../../hooks/useMultiChainDeployment';
import { cn } from '../../utils';
import { getChainMetadata, getExplorerUrl } from '../../config/chains';

export interface MultiChainDeploymentProps {
  deployments: DeploymentState[];
  selectedChains: number[];
  onChainToggle: (chainId: number) => void;
  onDeploy: () => void;
  onCancel: () => void;
  isDeploying: boolean;
  deploymentMode: 'sequential' | 'parallel';
  onModeChange: (mode: 'sequential' | 'parallel') => void;
  className?: string;
}

export const MultiChainDeployment: React.FC<MultiChainDeploymentProps> = ({
  deployments,
  selectedChains,
  onChainToggle,
  onDeploy,
  onCancel,
  isDeploying,
  deploymentMode,
  onModeChange,
  className
}) => {
  const mainnetChains = [
    { chainId: 56, name: 'BSC' },
    { chainId: 42161, name: 'Arbitrum' },
    { chainId: 8453, name: 'Base' },
  ];

  const getStatusIcon = (status: DeploymentState['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'error':
        return <XCircle size={20} className="text-red-400" />;
      case 'deploying':
      case 'switching':
        return <Loader2 size={20} className="text-yellow-400 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
    }
  };

  const getStatusColor = (status: DeploymentState['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-500/50 bg-green-500/10';
      case 'error':
        return 'border-red-500/50 bg-red-500/10';
      case 'deploying':
      case 'switching':
        return 'border-yellow-500/50 bg-yellow-500/10';
      default:
        return 'border-gray-700 bg-gray-800/30';
    }
  };

  const allComplete = deployments.length > 0 && deployments.every(d => 
    d.status === 'success' || d.status === 'error'
  );
  const hasSuccess = deployments.some(d => d.status === 'success');
  const hasErrors = deployments.some(d => d.status === 'error');

  return (
    <div className={cn('space-y-6', className)}>
      {/* Deployment Mode Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Multi-Chain Deployment</h3>
          <p className="text-sm text-gray-400">
            Deploy your token across multiple blockchains simultaneously
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
          <button
            onClick={() => onModeChange('sequential')}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-all',
              deploymentMode === 'sequential'
                ? 'bg-yellow-500 text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Sequential
          </button>
          <button
            onClick={() => onModeChange('parallel')}
            className={cn(
              'px-3 py-1.5 rounded text-sm font-medium transition-all',
              deploymentMode === 'parallel'
                ? 'bg-yellow-500 text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            Parallel
          </button>
        </div>
      </div>

      {/* Chain Selection */}
      {!isDeploying && (
        <Card className="glassmorphism">
          <div className="p-4">
            <div className="text-sm font-medium text-white mb-4">Select Chains</div>
            <div className="grid grid-cols-3 gap-3">
              {mainnetChains.map((chain) => {
                const metadata = getChainMetadata(chain.chainId);
                const isSelected = selectedChains.includes(chain.chainId);
                const chainColor = metadata?.color || '#6B7280';

                return (
                  <motion.button
                    key={chain.chainId}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onChainToggle(chain.chainId)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chainColor }}
                      />
                      <span className="font-semibold text-white">{chain.name}</span>
                      {isSelected && (
                        <CheckCircle size={16} className="text-yellow-400 ml-auto" />
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      ~$0.10
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Deployment Progress */}
      {isDeploying && deployments.length > 0 && (
        <div className="space-y-3">
          {deployments.map((deployment) => {
            const metadata = getChainMetadata(deployment.chainId);
            const chainColor = metadata?.color || '#6B7280';
            const explorerUrl = deployment.result?.txHash 
              ? getExplorerUrl(deployment.chainId, 'tx', deployment.result.txHash)
              : null;

            return (
              <motion.div
                key={deployment.chainId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  getStatusColor(deployment.status)
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: chainColor }}
                    />
                    <span className="font-semibold text-white">{deployment.chainName}</span>
                    {getStatusIcon(deployment.status)}
                  </div>
                  <div className="text-sm font-semibold text-gray-400">
                    {deployment.progress}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${deployment.progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${chainColor}80, ${chainColor})`
                    }}
                  />
                </div>

                {/* Status Message */}
                <div className="text-sm">
                  {deployment.status === 'pending' && (
                    <span className="text-gray-400">Waiting to deploy...</span>
                  )}
                  {deployment.status === 'switching' && (
                    <span className="text-yellow-400">Switching network...</span>
                  )}
                  {deployment.status === 'deploying' && (
                    <span className="text-yellow-400">Deploying token contract...</span>
                  )}
                  {deployment.status === 'success' && deployment.result && (
                    <div className="space-y-1">
                      <div className="text-green-400 font-medium">✓ Deployment successful!</div>
                      <div className="text-xs text-gray-400 space-y-0.5">
                        <div>Token: {truncateAddress(deployment.result.tokenAddress || '')}</div>
                        <div>AMM: {truncateAddress(deployment.result.ammAddress || '')}</div>
                        {explorerUrl && (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:text-yellow-300 underline"
                          >
                            View on explorer →
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {deployment.status === 'error' && (
                    <div className="text-red-400">
                      <AlertCircle size={14} className="inline mr-1" />
                      {deployment.error || 'Deployment failed'}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      {!isDeploying && (
        <div className="flex space-x-4">
          <Button variant="secondary" onClick={onCancel} fullWidth>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onDeploy}
            disabled={selectedChains.length === 0}
            fullWidth
            className="btn-glow-purple"
          >
            Deploy to {selectedChains.length} Chain{selectedChains.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {/* Completion Summary */}
      {allComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-3">
            <Network size={20} className="text-yellow-400" />
            <span className="font-semibold text-white">Deployment Complete</span>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <div>
              ✓ {hasSuccess && deployments.filter(d => d.status === 'success').length} successful
            </div>
            {hasErrors && (
              <div className="text-red-400">
                ✗ {deployments.filter(d => d.status === 'error').length} failed
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

function truncateAddress(address: string, startLength = 6, endLength = 4): string {
  if (address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

