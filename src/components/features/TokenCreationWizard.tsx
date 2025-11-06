'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Upload } from 'lucide-react';
import { Input, Textarea } from '../ui';
import { TokenCreationForm } from '../../types';
import { isValidTokenName, isValidTokenSymbol } from '../../utils';

export interface TokenCreationWizardProps {
  formData: TokenCreationForm;
  errors: Partial<Record<keyof TokenCreationForm, string>>;
  currentStep: 1 | 2 | 3;
  onFormDataChange: (data: Partial<TokenCreationForm>) => void;
  onErrorsChange: (errors: Partial<Record<keyof TokenCreationForm, string>>) => void;
  onImageUpload: (file: File) => void;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
}

// Progress Indicator Component
export const WizardProgress: React.FC<{ currentStep: 1 | 2 | 3 }> = ({ currentStep }) => {
  const steps = [
    { number: 1, label: 'Basic Info' },
    { number: 2, label: 'Logo' },
    { number: 3, label: 'Review' },
  ];

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                currentStep > step.number
                  ? 'bg-green-500 text-white'
                  : currentStep === step.number
                  ? 'bg-purple-500 text-white scale-110'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {currentStep > step.number ? (
                <CheckCircle size={20} />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
                currentStep >= step.number ? 'text-white' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 mx-2 transition-colors duration-300 ${
                currentStep > step.number ? 'bg-green-500' : 'bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Step 1: Basic Information
export const WizardStep1: React.FC<{
  formData: TokenCreationForm;
  errors: Partial<Record<keyof TokenCreationForm, string>>;
  onFormDataChange: (data: Partial<TokenCreationForm>) => void;
  onErrorsChange: (errors: Partial<Record<keyof TokenCreationForm, string>>) => void;
  onNext: () => void;
}> = ({ formData, errors, onFormDataChange, onErrorsChange, onNext }) => {
  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof TokenCreationForm, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required';
    } else if (!isValidTokenName(formData.name)) {
      newErrors.name = 'Invalid token name format';
    }

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (!isValidTokenSymbol(formData.symbol.toUpperCase())) {
      newErrors.symbol = 'Symbol must be 1-10 uppercase letters/numbers';
    }

    onErrorsChange(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Basic Information</h3>
        <p className="text-sm text-gray-400 mb-6">
          Give your token a name and symbol. These will be visible to everyone.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Token Name *"
          placeholder="e.g., BSC Moon"
          value={formData.name}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onFormDataChange({ name: event.target.value })}
          error={errors.name}
          className="text-lg"
        />

        <Input
          label="Symbol *"
          placeholder="e.g., KMOON (will be uppercase)"
          value={formData.symbol}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onFormDataChange({ symbol: event.target.value.toUpperCase() })}
          error={errors.symbol}
          className="text-lg"
        />

        <Textarea
          label="Description (Optional)"
          placeholder="Tell the world about your token... 🚀"
          value={formData.description}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onFormDataChange({ description: event.target.value })}
          rows={4}
        />
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-purple-500/25"
        >
          Next: Upload Logo →
        </button>
      </div>
    </motion.div>
  );
};

// Step 2: Logo Upload
export const WizardStep2: React.FC<{
  formData: TokenCreationForm;
  errors: Partial<Record<keyof TokenCreationForm, string>>;
  onImageUpload: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
}> = ({ formData, errors, onImageUpload, onBack, onNext }) => {

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        return;
      }
      onImageUpload(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Token Logo</h3>
        <p className="text-sm text-gray-400 mb-6">
          Upload an image for your token (optional). This helps it stand out!
        </p>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="wizard-image-upload"
          />
          <label htmlFor="wizard-image-upload" className="cursor-pointer">
            {formData.image ? (
              <div className="space-y-4">
                <img
                  src={URL.createObjectURL(formData.image)}
                  alt="Token preview"
                  className="mx-auto max-w-48 max-h-48 rounded-lg"
                />
                <p className="text-sm text-green-400">{formData.image.name}</p>
                <p className="text-xs text-gray-500">Click to change image</p>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <p className="text-lg text-gray-300 mb-2">Click to upload image</p>
                <p className="text-sm text-gray-500">JPEG, PNG, or GIF • Max 2MB</p>
              </div>
            )}
          </label>
        </div>

        {errors.image && (
          <p className="text-sm text-red-500">{errors.image}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-purple-500/25"
        >
          Next: Review →
        </button>
      </div>
    </motion.div>
  );
};

// Step 3: Review & Confirm
export const WizardStep3: React.FC<{
  formData: TokenCreationForm;
  onBack: () => void;
  onComplete: () => void;
}> = ({ formData, onBack, onComplete }) => {
  // Default values for wizard mode (simplified)
  const defaults = {
    totalSupply: 1000000000,
    curveType: 'linear' as const,
    basePrice: 0.000001,
    slope: 0.00000001,
  };

  const finalFormData = {
    ...defaults,
    ...formData,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Review & Confirm</h3>
        <p className="text-sm text-gray-400 mb-6">
          Review your token details. You can go back to edit anything.
        </p>
      </div>

      {/* Token Preview */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-4 mb-4">
          {formData.image ? (
            <img
              src={URL.createObjectURL(formData.image)}
              alt={formData.name}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {formData.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-white">{formData.name}</h3>
            <p className="text-gray-400">${formData.symbol}</p>
          </div>
        </div>

        {formData.description && (
          <p className="text-gray-300 mb-4">{formData.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-700 pt-4">
          <div>
            <span className="text-gray-400">Supply:</span>{' '}
            <span className="text-white">{finalFormData.totalSupply.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-400">Curve:</span>{' '}
            <span className="text-white capitalize">{finalFormData.curveType}</span>
          </div>
          <div>
            <span className="text-gray-400">Base Price:</span>{' '}
            <span className="text-white">{finalFormData.basePrice} KAS</span>
          </div>
          <div>
            <span className="text-gray-400">Slope:</span>{' '}
            <span className="text-white">{finalFormData.slope}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-300">
            💡 <strong>Default Settings:</strong> Using recommended values for supply, price, and curve type. 
            Switch to Advanced Mode to customize these.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-purple-500/25"
        >
          Create Token 🚀
        </button>
      </div>
    </motion.div>
  );
};
