'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  FileText,
  BarChart3,
  Droplets,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Settings,
  AlertTriangle,
  Upload,
  Loader,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Button, Input, Textarea, Select, Card, Alert } from '../../components/ui';
import { Stepper } from '../../components/ui/Stepper';
import { BondingCurveSimulator } from '../../components/features/BondingCurveSimulator';
import { WalletRequired } from '../../components/features/WalletConnectButton';
import { useContracts } from '../../hooks/useContracts';
import { useTokenCreationState } from '../../hooks/useTokenCreationState';
import { useIPFSUpload } from '../../hooks/useIPFSUpload';
import { isIPFSConfigured } from '../../lib/ipfs';
import { getChainById } from '../../config/chains';
import { areContractsDeployed, getSupportedChains, getChainName } from '../../config/contracts';
import { isValidTokenName, isValidTokenSymbol, cn } from '../../utils';
import { ConfettiSuccess } from '../../components/features/ConfettiSuccess';
import { AmbientBackground } from '../../components/ui/enhanced';

const WIZARD_STEPS = [
  { label: 'Basics', description: 'Name & description', icon: <FileText size={16} /> },
  { label: 'Tokenomics', description: 'Supply & allocation', icon: <BarChart3 size={16} /> },
  { label: 'Curve', description: 'Bonding curve settings', icon: <Sparkles size={16} /> },
  { label: 'Liquidity', description: 'Image & branding', icon: <Droplets size={16} /> },
  { label: 'Review', description: 'Confirm & launch', icon: <CheckCircle size={16} /> },
];

export default function LaunchPage() {
  const router = useRouter();
  const contracts = useContracts();
  const { chainId } = useAccount();
  const ipfsUpload = useIPFSUpload();

  const currentChain = chainId ? getChainById(chainId) : null;
  const nativeCurrencySymbol = currentChain?.nativeCurrency?.symbol || 'BNB';
  const contractsDeployed = chainId ? areContractsDeployed(chainId) : false;

  const [wizardStep, setWizardStep] = useState(1);
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
  const [showConfetti, setShowConfetti] = useState(false);
  const [immutableCheckbox, setImmutableCheckbox] = useState(false);

  const tokenCreationState = useTokenCreationState({
    contracts,
    chainId,
    onSuccess: () => {
      setShowConfetti(true);
    },
    nativeCurrencySymbol,
  });

  // Local form errors for step validation
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!tokenCreationState.formData.name.trim()) {
        errors.name = 'Token name is required';
      } else if (!isValidTokenName(tokenCreationState.formData.name)) {
        errors.name = 'Invalid token name format';
      }
      if (!tokenCreationState.formData.symbol.trim()) {
        errors.symbol = 'Token symbol is required';
      } else if (!isValidTokenSymbol(tokenCreationState.formData.symbol.toUpperCase())) {
        errors.symbol = 'Symbol must be 1-10 uppercase letters/numbers';
      }
    }

    if (step === 2) {
      if (tokenCreationState.formData.totalSupply < 1000000) {
        errors.totalSupply = 'Minimum supply is 1,000,000';
      } else if (tokenCreationState.formData.totalSupply > 1000000000000) {
        errors.totalSupply = 'Maximum supply is 1 trillion';
      }
    }

    if (step === 3) {
      if (tokenCreationState.formData.basePrice <= 0) {
        errors.basePrice = 'Base price must be positive';
      }
      if (tokenCreationState.formData.slope <= 0) {
        errors.slope = 'Slope must be positive';
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(wizardStep)) {
      setWizardStep(Math.min(wizardStep + 1, 5));
    }
  };

  const handleBack = () => {
    setStepErrors({});
    setWizardStep(Math.max(wizardStep - 1, 1));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStepErrors({ image: 'File too large (max 2MB)' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setStepErrors({ image: 'Only JPEG, PNG, or GIF allowed' });
      return;
    }
    setStepErrors({});
    tokenCreationState.updateFormData({ image: file });
    if (isIPFSConfigured()) {
      try {
        await ipfsUpload.uploadImage(file);
      } catch (error) {
        console.error('IPFS upload failed:', error);
      }
    }
  };

  const handleLaunch = async () => {
    if (!immutableCheckbox || !contractsDeployed) return;

    tokenCreationState.setCreationStep('creating');
    try {
      await tokenCreationState.handleConfirmCreation(ipfsUpload.ipfsImageUrl);
    } catch (error) {
      console.error('Launch failed:', error);
    }
  };

  // Recommended presets for beginners
  const presets = [
    { label: 'Standard Meme', supply: 1000000000, curveType: 'linear' as const, basePrice: 0.000001, slope: 0.00000001 },
    { label: 'Deflationary', supply: 100000000, curveType: 'exponential' as const, basePrice: 0.00001, slope: 0.0000001 },
    { label: 'Community Launch', supply: 10000000000, curveType: 'linear' as const, basePrice: 0.0000001, slope: 0.000000001 },
  ];

  const estimatedGasCost = 0.005;

  // Rendering based on creation state
  if (tokenCreationState.creationStep === 'creating') {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <AmbientBackground colorScheme="yellow" />
        <div className="text-center z-10">
          <Loader className="mx-auto h-16 w-16 animate-spin text-yellow-500 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Launching your token...</h2>
          <p className="text-gray-400">Please confirm the transaction in your wallet and wait for confirmation.</p>
        </div>
      </div>
    );
  }

  if (tokenCreationState.creationStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <AmbientBackground colorScheme="green" />
        <ConfettiSuccess trigger={showConfetti} duration={5000} />
        <div className="text-center z-10 max-w-md mx-auto px-4">
          <CheckCircle className="mx-auto h-20 w-20 text-green-500 mb-6" />
          <h2 className="text-3xl font-bold text-white mb-3">Token Launched!</h2>
          <p className="text-gray-400 mb-8">
            Your token <span className="text-yellow-400 font-semibold">{tokenCreationState.formData.name}</span> ({tokenCreationState.formData.symbol}) is now live and ready for trading.
          </p>
          {tokenCreationState.creationResult && (
            <Card className="bg-gray-800/30 text-left mb-6 p-4">
              <div className="space-y-2 text-sm">
                {tokenCreationState.creationResult.tokenAddress && (
                  <div>
                    <span className="text-gray-400">Token:</span>{' '}
                    <span className="text-white font-mono text-xs">
                      {tokenCreationState.creationResult.tokenAddress}
                    </span>
                  </div>
                )}
                {tokenCreationState.creationResult.txHash && (
                  <div>
                    <span className="text-gray-400">Transaction:</span>{' '}
                    <span className="text-white font-mono text-xs">
                      {tokenCreationState.creationResult.txHash}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/')} fullWidth>
              Browse Tokens
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (tokenCreationState.creationResult?.tokenAddress) {
                  router.push(`/tokens/${tokenCreationState.creationResult.tokenAddress}`);
                } else {
                  router.push('/');
                }
              }}
              fullWidth
              className="bg-gradient-to-r from-yellow-500 to-orange-500"
            >
              Start Trading
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tokenCreationState.creationStep === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <AmbientBackground colorScheme="yellow" />
        <div className="text-center z-10 max-w-md mx-auto px-4">
          <AlertTriangle className="mx-auto h-20 w-20 text-red-500 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Launch Failed</h2>
          <p className="text-red-400 mb-8">{tokenCreationState.creationError}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => tokenCreationState.setCreationStep('form')} fullWidth>
              Try Again
            </Button>
            <Button variant="primary" onClick={() => router.push('/')} fullWidth>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AmbientBackground colorScheme="yellow" showOrbs={true} showStars={true} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Rocket className="text-yellow-400" size={28} />
              Launch New Token
            </h1>
            <p className="text-gray-400 mt-1">
              Create and deploy your token in under 3 minutes
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setMode('beginner')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'beginner'
                  ? 'bg-yellow-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Sparkles size={14} className="inline mr-1" />
              Guided
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'advanced'
                  ? 'bg-yellow-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Settings size={14} className="inline mr-1" />
              Advanced
            </button>
          </div>
        </div>

        <WalletRequired>
          {/* Contract Warning */}
          {!contractsDeployed && chainId && (
            <Alert variant="danger" className="mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Contracts not deployed on {getChainName(chainId)}</p>
                  <p className="text-sm mt-1">
                    Please switch to a supported chain: {getSupportedChains().map(id => getChainName(id)).join(', ')}
                  </p>
                </div>
              </div>
            </Alert>
          )}

          {/* Stepper */}
          <div className="mb-8">
            <Stepper
              steps={WIZARD_STEPS}
              currentStep={wizardStep}
              onStepClick={(step) => {
                if (step <= wizardStep) {
                  setStepErrors({});
                  setWizardStep(step);
                }
              }}
            />
          </div>

          {/* Two-column layout on desktop: form + live preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form Area (2 cols) */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {/* Step 1: Basics */}
                {wizardStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="p-6">
                      <h2 className="text-xl font-semibold text-white mb-1">Basic Information</h2>
                      <p className="text-sm text-gray-400 mb-6">
                        Give your token a name and symbol. These will be visible to everyone on KasPump.
                      </p>

                      <div className="space-y-5">
                        <Input
                          label="Token Name"
                          placeholder="e.g., Moon Rocket"
                          value={tokenCreationState.formData.name}
                          onChange={(e) => tokenCreationState.updateFormData({ name: e.target.value })}
                          error={stepErrors.name}
                        />

                        <Input
                          label="Symbol"
                          placeholder="e.g., MOON (auto-uppercase)"
                          value={tokenCreationState.formData.symbol}
                          onChange={(e) => tokenCreationState.updateFormData({ symbol: e.target.value.toUpperCase() })}
                          error={stepErrors.symbol}
                        />

                        <Textarea
                          label="Description (optional)"
                          placeholder="Tell the world about your token..."
                          value={tokenCreationState.formData.description}
                          onChange={(e) => tokenCreationState.updateFormData({ description: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Step 2: Tokenomics */}
                {wizardStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="p-6">
                      <h2 className="text-xl font-semibold text-white mb-1">Tokenomics</h2>
                      <p className="text-sm text-gray-400 mb-6">
                        Set the total supply and choose a preset. Smart defaults are pre-filled for you.
                      </p>

                      {/* Presets */}
                      {mode === 'beginner' && (
                        <div className="mb-6">
                          <label className="text-sm font-medium text-gray-300 mb-3 block">Quick presets</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {presets.map((preset) => {
                              const isActive =
                                tokenCreationState.formData.totalSupply === preset.supply &&
                                tokenCreationState.formData.curveType === preset.curveType;
                              return (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => {
                                    tokenCreationState.updateFormData({
                                      totalSupply: preset.supply,
                                      curveType: preset.curveType,
                                      basePrice: preset.basePrice,
                                      slope: preset.slope,
                                    });
                                  }}
                                  className={cn(
                                    'p-3 rounded-lg border text-left transition-all text-sm',
                                    isActive
                                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                                      : 'border-gray-700 bg-gray-800/30 text-gray-300 hover:border-gray-600'
                                  )}
                                >
                                  <div className="font-medium">{preset.label}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {(preset.supply / 1e9).toFixed(0)}B supply, {preset.curveType}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-5">
                        <Input
                          label="Total Supply"
                          type="number"
                          placeholder="1000000000"
                          value={tokenCreationState.formData.totalSupply.toString()}
                          onChange={(e) => tokenCreationState.updateFormData({ totalSupply: parseInt(e.target.value) || 0 })}
                          error={stepErrors.totalSupply}
                        />

                        <Select
                          label="Curve Type"
                          value={tokenCreationState.formData.curveType}
                          onChange={(value) => tokenCreationState.updateFormData({ curveType: value as 'linear' | 'exponential' })}
                          options={[
                            { value: 'linear', label: 'Linear (steady growth)' },
                            { value: 'exponential', label: 'Exponential (accelerating)' },
                          ]}
                        />
                      </div>

                      {mode === 'beginner' && (
                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-xs text-blue-300 flex items-center gap-1">
                            <Info size={12} />
                            <strong>Tip:</strong> Linear curves offer steadier price growth. Exponential curves reward early buyers more.
                          </p>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}

                {/* Step 3: Curve Parameters */}
                {wizardStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="p-6">
                      <h2 className="text-xl font-semibold text-white mb-1">Bonding Curve Parameters</h2>
                      <p className="text-sm text-gray-400 mb-6">
                        Fine-tune the pricing curve. The preview on the right updates as you change values.
                      </p>

                      <div className="space-y-5">
                        <Input
                          label={`Base Price (${nativeCurrencySymbol})`}
                          type="number"
                          step="0.000001"
                          placeholder="0.000001"
                          value={tokenCreationState.formData.basePrice.toString()}
                          onChange={(e) => tokenCreationState.updateFormData({ basePrice: parseFloat(e.target.value) || 0 })}
                          error={stepErrors.basePrice}
                        />

                        <Input
                          label="Price Slope"
                          type="number"
                          step="0.00000001"
                          placeholder="0.00000001"
                          value={tokenCreationState.formData.slope.toString()}
                          onChange={(e) => tokenCreationState.updateFormData({ slope: parseFloat(e.target.value) || 0 })}
                          error={stepErrors.slope}
                        />

                        {/* Inline warnings for out-of-range values */}
                        {tokenCreationState.formData.basePrice > 0.01 && (
                          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <AlertTriangle size={14} className="text-yellow-400" />
                            <span className="text-xs text-yellow-400">High base price may discourage early buyers</span>
                          </div>
                        )}
                        {tokenCreationState.formData.slope > 0.0001 && (
                          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <AlertTriangle size={14} className="text-yellow-400" />
                            <span className="text-xs text-yellow-400">Steep slope means rapid price increase - higher risk for later buyers</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Step 4: Image & Branding */}
                {wizardStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="p-6">
                      <h2 className="text-xl font-semibold text-white mb-1">Token Logo</h2>
                      <p className="text-sm text-gray-400 mb-6">
                        Upload an image to make your token stand out. This is optional but recommended.
                      </p>

                      <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-yellow-500/50 transition-colors">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="launch-image-upload"
                        />
                        <label htmlFor="launch-image-upload" className="cursor-pointer">
                          {tokenCreationState.formData.image ? (
                            <div className="space-y-3">
                              <img
                                src={URL.createObjectURL(tokenCreationState.formData.image)}
                                alt="Token preview"
                                className="mx-auto max-w-48 max-h-48 rounded-lg"
                              />
                              <p className="text-sm text-green-400">{tokenCreationState.formData.image.name}</p>
                              <p className="text-xs text-gray-500">Click to change</p>
                            </div>
                          ) : (
                            <div>
                              <Upload className="mx-auto h-14 w-14 text-gray-400 mb-3" />
                              <p className="text-gray-300 mb-1">Click to upload logo</p>
                              <p className="text-xs text-gray-500">JPEG, PNG, or GIF - Max 2MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                      {stepErrors.image && (
                        <p className="text-sm text-red-400 mt-2">{stepErrors.image}</p>
                      )}

                      {ipfsUpload.uploadingImage && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
                          <Loader size={14} className="animate-spin" />
                          Uploading to IPFS ({ipfsUpload.imageUploadProgress}%)
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )}

                {/* Step 5: Review & Confirm */}
                {wizardStep === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <Card className="p-6">
                      <h2 className="text-xl font-semibold text-white mb-1">Review & Launch</h2>
                      <p className="text-sm text-gray-400 mb-6">
                        Double-check everything. Token parameters are immutable after launch.
                      </p>

                      {/* Token Summary Card */}
                      <div className="bg-gray-800/30 rounded-xl p-5 border border-gray-700 mb-6">
                        <div className="flex items-center gap-4 mb-4">
                          {tokenCreationState.formData.image ? (
                            <img
                              src={URL.createObjectURL(tokenCreationState.formData.image)}
                              alt={tokenCreationState.formData.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                              {tokenCreationState.formData.symbol.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-white">{tokenCreationState.formData.name || 'Unnamed Token'}</h3>
                            <p className="text-gray-400">${tokenCreationState.formData.symbol || 'SYMBOL'}</p>
                          </div>
                        </div>

                        {tokenCreationState.formData.description && (
                          <p className="text-gray-300 text-sm mb-4">{tokenCreationState.formData.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-700 pt-4">
                          <div>
                            <span className="text-gray-400">Total Supply</span>
                            <div className="text-white font-medium">{tokenCreationState.formData.totalSupply.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Curve Type</span>
                            <div className="text-white font-medium capitalize">{tokenCreationState.formData.curveType}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Base Price</span>
                            <div className="text-white font-medium">{tokenCreationState.formData.basePrice} {nativeCurrencySymbol}</div>
                          </div>
                          <div>
                            <span className="text-gray-400">Slope</span>
                            <div className="text-white font-medium">{tokenCreationState.formData.slope}</div>
                          </div>
                        </div>
                      </div>

                      {/* Cost Estimate */}
                      <div className="bg-gray-800/30 rounded-lg p-4 mb-6 border border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Estimated gas fee</span>
                          <span className="text-white font-mono">~{estimatedGasCost} {nativeCurrencySymbol}</span>
                        </div>
                      </div>

                      {/* Immutable Checkbox */}
                      <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800/20 cursor-pointer hover:bg-gray-800/30 transition-colors mb-6">
                        <input
                          type="checkbox"
                          checked={immutableCheckbox}
                          onChange={(e) => setImmutableCheckbox(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500 bg-gray-800"
                        />
                        <span className="text-sm text-gray-300">
                          I understand this configuration is <strong className="text-white">immutable</strong> after launch.
                          The token name, symbol, supply, and bonding curve parameters cannot be changed.
                        </span>
                      </label>

                      {/* Launch Button */}
                      <Button
                        onClick={handleLaunch}
                        disabled={!immutableCheckbox || !contractsDeployed || tokenCreationState.isCreating}
                        loading={tokenCreationState.isCreating}
                        fullWidth
                        className={cn(
                          'h-14 text-lg font-bold',
                          immutableCheckbox && contractsDeployed
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/25'
                            : ''
                        )}
                      >
                        <Rocket size={20} className="mr-2" />
                        {!contractsDeployed ? 'Contracts Not Deployed' : 'Launch Token'}
                      </Button>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              {wizardStep < 5 && (
                <div className="flex justify-between mt-6">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={wizardStep === 1}
                    className="text-gray-400"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600"
                  >
                    Next
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              )}
              {wizardStep === 5 && (
                <div className="flex justify-start mt-6">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-gray-400"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Back
                  </Button>
                </div>
              )}
            </div>

            {/* Live Preview Sidebar */}
            <div className="space-y-4">
              {/* Bonding Curve Preview - always visible */}
              <BondingCurveSimulator
                basePrice={tokenCreationState.formData.basePrice}
                slope={tokenCreationState.formData.slope}
                curveType={tokenCreationState.formData.curveType}
                totalSupply={tokenCreationState.formData.totalSupply}
                currencySymbol={nativeCurrencySymbol}
                compact={true}
              />

              {/* Token Preview Card */}
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Token Preview</h4>
                <div className="flex items-center gap-3 mb-3">
                  {tokenCreationState.formData.image ? (
                    <img
                      src={URL.createObjectURL(tokenCreationState.formData.image)}
                      alt="Preview"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {(tokenCreationState.formData.symbol || '??').slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="text-white font-medium text-sm">{tokenCreationState.formData.name || 'Token Name'}</div>
                    <div className="text-gray-500 text-xs">${tokenCreationState.formData.symbol || 'SYMBOL'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-800/30 rounded px-2 py-1.5">
                    <div className="text-gray-500">Supply</div>
                    <div className="text-white font-mono">{(tokenCreationState.formData.totalSupply / 1e9).toFixed(1)}B</div>
                  </div>
                  <div className="bg-gray-800/30 rounded px-2 py-1.5">
                    <div className="text-gray-500">Curve</div>
                    <div className="text-white capitalize">{tokenCreationState.formData.curveType}</div>
                  </div>
                </div>
              </Card>

              {/* Step Progress Info */}
              <Card className="p-4">
                <h4 className="text-sm font-semibold text-white mb-2">Launch Progress</h4>
                <div className="space-y-2">
                  {WIZARD_STEPS.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {i + 1 < wizardStep ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : i + 1 === wizardStep ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-400 bg-yellow-400/20" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                      )}
                      <span className={cn(
                        i + 1 <= wizardStep ? 'text-white' : 'text-gray-500'
                      )}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </WalletRequired>
      </div>
    </div>
  );
}
