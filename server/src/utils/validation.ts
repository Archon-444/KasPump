import { isAddress } from 'ethers';

/**
 * Socket clients send arbitrary payloads. Room names and Redis cache keys are
 * built directly from `tokenAddress` / `network`, so unvalidated input lets a
 * client join arbitrary rooms, poison cache lookups, or grow the room map with
 * junk keys. Validate before any string is used to build a key or room.
 */

// Network keys the server actually indexes (mirrors NETWORK_CONFIGS in
// BlockchainListener). Anything else is rejected rather than used as a key.
export const SUPPORTED_NETWORKS = [
  'bscTestnet',
  'bsc',
  'arbitrumSepolia',
  'arbitrum',
  'baseSepolia',
  'base',
] as const;

export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

export function isValidNetwork(network: unknown): network is SupportedNetwork {
  return typeof network === 'string' && (SUPPORTED_NETWORKS as readonly string[]).includes(network);
}

export function isValidTokenAddress(address: unknown): address is string {
  return typeof address === 'string' && isAddress(address);
}

/**
 * Validate a subscribe/get payload. `network` is optional for token
 * subscription (falls back to cached lookup without a network prefix) but,
 * when present, must be a known network. Returns a normalized address (checksum
 * left as-is; callers lowercase where they key) or an error string.
 */
export function validateTokenPayload(
  data: unknown,
  { requireNetwork = false }: { requireNetwork?: boolean } = {}
): { ok: true; tokenAddress: string; network?: string } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Invalid payload' };
  }
  const { tokenAddress, network } = data as { tokenAddress?: unknown; network?: unknown };

  if (!isValidTokenAddress(tokenAddress)) {
    return { ok: false, error: 'Invalid token address' };
  }
  if (network !== undefined && !isValidNetwork(network)) {
    return { ok: false, error: 'Unsupported network' };
  }
  if (requireNetwork && network === undefined) {
    return { ok: false, error: 'Network required' };
  }
  return { ok: true, tokenAddress, ...(network !== undefined ? { network: network as string } : {}) };
}

export function validateNetworkPayload(
  data: unknown
): { ok: true; network: string } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Invalid payload' };
  }
  const { network } = data as { network?: unknown };
  if (!isValidNetwork(network)) {
    return { ok: false, error: 'Unsupported network' };
  }
  return { ok: true, network };
}
