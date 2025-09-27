'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { Button, Input, Textarea, Select, Card, Alert } from '../ui';
import { WalletRequired } from './WalletConnectButton';
import { useContracts } from '../../hooks/useContracts';
import { TokenCreationForm, ContractError } from '../../types';
import { isValidTokenName, isValidTokenSymbol, parseErrorMessage } from '../../utils';

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
  
  const [formData, setFormData] = useState<TokenCreationForm>({
    name: '',
    symbol: '',
    description: '',
    image: null,
    totalSupply: 1000000000, // 1 billion default
    curveType: 'linear',
    basePrice: 0.000001, // 1 micro KAS
    slope: 0.00000001, // Small slope for linear curve
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TokenCreationForm, string>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState<'form' | 'confirm' | 'creating' | 'success' | 'error'>('form');
  const [creationResult, setCreationResult] = useState<any>(null);
  const [creationError, setCreationError] = useState<string>('');

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCreationStep('form');
        setCreationResult(null);
        setCreationError('');
        setErrors({});
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
      newErrors.basePrice = 'Base price too high (max 1 KAS)';
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
    if (validateForm()) {
      setCreationStep('confirm');
    }
  };

  const handleConfirmCreation = async () => {
    if (!contracts.isConnected) return;

    setIsCreating(true);
    setCreationStep('creating');

    try {
      const result = await contracts.createToken({
        ...formData,
        symbol: formData.symbol.toUpperCase(),
      });

      setCreationResult(result);
      setCreationStep('success');
      
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
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    }
  };

  const estimatedGasCost = 0.005; // Estimated in KAS
  const totalCost = estimatedGasCost;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay">
        <motion.div
          className="modal-content w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="glassmorphism">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold gradient-text">
                {creationStep === 'form' ? 'Create Token' :
                 creationStep === 'confirm' ? 'Confirm Creation' :
                 creationStep === 'creating' ? 'Creating Token...' :
                 creationStep === 'success' ? 'Token Created!' :
                 'Creation Failed'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                disabled={isCreating}
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content based on step */}
            <WalletRequired>
              {creationStep === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Token Name *"
                      placeholder="e.g., Kaspa Moon"
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
                        value={formData.totalSupply}
                        onChange={(e) => setFormData({ ...formData, totalSupply: parseInt(e.target.value) || 0 })}
                        error={errors.totalSupply}
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
                        label="Base Price (KAS) *"
                        type="number"
                        step="0.000001"
                        placeholder="0.000001"
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                        error={errors.basePrice}
                      />
                      
                      <Input
                        label="Slope *"
                        type="number"
                        step="0.00000001"
                        placeholder="0.00000001"
                        value={formData.slope}
                        onChange={(e) => setFormData({ ...formData, slope: parseFloat(e.target.value) || 0 })}
                        error={errors.slope}
                      />
                    </div>
                  </div>

                  {/* Cost Estimate */}
                  <Alert variant="default">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={16} />
                      <div>
                        <p className="font-medium">Estimated Cost</p>
                        <p className="text-sm text-gray-400">
                          Gas fee: ~{estimatedGasCost} KAS • Total: ~{totalCost} KAS
                        </p>
                      </div>
                    </div>
                  </Alert>

                  {/* Submit Button */}
                  <div className="flex space-x-4">
                    <Button variant="secondary" onClick={onClose} fullWidth>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" fullWidth>
                      Review & Create
                    </Button>
                  </div>
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
                      <div><span className="text-gray-400">Base Price:</span> <span className="text-white">{formData.basePrice} KAS</span></div>
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
                    >
                      Create Token
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
                  <h3 className="text-xl font-semibold text-white mb-2">Token Created Successfully! 🎉</h3>
                  <p className="text-gray-400 mb-6">
                    Your token is now live on KasPump and ready for trading!
                  </p>
                  
                  {creationResult && (
                    <Card className="bg-gray-800/30 text-left mb-6">
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-400">Token Address:</span> <span className="text-white font-mono">{creationResult.tokenAddress}</span></div>
                        <div><span className="text-gray-400">AMM Address:</span> <span className="text-white font-mono">{creationResult.ammAddress}</span></div>
                        <div><span className="text-gray-400">Transaction:</span> <span className="text-white font-mono">{creationResult.txHash}</span></div>
                      </div>
                    </Card>
                  )}
                  
                  <Button variant="primary" onClick={onClose} fullWidth>
                    Start Trading
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
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
