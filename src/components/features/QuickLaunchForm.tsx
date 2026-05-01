'use client';

/**
 * QuickLaunchForm — V2 30-second launch flow (PR 4).
 *
 * Replaces the 5-step wizard. Three user inputs only:
 *   - Name
 *   - Ticker
 *   - Image (optional, IPFS)
 *
 * Everything else is protocol-fixed (sigmoid curve, 1B supply, graduates at
 * 800M, 70/20/10 split, 6-month vesting + LP lock). The Token specs panel
 * surfaces those fixed terms next to the form so users see what they're
 * launching without configuring it.
 *
 * State machine inherited from useTokenCreationState:
 *   form → creating → success | error
 */

import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket, ArrowLeft, Upload, Loader, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Button, Input, Card, Alert } from '../ui';
import { useContracts } from '../../hooks/useContracts';
import { useTokenCreationState } from '../../hooks/useTokenCreationState';
import { useIPFSUpload } from '../../hooks/useIPFSUpload';
import { isIPFSConfigured } from '../../lib/ipfs';
import type { TokenCreationResult } from '../../types';
import { cn } from '../../utils';

export interface QuickLaunchFormProps {
  className?: string;
  onSuccess?: (result: TokenCreationResult) => void;
}

const SPECS = [
  { label: 'Total supply', value: '1,000,000,000' },
  { label: 'Graduates at', value: '800,000,000 sold' },
  { label: 'Curve', value: 'Standard sigmoid' },
  { label: 'Trading fee', value: 'Starts at 1%, decreases to 0.1%' },
  { label: 'LP at graduation', value: 'Auto-created at final curve price' },
  { label: 'Creator allocation', value: '40M tokens vest over 6 months' },
  { label: 'LP lock', value: '6 months' },
];

export const QuickLaunchForm: React.FC<QuickLaunchFormProps> = ({ className, onSuccess }) => {
  const router = useRouter();
  const { chainId } = useAccount();
  const contracts = useContracts();
  const ipfs = useIPFSUpload();
  const ipfsReady = isIPFSConfigured();

  const handleSuccessNavigation = useCallback(
    (result: TokenCreationResult) => {
      if (onSuccess) {
        onSuccess(result);
      } else if (result?.tokenAddress) {
        router.push(`/token/${result.tokenAddress}`);
      }
    },
    [onSuccess, router]
  );

  const state = useTokenCreationState({
    contracts,
    chainId,
    onSuccess: handleSuccessNavigation,
  });

  const [imagePreview, setImagePreview] = useState<string>('');

  const handleImageSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      state.updateFormData({ image: file });
      setImagePreview(URL.createObjectURL(file));
      if (ipfsReady) {
        try {
          await ipfs.uploadImage(file);
        } catch (err) {
          // Preserve any partial upload state but surface a soft error.
          console.error('IPFS upload failed:', err);
        }
      }
    },
    [ipfs, ipfsReady, state]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      void state.handleSubmit(e, ipfs.ipfsImageUrl || undefined);
    },
    [ipfs.ipfsImageUrl, state]
  );

  const launchDisabled = useMemo(
    () =>
      state.isCreating ||
      !state.formData.name.trim() ||
      !state.formData.symbol.trim() ||
      ipfs.uploadingImage,
    [ipfs.uploadingImage, state.formData.name, state.formData.symbol, state.isCreating]
  );

  return (
    <div className={cn('w-full max-w-3xl mx-auto', className)}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/[0.06] border border-yellow-500/20 mb-4">
          <Sparkles size={12} className="text-yellow-400" />
          <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">
            30-Second Launch
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Launch a token
        </h1>
        <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto">
          Launch a token that graduates to real liquidity automatically.
        </p>
      </motion.div>

      {state.creationStep === 'creating' && (
        <Card className="p-8 text-center">
          <Loader size={32} className="text-yellow-400 mx-auto mb-3 animate-spin" />
          <h2 className="text-lg font-semibold text-white mb-1">Launching your token…</h2>
          <p className="text-sm text-gray-400">Confirm the transaction in your wallet.</p>
        </Card>
      )}

      {state.creationStep === 'success' && state.creationResult && (
        <Card className="p-8 text-center">
          <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">
            ${state.formData.symbol.toUpperCase()} is live
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Your token is on-chain and tradeable. Redirecting to its page…
          </p>
          <code className="text-xs text-gray-500 break-all">
            {state.creationResult.tokenAddress}
          </code>
        </Card>
      )}

      {state.creationStep === 'error' && (
        <Card className="p-6">
          <Alert variant="error" className="mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium mb-1">Token launch failed</div>
                <div className="text-sm">{state.creationError || 'Unknown error.'}</div>
              </div>
            </div>
          </Alert>
          <Button onClick={state.resetForm} variant="secondary" fullWidth>
            <ArrowLeft size={14} className="mr-2" />
            Back to launch form
          </Button>
        </Card>
      )}

      {state.creationStep === 'form' && (
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
          {/* Form */}
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Name"
                placeholder="e.g. Doge Coin"
                value={state.formData.name}
                onChange={e => state.updateFormData({ name: e.target.value })}
                error={state.errors.name}
                disabled={state.isCreating}
              />
              <Input
                label="Ticker"
                placeholder="e.g. DOGE"
                value={state.formData.symbol}
                onChange={e =>
                  state.updateFormData({ symbol: e.target.value.toUpperCase() })
                }
                error={state.errors.symbol}
                disabled={state.isCreating}
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <label
                  className={cn(
                    'flex items-center justify-center gap-3 p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] cursor-pointer transition-colors',
                    !ipfsReady && 'opacity-60 cursor-not-allowed',
                    'hover:border-yellow-500/30 hover:bg-yellow-500/[0.02]'
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageSelected}
                    disabled={!ipfsReady || state.isCreating || ipfs.uploadingImage}
                  />
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt="Token preview"
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <Upload size={18} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    {ipfs.uploadingImage
                      ? `Uploading… ${ipfs.imageUploadProgress}%`
                      : ipfs.ipfsImageUrl
                      ? 'Uploaded'
                      : ipfsReady
                      ? 'Click to upload'
                      : 'IPFS not configured'}
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                loading={state.isCreating}
                disabled={launchDisabled}
                icon={<Rocket size={16} />}
              >
                Launch Token
              </Button>
            </form>
          </Card>

          {/* Token specs panel */}
          <Card className="p-6 bg-white/[0.02]">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">
              Token specs
            </div>
            <ul className="space-y-3">
              {SPECS.map(spec => (
                <li
                  key={spec.label}
                  className="flex flex-col gap-0.5 text-sm border-b border-white/[0.04] pb-2 last:border-b-0 last:pb-0"
                >
                  <span className="text-gray-500 text-xs">{spec.label}</span>
                  <span className="text-gray-200 font-medium">{spec.value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              These terms are protocol-wide and identical for every token. No
              configuration needed.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default QuickLaunchForm;
