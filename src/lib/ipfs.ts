/**
 * IPFS Integration for Token Image Storage
 * 
 * Supports multiple IPFS providers:
 * - Pinata (recommended)
 * - Web3.Storage
 * - NFT.Storage
 * 
 * Usage:
 * ```typescript
 * const ipfs = new IPFSClient();
 * const hash = await ipfs.uploadFile(file);
 * const url = ipfs.getGatewayUrl(hash);
 * ```
 */

export interface IPFSUploadOptions {
  fileName?: string;
  maxSize?: number; // in bytes
  onProgress?: (progress: number) => void;
}

export interface IPFSUploadResult {
  hash: string; // IPFS CID/hash
  url: string; // Gateway URL
  size: number; // File size in bytes
  mimeType: string;
}

export class IPFSClient {
  private provider: 'pinata' | 'web3storage' | 'nftstorage' | 'local';
  private gatewayUrl: string;
  apiKey?: string;

  constructor(provider: 'pinata' | 'web3storage' | 'nftstorage' | 'local' = 'pinata') {
    this.provider = provider;
    this.gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

    // SECURITY FIX: API keys are now server-side only
    // Uploads go through /api/ipfs/upload endpoint
  }

  /**
   * Check if IPFS is properly configured
   * SECURITY: Always returns true as API keys are server-side
   */
  isConfigured(): boolean {
    // Always configured - server validates API keys
    return true;
  }

  /**
   * Upload a file to IPFS via server-side API
   * SECURITY FIX: API keys are server-side only
   */
  async uploadFile(
    file: File,
    options: IPFSUploadOptions = {}
  ): Promise<IPFSUploadResult> {
    const { fileName, maxSize = 5 * 1024 * 1024, onProgress: _onProgress } = options; // Default 5MB max

    // Validate file size
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum of ${maxSize / 1024 / 1024}MB`);
    }

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are supported');
    }

    try {
      // Use server-side API route (API keys are server-side only)
      const formData = new FormData();
      formData.append('file', file, fileName || file.name);

      // Call server-side upload endpoint
      const response = await fetch(`/api/ipfs/upload?provider=${this.provider}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      if (!result.success || !result.ipfsUrl) {
        throw new Error('Invalid response from upload API');
      }

      // Extract hash from ipfs:// URL
      const hash = result.ipfsUrl.replace('ipfs://', '');
      const uploadSize = file.size;

      return {
        hash,
        url: this.getGatewayUrl(hash),
        size: uploadSize,
        mimeType: file.type,
      };
    } catch (error: any) {
      console.error('IPFS upload error:', error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Get IPFS gateway URL for a hash
   */
  getGatewayUrl(hash: string): string {
    // Remove 'ipfs://' prefix if present
    const cleanHash = hash.replace(/^ipfs:\/\//, '');
    return `${this.gatewayUrl}${cleanHash}`;
  }

  /**
   * Validate IPFS hash format
   */
  static isValidHash(hash: string): boolean {
    // Basic CID validation (supports CIDv0 and CIDv1)
    const cidRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^[a-z0-9]{46,}$/;
    return cidRegex.test(hash.replace(/^ipfs:\/\//, ''));
  }

}

/**
 * Default IPFS client instance
 * Uses provider from environment or defaults to Pinata
 */
export const ipfsClient = new IPFSClient(
  (process.env.NEXT_PUBLIC_IPFS_PROVIDER as any) || 'pinata'
);

/**
 * Upload image file to IPFS (convenience function)
 */
export async function uploadImageToIPFS(
  file: File,
  options?: IPFSUploadOptions
): Promise<IPFSUploadResult> {
  return ipfsClient.uploadFile(file, options);
}

/**
 * Check if IPFS is configured
 */
export function isIPFSConfigured(): boolean {
  return ipfsClient.isConfigured();
}

