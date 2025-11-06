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
  private apiKey?: string;
  private gatewayUrl: string;

  constructor(provider: 'pinata' | 'web3storage' | 'nftstorage' | 'local' = 'pinata') {
    this.provider = provider;
    this.gatewayUrl = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    
    // Load API key from environment
    if (provider === 'pinata') {
      this.apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    } else if (provider === 'web3storage') {
      this.apiKey = process.env.NEXT_PUBLIC_WEB3STORAGE_API_KEY;
    } else if (provider === 'nftstorage') {
      this.apiKey = process.env.NEXT_PUBLIC_NFTSTORAGE_API_KEY;
    }
  }

  /**
   * Check if IPFS is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Upload a file to IPFS
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

    // Check if configured
    if (!this.isConfigured()) {
      throw new Error(
        `IPFS ${this.provider} is not configured. Please set ${this.getEnvKeyName()} environment variable.`
      );
    }

    try {
      let hash: string;
      let uploadSize: number;

      switch (this.provider) {
        case 'pinata':
          ({ hash, uploadSize } = await this.uploadToPinata(file, fileName, onProgress));
          break;
        case 'web3storage':
          ({ hash, uploadSize } = await this.uploadToWeb3Storage(file, fileName, onProgress));
          break;
        case 'nftstorage':
          ({ hash, uploadSize } = await this.uploadToNFTStorage(file, fileName, onProgress));
          break;
        case 'local':
          throw new Error('Local IPFS node not supported in browser. Use a pinning service.');
        default:
          throw new Error(`Unsupported IPFS provider: ${this.provider}`);
      }

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

