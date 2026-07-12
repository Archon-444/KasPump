'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, GraduationCap, Shield, ArrowRight } from 'lucide-react';
import { Button, Card } from '../ui';
import { cn } from '../../utils';

const STORAGE_KEY = 'kaspump_onboarded_v1';

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: <TrendingUp className="text-green-400" size={28} />,
    title: 'Tokens trade on a bonding curve',
    body:
      'Every new token starts on an automated bonding curve — the price rises as more people buy and falls as they sell, with no order book. You can buy or sell instantly at the curve price; early buys are cheaper.',
  },
  {
    icon: <GraduationCap className="text-yellow-400" size={28} />,
    title: 'Graduation moves it to a DEX',
    body:
      'When a token’s raised amount hits the graduation threshold, most of the funds automatically become DEX liquidity (e.g. PancakeSwap) and the token “graduates.” From then on it trades on the open market, not the curve.',
  },
  {
    icon: <Shield className="text-orange-400" size={28} />,
    title: 'Anti-sniper fees at launch',
    body:
      'For the first minute after launch, trading fees are much higher to discourage bots from sniping the opening. The fee decays automatically — wait out the window and always trade with a slippage tolerance set from the live quote.',
  },
];

export interface TraderOnboardingModalProps {
  /** Force-open regardless of the stored flag (for testing/replay). */
  forceOpen?: boolean;
  onClose?: () => void;
}

export const TraderOnboardingModal: React.FC<TraderOnboardingModalProps> = ({ forceOpen, onClose }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  // First visit only: open once, unless forced.
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable (private mode) — skip onboarding silently.
    }
  }, [forceOpen]);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
    onClose?.();
  };

  // Escape to close + focus the dialog on open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = STEPS[step];
  if (!open || !current) return null;

  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md z-10 focus:outline-none"
        >
          <Card className="glassmorphism p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/[0.06]">{current.icon}</div>
                <h2 id="onboarding-title" className="text-lg font-semibold text-white">
                  {current.title}
                </h2>
              </div>
              <button
                onClick={close}
                aria-label="Skip onboarding"
                className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors flex-shrink-0"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed min-h-[96px]">{current.body}</p>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 my-4" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === step ? 'w-6 bg-yellow-500' : 'w-1.5 bg-white/20'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={close} className="text-xs text-gray-500 hover:text-gray-300">
                Skip
              </button>
              <Button
                onClick={() => (isLast ? close() : setStep((s) => s + 1))}
                className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-white"
              >
                {isLast ? 'Start trading' : 'Next'}
                {!isLast && <ArrowRight size={14} />}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
