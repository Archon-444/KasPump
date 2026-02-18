/**
 * Referral Registration API Route
 * POST /api/referral/register
 *
 * Registers a referral relationship between user and referrer
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { registerReferral, ATTRIBUTION_WINDOW_MS } from '../../../../lib/stores/referralStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, referrer } = body;

    // Validate inputs
    if (!user || !referrer) {
      return NextResponse.json(
        { error: 'User and referrer addresses are required' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(user) || !ethers.isAddress(referrer)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const normalizedUser = user.toLowerCase();
    const normalizedReferrer = referrer.toLowerCase();

    // Register the referral using shared store
    const result = registerReferral(normalizedUser, normalizedReferrer);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // In production, this would call the ReferralRegistry contract
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    // const contract = new ethers.Contract(REFERRAL_REGISTRY_ADDRESS, REFERRAL_REGISTRY_ABI, wallet);
    // await contract.registerReferral(user, referrer);

    return NextResponse.json({
      success: true,
      user: normalizedUser,
      referrer: normalizedReferrer,
      expiresAt: result.expiresAt,
      attributionWindow: ATTRIBUTION_WINDOW_MS,
    });
  } catch (error) {
    console.error('Referral registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register referral' },
      { status: 500 }
    );
  }
}
