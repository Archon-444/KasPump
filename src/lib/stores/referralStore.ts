/**
 * Shared Referral Store
 * In-memory storage for referral data (replace with database in production)
 */

// ============ Types ============

export interface ReferralRelationship {
  referrer: string;
  timestamp: number;
  expiresAt: number;
}

export interface ReferrerStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingRewards: string;
  lifetimeEarnings: string;
  referredUsers: string[];
}

// ============ Stores ============

// Maps user -> their referrer relationship
const referralRelationships = new Map<string, ReferralRelationship>();

// Maps referrer -> their stats
const referrerStats = new Map<string, ReferrerStats>();

// ============ Constants ============

export const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============ Functions ============

export function getReferrerStats(address: string): ReferrerStats {
  const normalizedAddress = address.toLowerCase();
  let stats = referrerStats.get(normalizedAddress);

  if (!stats) {
    stats = {
      totalReferrals: 0,
      activeReferrals: 0,
      pendingRewards: '0',
      lifetimeEarnings: '0',
      referredUsers: [],
    };
    referrerStats.set(normalizedAddress, stats);
  }

  return stats;
}

export function getUserReferrer(user: string): ReferralRelationship | undefined {
  return referralRelationships.get(user.toLowerCase());
}

export function hasReferrer(user: string): boolean {
  return referralRelationships.has(user.toLowerCase());
}

export function registerReferral(
  user: string,
  referrer: string
): { success: boolean; error?: string; expiresAt?: number } {
  const normalizedUser = user.toLowerCase();
  const normalizedReferrer = referrer.toLowerCase();

  // Check for self-referral
  if (normalizedUser === normalizedReferrer) {
    return { success: false, error: 'Self-referral is not allowed' };
  }

  // Check if user already has a referrer
  if (referralRelationships.has(normalizedUser)) {
    return { success: false, error: 'User already has a referrer' };
  }

  // Register the referral
  const now = Date.now();
  const expiresAt = now + ATTRIBUTION_WINDOW_MS;

  referralRelationships.set(normalizedUser, {
    referrer: normalizedReferrer,
    timestamp: now,
    expiresAt,
  });

  // Update referrer stats
  const stats = getReferrerStats(normalizedReferrer);
  stats.totalReferrals++;
  stats.activeReferrals++;
  stats.referredUsers.push(normalizedUser);

  return { success: true, expiresAt };
}

export function addReferralReward(referrer: string, amount: string): void {
  const stats = getReferrerStats(referrer);
  const pending = BigInt(stats.pendingRewards);
  const additional = BigInt(amount);
  stats.pendingRewards = (pending + additional).toString();
}

export function claimReferralRewards(referrer: string): string {
  const stats = getReferrerStats(referrer);
  const claimed = stats.pendingRewards;

  // Add to lifetime earnings
  const lifetime = BigInt(stats.lifetimeEarnings);
  const pending = BigInt(stats.pendingRewards);
  stats.lifetimeEarnings = (lifetime + pending).toString();
  stats.pendingRewards = '0';

  return claimed;
}

export function decrementActiveReferrals(referrer: string): void {
  const stats = getReferrerStats(referrer);
  if (stats.activeReferrals > 0) {
    stats.activeReferrals--;
  }
}

export default {
  getReferrerStats,
  getUserReferrer,
  hasReferrer,
  registerReferral,
  addReferralReward,
  claimReferralRewards,
  decrementActiveReferrals,
};
