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
    const { fileName, maxSize = 5 * 1024 * 1024, onProgress } = options; // Default 5MB max

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
   * Upload to Pinata
   */
  private async uploadToPinata(
    file: File,
    fileName?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ hash: string; uploadSize: number }> {
    const formData = new FormData();
    formData.append('file', file);

    // Pinata metadata
    const metadata = JSON.stringify({
      name: fileName || file.name,
      keyvalues: {
        app: 'kaspump',
        type: 'token-image',
      },
    });
    formData.append('pinataMetadata', metadata);

    // Pinata options
    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', pinataOptions);

    // Upload with progress tracking
    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              hash: response.IpfsHash,
              uploadSize: file.size,
            });
          } catch (error) {
            reject(new Error('Invalid response from Pinata'));
          }
        } else {
          reject(new Error(`Pinata upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during Pinata upload'));
      });

      xhr.open('POST', 'https://api.pinata.cloud/pinning/pinFileToIPFS');
      xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
      xhr.send(formData);
    });
  }

  /**
   * Upload to Web3.Storage
   */
  private async uploadToWeb3Storage(
    file: File,
    fileName?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ hash: string; uploadSize: number }> {
    // Web3.Storage uses fetch API
    const formData = new FormData();
    formData.append('file', file, fileName || file.name);

    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      hash: data.cid,
      uploadSize: file.size,
    };
  }

  /**
   * Upload to NFT.Storage
   */
  private async uploadToNFTStorage(
    file: File,
    fileName?: string,
    onProgress?: (progress: number) => void
  ): Promise<{ hash: string; uploadSize: number }> {
    // NFT.Storage uses similar API to Web3.Storage
    const formData = new FormData();
    formData.append('file', file, fileName || file.name);

    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`NFT.Storage upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      hash: data.value.cid,
      uploadSize: file.size,
    };
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

  /**
   * Get environment variable key name for current provider
   */
  private getEnvKeyName(): string {
    switch (this.provider) {
      case 'pinata':
        return 'NEXT_PUBLIC_PINATA_API_KEY';
      case 'web3storage':
        return 'NEXT_PUBLIC_WEB3STORAGE_API_KEY';
      case 'nftstorage':
        return 'NEXT_PUBLIC_NFTSTORAGE_API_KEY';
      default:
        return 'IPFS_API_KEY';
    }
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

