/**
 * Referral Registration API Route
 * POST /api/referral/register
 *
 * Registers a referral relationship between user and referrer
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// In-memory store for demo (replace with database in production)
const referralRelationships = new Map<string, {
  referrer: string;
  timestamp: number;
  expiresAt: number;
}>();

const referrerStats = new Map<string, {
  totalReferrals: number;
  activeReferrals: number;
  referredUsers: string[];
}>();

const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

    // Check for self-referral
    if (normalizedUser === normalizedReferrer) {
      return NextResponse.json(
        { error: 'Self-referral is not allowed' },
        { status: 400 }
      );
    }

    // Check if user already has a referrer
    if (referralRelationships.has(normalizedUser)) {
      return NextResponse.json(
        { error: 'User already has a referrer' },
        { status: 400 }
      );
    }

    // Register the referral
    const now = Date.now();
    referralRelationships.set(normalizedUser, {
      referrer: normalizedReferrer,
      timestamp: now,
      expiresAt: now + ATTRIBUTION_WINDOW_MS,
    });

    // Update referrer stats
    let stats = referrerStats.get(normalizedReferrer);
    if (!stats) {
      stats = {
        totalReferrals: 0,
        activeReferrals: 0,
        referredUsers: [],
      };
    }
    stats.totalReferrals++;
    stats.activeReferrals++;
    stats.referredUsers.push(normalizedUser);
    referrerStats.set(normalizedReferrer, stats);

    // In production, this would call the ReferralRegistry contract
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    // const contract = new ethers.Contract(REFERRAL_REGISTRY_ADDRESS, REFERRAL_REGISTRY_ABI, wallet);
    // await contract.registerReferral(user, referrer);

    return NextResponse.json({
      success: true,
      user: normalizedUser,
      referrer: normalizedReferrer,
      expiresAt: now + ATTRIBUTION_WINDOW_MS,
    });
  } catch (error) {
    console.error('Referral registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register referral' },
      { status: 500 }
    );
  }
}
