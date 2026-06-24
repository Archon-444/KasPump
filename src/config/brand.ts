/**
 * Central brand configuration.
 * Change values here when the name/domain/handles are locked.
 * Consumed by: src/app/layout.tsx (metadata), src/config/wagmi.ts (connector metadata).
 *
 * Do NOT change until name + domain + X handle are confirmed together (see STATUS.md).
 */

export const brand = {
  name: 'KasPump',
  tagline: 'BSC Meme Coin Launchpad',
  description: 'Launch and trade meme coins instantly on BNB Smart Chain (BSC). No presale, no team allocation — fair launch for everyone.',
  shortDescription: 'KasPump multichain bonding curve trading',
  url: 'https://kaspump.io',
  ogImage: '/og-image.png',
  handles: {
    twitter: '',
    telegram: '',
  },
} as const;
