'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, AlertTriangle, CheckCircle, XCircle, Loader, Sparkles, Settings } from 'lucide-react';
import { Button, Input, Textarea, Select, Card, Alert } from '../ui';
import { WalletRequired } from './WalletConnectButton';
import { useContracts } from '../../hooks/useContracts';
import { TokenCreationForm, ContractError } from '../../types';
import { isValidTokenName, isValidTokenSymbol, parseErrorMessage, cn } from '../../utils';
import { WizardProgress, WizardStep1, WizardStep2, WizardStep3 } from './TokenCreationWizard';
import { MultiChainDeployment } from './MultiChainDeployment';
import { useMultiChainDeployment } from '../../hooks/useMultiChainDeployment';
import { ConfettiSuccess } from './ConfettiSuccess';
import { SuccessToast } from './SuccessToast';
import { uploadImageToIPFS, isIPFSConfigured } from '../../lib/ipfs';
import { useAccount } from 'wagmi';
import { getChainById, formatNativeCurrency, getChainMetadata } from '../../config/chains';
import { areContractsDeployed } from '../../config/contracts';

interface TokenCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tokenData: any) => void;
}

export const TokenCreationModal: React.FC<TokenCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const contracts = useContracts();
  const { chainId } = useAccount();
  
  // Get current chain's native currency symbol
  const currentChain = chainId ? getChainById(chainId) : null;
  const nativeCurrencySymbol = currentChain?.nativeCurrency?.symbol || 'BNB'; // Default to BNB for BSC
  
  // Check if contracts are deployed on current chain
  const contractsDeployed = chainId ? areContractsDeployed(chainId) : false;
  const chainMetadata = chainId ? getChainMetadata(chainId) : null;
  
  const [formData, setFormData] = useState<TokenCreationForm>({
    name: '',
    symbol: '',
    description: '',
    image: null,
    totalSupply: 1000000000, // 1 billion default
    curveType: 'linear',
    basePrice: 0.000001, // Default base price
    slope: 0.00000001, // Small slope for linear curve
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TokenCreationForm, string>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'form' | 'confirm' | 'creating' | 'success' | 'error'>('form');
  const [creationResult, setCreationResult] = useState<any>(null);
  const [creationError, setCreationError] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [ipfsImageUrl, setIpfsImageUrl] = useState<string>('');
  
  // Wizard mode state
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  
  // Multi-chain deployment
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [showMultiChain, setShowMultiChain] = useState(false);
  const multiChainDeployment = useMultiChainDeployment();

  // Portal mounting state (must be before any conditional returns - Rules of Hooks)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCreationStep('form');
        setCreationResult(null);
        setCreationError('');
        setErrors({});
        setWizardStep(1);
        setMode('beginner');
      }, 300);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TokenCreationForm, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required';
    } else if (!isValidTokenName(formData.name)) {
      newErrors.name = 'Invalid token name format';
    }

    // Symbol validation
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (!isValidTokenSymbol(formData.symbol.toUpperCase())) {
      newErrors.symbol = 'Symbol must be 1-10 uppercase letters/numbers';
    }

    // Supply validation
    if (formData.totalSupply < 1000000) {
      newErrors.totalSupply = 'Minimum supply is 1,000,000 tokens';
    } else if (formData.totalSupply > 1000000000000) {
      newErrors.totalSupply = 'Maximum supply is 1,000,000,000,000 tokens';
    }

    // Price validation
    if (formData.basePrice <= 0) {
      newErrors.basePrice = 'Base price must be positive';
    } else if (formData.basePrice > 1) {
      newErrors.basePrice = `Base price too high (max 1 ${nativeCurrencySymbol})`;
    }

    // Slope validation
    if (formData.slope <= 0) {
      newErrors.slope = 'Slope must be positive';
    } else if (formData.slope > 0.001) {
      newErrors.slope = 'Slope too high (max 0.001)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractsDeployed) {
      setCreationError(`Token creation is not available on ${chainMetadata?.name || 'this chain'}. Please switch to BSC Testnet (chain 97) where contracts are deployed.`);
      setCreationStep('error');
      return;
    }
    if (validateForm()) {
      setCreationStep('confirm');
    }
  };

  const handleConfirmCreation = async () => {
    if (!contracts.isConnected) return;
    
    if (!contractsDeployed) {
      setCreationError(`Token creation is not available on ${chainMetadata?.name || 'this chain'}. Please switch to BSC Testnet (chain 97) where contracts are deployed.`);
      setCreationStep('error');
      return;
    }

    setIsCreating(true);
    setCreationStep('creating');

    try {
      // Upload image to IPFS first if we have an image and IPFS is configured
      let finalImageUrl = '';
      if (formData.image && isIPFSConfigured() && !ipfsImageUrl) {
        try {
          setImageUploadProgress(0);
          const result = await uploadImageToIPFS(formData.image, {
            onProgress: (progress) => setImageUploadProgress(progress),
          });
          finalImageUrl = result.url;
        } catch (error: any) {
          console.warn('IPFS upload failed, continuing without image URL:', error);
          // Continue without IPFS URL
        }
      } else {
        finalImageUrl = ipfsImageUrl;
      }

      const result = await contracts.createToken(
        {
          ...formData,
          symbol: formData.symbol.toUpperCase(),
        },
        finalImageUrl // Pass IPFS URL as second parameter
      );

      setCreationResult(result);
      setCreationStep('success');
      setShowConfetti(true);
      setShowSuccessToast(true);
      
      // Call success callback after a delay to show success state
      setTimeout(() => {
        onSuccess(result);
      }, 2000);

    } catch (error: any) {
      console.error('Token creation failed:', error);
      setCreationError(parseErrorMessage(error));
      setCreationStep('error');
    } finally {
      setIsCreating(false);
      setImageUploadProgress(0);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setErrors({ ...errors, image: 'Image must be smaller than 2MB' });
        return;
      }
      
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        setErrors({ ...errors, image: 'Only JPEG, PNG, and GIF images are allowed' });
        return;
      }

      setFormData({ ...formData, image: file });
      setErrors({ ...errors, image: undefined });

      // Upload to IPFS if configured
      if (isIPFSConfigured()) {
        try {
          setUploadingImage(true);
          setImageUploadProgress(0);
          const result = await uploadImageToIPFS(file, {
            onProgress: (progress) => setImageUploadProgress(progress),
          });
          setIpfsImageUrl(result.url);
          setErrors({ ...errors, image: undefined });
        } catch (error: any) {
          console.error('IPFS upload failed:', error);
          setErrors({ ...errors, image: `IPFS upload failed: ${error.message}` });
          // Continue with local file if IPFS fails
        } finally {
          setUploadingImage(false);
        }
      } else {
        // Clear IPFS URL if not configured
        setIpfsImageUrl('');
      }
    }
  };

  const estimatedGasCost = 0.005; // Estimated gas cost
  const totalCost = estimatedGasCost;

  if (!isOpen) {
    return (
      <>
        <ConfettiSuccess trigger={showConfetti} duration={3000} />
        {creationResult && (
          <SuccessToast
            isOpen={showSuccessToast}
            onClose={() => setShowSuccessToast(false)}
            title={creationResult?.multiChain 
              ? 'Multi-Chain Deployment Successful! 🎉'
              : 'Token Created Successfully! 🎉'
            }
            message={creationResult?.multiChain
              ? `Deployed to ${Array.from(creationResult.results?.values() || []).filter((r: any) => r.success).length} chain(s)`
              : 'Your token is now live and ready for trading!'
            }
            txHash={creationResult?.txHash || Array.from((creationResult?.results as Map<any, any>)?.values() || [])?.[0]?.txHash}
            explorerUrl={creationResult?.explorerUrl || Array.from((creationResult?.results as Map<any, any>)?.values() || [])?.[0]?.explorerUrl}
            duration={8000}
            onAction={() => {
              if (creationResult?.tokenAddress) {
                window.location.href = `/tokens/${creationResult.tokenAddress}`;
              } else {
                const firstResult = Array.from((creationResult?.results as Map<any, any>)?.values() || [])?.[0] as any;
                if (firstResult?.tokenAddress) {
                  window.location.href = `/tokens/${firstResult.tokenAddress}`;
                }
              }
            }}
            actionLabel="View Token"
          />
        )}
      </>
    );
  }

  // Don't render portal on server side or if not mounted
  if (!mounted || typeof window === 'undefined' || !isOpen) {
    return null;
  }

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Modal Content */}
          <motion.div
            key="modal-content"
            className="relative w-full overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 'min(42rem, calc(100vw - 2rem))',
              maxHeight: 'calc(100vh - 2rem)',
              margin: 'auto',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Card className="glassmorphism h-full flex flex-col overflow-hidden">
              {/* Header - Fixed */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0 px-6 pt-6">
                  <h2 className="text-2xl font-bold gradient-text">
                    {creationStep === 'form' ? 'Create Token' :
                     creationStep === 'confirm' ? 'Confirm Creation' :
                     creationStep === 'creating' ? 'Creating Token...' :
                     creationStep === 'success' ? 'Token Created!' :
                     'Creation Failed'}
                  </h2>
                  <div className="flex items-center space-x-3">
                    {/* Mode Toggle - Only show in form step */}
                    {creationStep === 'form' && (
                      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
                        <button
                          onClick={() => setMode('beginner')}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                            mode === 'beginner'
                              ? 'bg-purple-500 text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Sparkles size={14} className="inline mr-1" />
                          Beginner
                        </button>
                        <button
                          onClick={() => setMode('advanced')}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                            mode === 'advanced'
                              ? 'bg-purple-500 text-white'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Settings size={14} className="inline mr-1" />
                          Advanced
                        </button>
                      </div>
                    )}
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                      disabled={isCreating}
                    >
                      <X size={20} className="text-gray-400" />
                    </button>
                  </div>
                </div>

              {/* Content based on step - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <WalletRequired>
              {/* Contract Deployment Warning */}
              {!contractsDeployed && chainId && (
                <Alert variant="danger" className="mb-6">
                  <AlertTriangle size={16} />
                  <div className="ml-2">
                    <p className="font-medium">Contracts Not Deployed</p>
                    <p className="text-sm mt-1">
                      Token creation is not available on <strong>{chainMetadata?.name || `Chain ${chainId}`}</strong> because the smart contracts have not been deployed yet.
                    </p>
                    <p className="text-sm mt-2">
                      <strong>Please switch to BSC Testnet (Chain ID: 97)</strong> where contracts are deployed and ready to use.
                    </p>
                  </div>
                </Alert>
              )}
              
              {creationStep === 'form' && mode === 'beginner' && (
                <>
                  <WizardProgress currentStep={wizardStep} />
                  <AnimatePresence mode="wait">
                    {wizardStep === 1 && (
                      <WizardStep1
                        key="step1"
                        formData={formData}
                        errors={errors}
                        onFormDataChange={(data) => setFormData({ ...formData, ...data })}
                        onErrorsChange={(errs) => setErrors(errs)}
                        onNext={() => setWizardStep(2)}
                      />
                    )}
                    {wizardStep === 2 && (
                      <WizardStep2
                        key="step2"
                        formData={formData}
                        errors={errors}
                        onImageUpload={async (file) => {
                          setFormData({ ...formData, image: file });
                          setErrors({ ...errors, image: undefined });
                          // Upload to IPFS if configured
                          if (isIPFSConfigured()) {
                            try {
                              setUploadingImage(true);
                              setImageUploadProgress(0);
                              const result = await uploadImageToIPFS(file, {
                                onProgress: (progress) => setImageUploadProgress(progress),
                              });
                              setIpfsImageUrl(result.url);
                            } catch (error: any) {
                              console.error('IPFS upload failed:', error);
                              // Continue with local file if IPFS fails
                            } finally {
                              setUploadingImage(false);
                            }
                          }
                        }}
                        onBack={() => setWizardStep(1)}
                        onNext={() => {
                          // Apply defaults for wizard mode
                          if (!formData.totalSupply) {
                            setFormData({
                              ...formData,
                              totalSupply: 1000000000,
                              curveType: 'linear',
                              basePrice: 0.000001,
                              slope: 0.00000001,
                            });
                          }
                          setWizardStep(3);
                        }}
                      />
                    )}
                    {wizardStep === 3 && (
                      <WizardStep3
                        key="step3"
                        formData={formData}
                        onBack={() => setWizardStep(2)}
                        onComplete={async () => {
                          // Upload image to IPFS if needed before submitting
                          if (formData.image && isIPFSConfigured() && !ipfsImageUrl) {
                            try {
                              setUploadingImage(true);
                              setImageUploadProgress(0);
                              const result = await uploadImageToIPFS(formData.image, {
                                onProgress: (progress) => setImageUploadProgress(progress),
                              });
                              setIpfsImageUrl(result.url);
                            } catch (error: any) {
                              console.warn('IPFS upload failed, continuing without image URL:', error);
                            } finally {
                              setUploadingImage(false);
                            }
                          }
                          // Check if contracts are deployed
                          if (!contractsDeployed) {
                            setCreationError(`Token creation is not available on ${chainMetadata?.name || 'this chain'}. Please switch to BSC Testnet (chain 97) where contracts are deployed.`);
                            setCreationStep('error');
                            return;
                          }
                          // Validate and proceed to confirmation
                          if (validateForm()) {
                            setCreationStep('confirm');
                          }
                        }}
                      />
                    )}
                  </AnimatePresence>
                </>
              )}
              
              {creationStep === 'form' && mode === 'advanced' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Token Name *"
                      placeholder="e.g., BSC Moon"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      error={errors.name}
                    />
                    
                    <Input
                      label="Symbol *"
                      placeholder="e.g., KMOON"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                      error={errors.symbol}
                    />
                  </div>

                  <Textarea
                    label="Description"
                    placeholder="Tell the world about your token... 🚀"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Token Image (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-400">
                          {formData.image ? formData.image.name : 'Click to upload image (max 2MB)'}
                        </p>
                      </label>
                    </div>
                    {errors.image && (
                      <p className="text-sm text-red-500 mt-2">{errors.image}</p>
                    )}
                  </div>

                  {/* Advanced Settings */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Bonding Curve Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Total Supply *"
                        type="number"
                        placeholder="1000000000"
                        value={formData.totalSupply.toString()}
                        onChange={(e) => setFormData({ ...formData, totalSupply: parseInt(e.target.value) || 0 })}
                        error={errors.totalSupply ? String(errors.totalSupply) : undefined}
                      />
                      
                      <Select
                        label="Curve Type *"
                        value={formData.curveType}
                        onChange={(value) => setFormData({ ...formData, curveType: value as 'linear' | 'exponential' })}
                        options={[
                          { value: 'linear', label: 'Linear (steady growth)' },
                          { value: 'exponential', label: 'Exponential (accelerating)' }
                        ]}
                      />
                      
                      <Input
                        label={`Base Price (${nativeCurrencySymbol}) *`}
                        type="number"
                        step="0.000001"
                        placeholder="0.000001"
                        value={formData.basePrice.toString()}
                        onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                        error={errors.basePrice}
                      />
                      
                      <Input
                        label="Slope *"
                        type="number"
                        step="0.00000001"
                        placeholder="0.00000001"
                        value={formData.slope.toString()}
                        onChange={(e) => setFormData({ ...formData, slope: parseFloat(e.target.value) || 0 })}
                        error={errors.slope}
                      />
                    </div>
                  </div>

                  {/* Multi-Chain Deployment Toggle */}
                  <div className="border-t border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">Multi-Chain Deployment</h3>
                        <p className="text-sm text-gray-400">
                          Deploy your token to multiple blockchains at once
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showMultiChain}
                          onChange={(e) => {
                            setShowMultiChain(e.target.checked);
                            if (!e.target.checked) {
                              setSelectedChains([]);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {showMultiChain && (
                      <MultiChainDeployment
                        deployments={multiChainDeployment.deployments}
                        selectedChains={selectedChains}
                        onChainToggle={(chainId) => {
                          setSelectedChains(prev => 
                            prev.includes(chainId)
                              ? prev.filter(id => id !== chainId)
                              : [...prev, chainId]
                          );
                        }}
                        onDeploy={async () => {
                          if (selectedChains.length === 0) return;
                          
                          // Validate form first
                          if (!validateForm()) return;

                          try {
                            setIsCreating(true);
                            setCreationStep('creating');
                            
                            // Get image URL (IPFS if configured, otherwise empty)
                            const imageUrl = ipfsImageUrl || (formData.image ? '' : ''); // IPFS URL or empty
                            
                            // Deploy to multiple chains
                            const results = await multiChainDeployment.deployToMultipleChains(
                              selectedChains,
                              formData,
                              imageUrl
                            );

                            // Check if at least one succeeded
                            const successCount = Array.from(results.values()).filter(r => r.success).length;
                            
                            if (successCount > 0) {
                              setCreationResult({ multiChain: true, results });
                              setCreationStep('success');
                              setShowConfetti(true);
                              setShowSuccessToast(true);
                            } else {
                              setCreationError('All deployments failed');
                              setCreationStep('error');
                            }
                          } catch (error: any) {
                            setCreationError(error.message || 'Multi-chain deployment failed');
                            setCreationStep('error');
                          } finally {
                            setIsCreating(false);
                          }
                        }}
                        onCancel={() => {
                          setShowMultiChain(false);
                          setSelectedChains([]);
                          multiChainDeployment.resetDeployments();
                        }}
                        isDeploying={multiChainDeployment.isDeploying}
                        deploymentMode={multiChainDeployment.deploymentMode}
                        onModeChange={multiChainDeployment.setDeploymentMode}
                      />
                    )}
                  </div>

                  {/* Cost Estimate */}
                  {!showMultiChain && (
                    <Alert variant="default">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle size={16} />
                        <div>
                          <p className="font-medium">Estimated Cost</p>
                          <p className="text-sm text-gray-400">
                            Gas fee: ~{estimatedGasCost} {nativeCurrencySymbol} • Total: ~{totalCost} {nativeCurrencySymbol}
                          </p>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  {!showMultiChain && (
                    <div className="flex space-x-4">
                      <Button variant="secondary" onClick={onClose} fullWidth>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        variant="primary" 
                        fullWidth
                        disabled={!contractsDeployed}
                      >
                        {contractsDeployed ? 'Review & Create' : 'Contracts Not Deployed'}
                      </Button>
                    </div>
                  )}
                </form>
              )}

              {creationStep === 'confirm' && (
                <div className="space-y-6">
                  <Alert variant="warning">
                    <AlertTriangle size={16} />
                    <div className="ml-2">
                      <p className="font-medium">Confirm Token Creation</p>
                      <p className="text-sm">Please review all details carefully. This action cannot be undone.</p>
                    </div>
                  </Alert>

                  {/* Token Preview */}
                  <Card className="bg-gray-800/30">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {formData.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{formData.name}</h3>
                        <p className="text-gray-400">${formData.symbol}</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-4">{formData.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-400">Supply:</span> <span className="text-white">{formData.totalSupply.toLocaleString()}</span></div>
                      <div><span className="text-gray-400">Curve:</span> <span className="text-white">{formData.curveType}</span></div>
                      <div><span className="text-gray-400">Base Price:</span> <span className="text-white">{formData.basePrice} {nativeCurrencySymbol}</span></div>
                      <div><span className="text-gray-400">Slope:</span> <span className="text-white">{formData.slope}</span></div>
                    </div>
                  </Card>

                  <div className="flex space-x-4">
                    <Button variant="secondary" onClick={() => setCreationStep('form')} fullWidth>
                      Back to Edit
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={handleConfirmCreation} 
                      loading={isCreating}
                      fullWidth
                      className="btn-glow-purple"
                      disabled={!contractsDeployed}
                    >
                      {contractsDeployed ? 'Create Token' : 'Contracts Not Deployed'}
                    </Button>
                  </div>
                </div>
              )}

              {creationStep === 'creating' && (
                <div className="text-center py-12">
                  <Loader className="mx-auto h-16 w-16 animate-spin text-purple-500 mb-6" />
                  <h3 className="text-xl font-semibold text-white mb-2">Creating your token...</h3>
                  <p className="text-gray-400">
                    Please confirm the transaction in your wallet and wait for confirmation.
                  </p>
                </div>
              )}

              {creationStep === 'success' && (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {creationResult?.multiChain 
                      ? 'Multi-Chain Deployment Successful! 🎉'
                      : 'Token Created Successfully! 🎉'
                    }
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {creationResult?.multiChain
                      ? `Your token has been deployed across ${Array.from((creationResult.results as Map<any, any>)?.values() || []).filter((r: any) => r.success).length} chain(s)!`
                      : 'Your token is now live on KasPump and ready for trading!'
                    }
                  </p>
                  
                  {creationResult && (
                    <div className="space-y-4 mb-6">
                      {creationResult.multiChain && creationResult.results ? (
                        // Multi-chain results
                        <div className="space-y-3">
                          {Array.from((creationResult.results as Map<any, any>).values()).map((result: any, idx: number) => {
                            const r = result as { chainId?: number; success: boolean; chainName?: string; txHash?: string; tokenAddress?: string; error?: string };
                            return (
                              <Card
                                key={(r?.chainId as number | undefined) || idx}
                                className={cn(
                                  'bg-gray-800/30 text-left',
                                  r.success ? 'border-green-500/30' : 'border-red-500/30'
                                )}
                              >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-white">{r.chainName || `Chain ${r.chainId || idx}`}</span>
                                {r.success ? (
                                  <CheckCircle size={20} className="text-green-400" />
                                ) : (
                                  <XCircle size={20} className="text-red-400" />
                                )}
                              </div>
                              {r.success ? (
                                <div className="space-y-1 text-sm">
                                  {r.tokenAddress && (
                                    <div><span className="text-gray-400">Token:</span> <span className="text-white font-mono text-xs">{r.tokenAddress.slice(0, 10)}...{r.tokenAddress.slice(-8)}</span></div>
                                  )}
                                  {r.txHash && (
                                    <div><span className="text-gray-400">TX:</span> <span className="text-white font-mono text-xs">{r.txHash.slice(0, 10)}...{r.txHash.slice(-8)}</span></div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-red-400">{r.error || 'Deployment failed'}</div>
                              )}
                            </Card>
                          );
                        })}
                        </div>
                      ) : (
                        // Single-chain result
                        <Card className="bg-gray-800/30 text-left">
                          <div className="space-y-2 text-sm">
                            <div><span className="text-gray-400">Token Address:</span> <span className="text-white font-mono">{creationResult.tokenAddress}</span></div>
                            <div><span className="text-gray-400">AMM Address:</span> <span className="text-white font-mono">{creationResult.ammAddress}</span></div>
                            <div><span className="text-gray-400">Transaction:</span> <span className="text-white font-mono">{creationResult.txHash}</span></div>
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                  
                  <Button variant="primary" onClick={onClose} fullWidth>
                    {creationResult?.multiChain ? 'View Tokens' : 'Start Trading'}
                  </Button>
                </div>
              )}

              {creationStep === 'error' && (
                <div className="text-center py-12">
                  <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-6" />
                  <h3 className="text-xl font-semibold text-white mb-2">Creation Failed</h3>
                  <p className="text-red-400 mb-6">{creationError}</p>
                  
                  <div className="flex space-x-4">
                    <Button variant="secondary" onClick={() => setCreationStep('form')} fullWidth>
                      Try Again
                    </Button>
                    <Button variant="primary" onClick={onClose} fullWidth>
                      Close
                    </Button>
                  </div>
                </div>
              )}
                </WalletRequired>
              </div>
            </Card>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    );

  // Render modal in portal at document body level
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  
  if (!portalTarget) {
    return null;
  }

  return (
    <>
      {createPortal(modalContent, portalTarget)}
      
      {/* Success Animations - Outside AnimatePresence */}
      <ConfettiSuccess trigger={showConfetti} duration={3000} />
      {creationResult && (
        <SuccessToast
          isOpen={showSuccessToast}
          onClose={() => setShowSuccessToast(false)}
          title={creationResult?.multiChain 
            ? 'Multi-Chain Deployment Successful! 🎉'
            : 'Token Created Successfully! 🎉'
          }
          message={creationResult?.multiChain
            ? `Deployed to ${Array.from(creationResult.results?.values() || []).filter((r: any) => r.success).length} chain(s)`
            : 'Your token is now live and ready for trading!'
          }
          txHash={creationResult?.txHash || Array.from((creationResult?.results as Map<any, any>)?.values() || [])?.[0]?.txHash}
          explorerUrl={creationResult?.explorerUrl || Array.from((creationResult?.results as Map<any, any>)?.values() || [])?.[0]?.explorerUrl}
          duration={8000}
          onAction={() => {
            if (creationResult?.tokenAddress) {
              window.location.href = `/tokens/${creationResult.tokenAddress}`;
            } else {
              const firstResult = Array.from((creationResult?.results as Map<any, any>)?.values() || [])?.[0] as any;
              if (firstResult?.tokenAddress) {
                window.location.href = `/tokens/${firstResult.tokenAddress}`;
              }
            }
          }}
          actionLabel="View Token"
        />
      )}
    </>
  );
};
