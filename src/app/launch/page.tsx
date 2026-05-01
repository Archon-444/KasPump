'use client';

/**
 * /launch — V2 (PR 4) thin wrapper around <QuickLaunchForm />.
 *
 * The previous 5-step wizard (curve type, supply, base price, slope,
 * social links, multi-chain deployment, simulator preview) is gone:
 * curve / supply / price are protocol-wide constants now (see
 * contracts/libraries/BondingCurveMath.sol). This page is just chrome
 * around the 3-field launch flow.
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { QuickLaunchForm } from '../../components/features/QuickLaunchForm';
import { WalletRequired } from '../../components/features/WalletConnectButton';
import { Button } from '../../components/ui';
import { AmbientBackground } from '../../components/ui/enhanced';

export default function LaunchPage() {
  const router = useRouter();

  return (
    <AmbientBackground>
      <main className="min-h-screen px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              icon={<ArrowLeft size={14} />}
            >
              Back
            </Button>
          </div>

          <WalletRequired>
            <QuickLaunchForm />
          </WalletRequired>
        </div>
      </main>
    </AmbientBackground>
  );
}
