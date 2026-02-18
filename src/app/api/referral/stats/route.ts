/**
 * Referral Stats API Route
 * GET /api/referral/stats?address=0x...
 *
 * Returns referral statistics for a given address
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getReferrerStats } from '../../../../lib/stores/referralStore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const stats = getReferrerStats(normalizedAddress);

    // In production, this would query the ReferralRegistry contract
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // const contract = new ethers.Contract(REFERRAL_REGISTRY_ADDRESS, REFERRAL_REGISTRY_ABI, provider);
    // const [totalReferrals, activeReferrals, pending, lifetime] = await contract.getReferrerStats(address);

    return NextResponse.json({
      address: normalizedAddress,
      totalReferrals: stats.totalReferrals,
      activeReferrals: stats.activeReferrals,
      pendingRewards: stats.pendingRewards,
      lifetimeEarnings: stats.lifetimeEarnings,
      referredCount: stats.referredUsers.length,
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral stats' },
      { status: 500 }
    );
  }
}
