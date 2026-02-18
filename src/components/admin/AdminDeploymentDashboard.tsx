'use client';

import React, { useState } from 'react';
import { Card, Badge, Button } from '../ui';
import { CheckCircle2, XCircle, Copy, ExternalLink, RefreshCw, AlertCircle, Globe, Zap } from 'lucide-react';
import { copyToClipboard, truncateAddress } from '../../utils';

// Local card sub-components (shadcn-style wrappers not available in ui/index)
const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`p-6 pb-2 ${className || ''}`}>{children}</div>
);
const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className || ''}`}>{children}</h3>
);
const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={`text-sm text-slate-400 ${className || ''}`}>{children}</p>
);
const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`p-6 pt-0 ${className || ''}`}>{children}</div>
);

// Import deployment data
import deployments from '../../../deployments.json';

interface DeploymentInfo {
  name: string;
  contracts: {
    [key: string]: string;
  };
  deployedAt: string | null;
  deployer?: string;
  blockNumber?: number;
  deterministicSalt?: string;
  isDeterministic?: boolean;
}

interface DeploymentsData {
  [chainId: string]: DeploymentInfo;
}

const typedDeployments: DeploymentsData = deployments;

// Network metadata
const NETWORK_META: Record<string, { icon: string; explorerUrl: string; rpcUrl: string; isTestnet: boolean }> = {
  '56': { icon: '🟡', explorerUrl: 'https://bscscan.com', rpcUrl: 'https://bsc-dataseed1.binance.org', isTestnet: false },
  '97': { icon: '🟡', explorerUrl: 'https://testnet.bscscan.com', rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545', isTestnet: true },
  '42161': { icon: '🔵', explorerUrl: 'https://arbiscan.io', rpcUrl: 'https://arb1.arbitrum.io/rpc', isTestnet: false },
  '421614': { icon: '🔵', explorerUrl: 'https://sepolia.arbiscan.io', rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc', isTestnet: true },
  '8453': { icon: '⚪', explorerUrl: 'https://basescan.org', rpcUrl: 'https://mainnet.base.org', isTestnet: false },
  '84532': { icon: '⚪', explorerUrl: 'https://sepolia.basescan.org', rpcUrl: 'https://sepolia.base.org', isTestnet: true },
};

export const AdminDeploymentDashboard: React.FC = () => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = async (address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  const getDeploymentStatus = (deployment: DeploymentInfo): 'deployed' | 'partial' | 'not-deployed' => {
    const addresses = Object.values(deployment.contracts);
    const deployedCount = addresses.filter(addr => addr && addr !== '').length;

    if (deployedCount === 0) return 'not-deployed';
    if (deployedCount === addresses.length) return 'deployed';
    return 'partial';
  };

  const getStatusBadge = (status: 'deployed' | 'partial' | 'not-deployed') => {
    switch (status) {
      case 'deployed':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 size={12} className="mr-1" />
            Deployed
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle size={12} className="mr-1" />
            Partial
          </Badge>
        );
      case 'not-deployed':
        return (
          <Badge variant="default" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <XCircle size={12} className="mr-1" />
            Not Deployed
          </Badge>
        );
    }
  };

  // Separate testnets and mainnets
  const testnets = Object.entries(typedDeployments).filter(([chainId]) => NETWORK_META[chainId]?.isTestnet);
  const mainnets = Object.entries(typedDeployments).filter(([chainId]) => !NETWORK_META[chainId]?.isTestnet);

  const renderNetworkCard = (chainId: string, deployment: DeploymentInfo) => {
    const meta = NETWORK_META[chainId];
    const status = getDeploymentStatus(deployment);
    const contractEntries = Object.entries(deployment.contracts);

    return (
      <Card key={chainId} className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meta?.icon}</span>
              <div>
                <CardTitle className="text-white text-lg">{deployment.name}</CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Chain ID: {chainId}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contracts */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300">Contracts</h4>
            {contractEntries.map(([name, address]) => (
              <div key={name} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                <span className="text-sm text-slate-400">{name}</span>
                {address && address !== '' ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-white font-mono bg-slate-800 px-2 py-1 rounded">
                      {truncateAddress(address)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopy(address)}
                    >
                      <Copy size={12} className={copiedAddress === address ? 'text-green-400' : 'text-slate-400'} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => window.open(`${meta?.explorerUrl}/address/${address}`, '_blank')}
                    >
                      <ExternalLink size={12} className="text-slate-400" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Not deployed</span>
                )}
              </div>
            ))}
          </div>

          {/* Deployment Info */}
          {deployment.deployedAt && (
            <div className="space-y-2 pt-2 border-t border-slate-700/50">
              <h4 className="text-sm font-semibold text-slate-300">Deployment Info</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Deployed At:</span>
                  <div className="text-slate-300 mt-1">
                    {new Date(deployment.deployedAt).toLocaleString()}
                  </div>
                </div>
                {deployment.blockNumber && (
                  <div>
                    <span className="text-slate-500">Block Number:</span>
                    <div className="text-slate-300 mt-1">
                      #{deployment.blockNumber.toLocaleString()}
                    </div>
                  </div>
                )}
                {deployment.deployer && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Deployer:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-slate-300 font-mono">
                        {truncateAddress(deployment.deployer)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleCopy(deployment.deployer!)}
                      >
                        <Copy size={10} className={copiedAddress === deployment.deployer ? 'text-green-400' : 'text-slate-400'} />
                      </Button>
                    </div>
                  </div>
                )}
                {deployment.isDeterministic && (
                  <div className="col-span-2">
                    <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <Zap size={10} className="mr-1" />
                      Deterministic Deployment
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => window.open(meta?.explorerUrl, '_blank')}
            >
              <Globe size={12} className="mr-1" />
              Explorer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                // This would trigger a refresh/verification
                console.log(`Verifying deployment on chain ${chainId}`);
              }}
            >
              <RefreshCw size={12} className="mr-1" />
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Summary statistics
  const totalNetworks = Object.keys(typedDeployments).length;
  const fullyDeployed = Object.values(typedDeployments).filter(d => getDeploymentStatus(d) === 'deployed').length;
  const partiallyDeployed = Object.values(typedDeployments).filter(d => getDeploymentStatus(d) === 'partial').length;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Deployment Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Manage and monitor smart contract deployments across all supported networks
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{totalNetworks}</div>
                <div className="text-sm text-slate-400 mt-1">Total Networks</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{fullyDeployed}</div>
                <div className="text-sm text-slate-400 mt-1">Fully Deployed</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{partiallyDeployed}</div>
                <div className="text-sm text-slate-400 mt-1">Partial Deployments</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mainnets */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Mainnet Deployments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainnets.map(([chainId, deployment]) => renderNetworkCard(chainId, deployment))}
        </div>
      </div>

      {/* Testnets */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Testnet Deployments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testnets.map(([chainId, deployment]) => renderNetworkCard(chainId, deployment))}
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Deployment Commands</h3>
          <div className="space-y-2 text-xs text-blue-200/80">
            <div className="flex items-start gap-2">
              <code className="bg-slate-900/50 px-2 py-1 rounded flex-1">npm run deploy:&lt;network&gt;</code>
              <span className="text-slate-400">Standard deployment</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-slate-900/50 px-2 py-1 rounded flex-1">npm run deploy:deterministic:&lt;network&gt;</code>
              <span className="text-slate-400">CREATE2 deployment</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="bg-slate-900/50 px-2 py-1 rounded flex-1">npm run verify:deployment</code>
              <span className="text-slate-400">Verify contracts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
