/**
 * Badge Configuration
 * Defines all badge types, their criteria, and visual styling
 */

export enum BadgeType {
  NONE = 0,
  VERIFIED_CREATOR = 1,
  AUDITED = 2,
  COMMUNITY_CHOICE = 3,
  GRADUATED = 4,
  PARTNER = 5,
  NEW_LAUNCH = 6, // Frontend-only badge (< 24h old)
  TRENDING = 7,   // Frontend-only badge (high volume)
}

export interface BadgeConfig {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  priority: number; // Higher = displayed first
  isAutomatic: boolean; // Can be granted automatically
  criteria?: string;
}

export const BADGE_CONFIGS: Record<BadgeType, BadgeConfig> = {
  [BadgeType.NONE]: {
    type: BadgeType.NONE,
    name: '',
    description: '',
    icon: '',
    color: '',
    bgColor: '',
    borderColor: '',
    priority: 0,
    isAutomatic: false,
  },

  [BadgeType.VERIFIED_CREATOR]: {
    type: BadgeType.VERIFIED_CREATOR,
    name: 'Verified Creator',
    description: 'Creator identity has been verified through KYC',
    icon: '✓',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    priority: 100,
    isAutomatic: false,
    criteria: 'Complete KYC verification process',
  },

  [BadgeType.AUDITED]: {
    type: BadgeType.AUDITED,
    name: 'Audited',
    description: 'Smart contract audited by a third-party security firm',
    icon: '🛡️',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    priority: 90,
    isAutomatic: false,
    criteria: 'Pass security audit from approved auditors',
  },

  [BadgeType.COMMUNITY_CHOICE]: {
    type: BadgeType.COMMUNITY_CHOICE,
    name: 'Community Choice',
    description: 'High community engagement and holder trust',
    icon: '⭐',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    priority: 70,
    isAutomatic: true,
    criteria: '>100 holders and >50 comments',
  },

  [BadgeType.GRADUATED]: {
    type: BadgeType.GRADUATED,
    name: 'Graduated',
    description: 'Successfully graduated to DEX with locked liquidity',
    icon: '🚀',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    priority: 80,
    isAutomatic: true,
    criteria: 'Complete bonding curve graduation',
  },

  [BadgeType.PARTNER]: {
    type: BadgeType.PARTNER,
    name: 'Partner',
    description: 'Official KasPump partnership',
    icon: '💎',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    priority: 95,
    isAutomatic: false,
    criteria: 'Approved partnership agreement',
  },

  [BadgeType.NEW_LAUNCH]: {
    type: BadgeType.NEW_LAUNCH,
    name: 'New Launch',
    description: 'Token created within the last 24 hours',
    icon: '🆕',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    priority: 50,
    isAutomatic: true,
    criteria: 'Created < 24 hours ago',
  },

  [BadgeType.TRENDING]: {
    type: BadgeType.TRENDING,
    name: 'Trending',
    description: 'High trading volume relative to market cap',
    icon: '🔥',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    priority: 60,
    isAutomatic: true,
    criteria: 'Volume > 30% of market cap in 24h',
  },
};

/**
 * Get badge config by type
 */
export function getBadgeConfig(type: BadgeType): BadgeConfig {
  return BADGE_CONFIGS[type] || BADGE_CONFIGS[BadgeType.NONE];
}

/**
 * Sort badges by priority (highest first)
 */
export function sortBadgesByPriority(badges: BadgeType[]): BadgeType[] {
  return [...badges].sort((a, b) => {
    const configA = getBadgeConfig(a);
    const configB = getBadgeConfig(b);
    return configB.priority - configA.priority;
  });
}

/**
 * Calculate automatic badges based on token data
 */
export function calculateAutomaticBadges(token: {
  createdAt: Date;
  holders: number;
  volume24h: number;
  marketCap: number;
  isGraduated: boolean;
  commentCount?: number;
}): BadgeType[] {
  const badges: BadgeType[] = [];

  // New Launch badge (< 24 hours)
  const hoursSinceCreation = (Date.now() - token.createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation < 24) {
    badges.push(BadgeType.NEW_LAUNCH);
  }

  // Trending badge (volume > 30% of market cap)
  if (token.marketCap > 0 && token.volume24h / token.marketCap > 0.3) {
    badges.push(BadgeType.TRENDING);
  }

  // Graduated badge
  if (token.isGraduated) {
    badges.push(BadgeType.GRADUATED);
  }

  // Community Choice badge (>100 holders, >50 comments)
  if (token.holders > 100 && (token.commentCount ?? 0) > 50) {
    badges.push(BadgeType.COMMUNITY_CHOICE);
  }

  return badges;
}

export default BADGE_CONFIGS;
