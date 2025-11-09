/**
 * useIPFSUpload Hook
 * Manages IPFS image upload state and operations for token creation
 *
 * Extracted from TokenCreationModal to separate IPFS upload concerns
 *
 * @example
 * ```typescript
 * const {
 *   ipfsImageUrl,
 *   uploadingImage,
 *   imageUploadProgress,
 *   uploadImage,
 *   clearImage
 * } = useIPFSUpload();
 *
 * // Upload image
 * await uploadImage(file);
 *
 * // Use uploaded URL
 * console.log(ipfsImageUrl); // ipfs://...
 * ```
 */

import { useState, useCallback } from 'react';
import { uploadImageToIPFS, isIPFSConfigured } from '../lib/ipfs';

export interface UseIPFSUploadReturn {
  /** Uploaded IPFS URL */
  ipfsImageUrl: string;
  /** Whether upload is in progress */
  uploadingImage: boolean;
  /** Upload progress (0-100) */
  imageUploadProgress: number;
  /** Upload a file to IPFS */
  uploadImage: (file: File) => Promise<string | null>;
  /** Clear uploaded image */
  clearImage: () => void;
}

export function useIPFSUpload(): UseIPFSUploadReturn {
  const [ipfsImageUrl, setIpfsImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!isIPFSConfigured()) {
      console.warn('IPFS not configured, skipping upload');
      return null;
    }

    try {
      setUploadingImage(true);
      setImageUploadProgress(0);

      const result = await uploadImageToIPFS(file, {
        onProgress: (progress) => setImageUploadProgress(progress),
      });

      setIpfsImageUrl(result.url);
      return result.url;
    } catch (error: unknown) {
      console.error('IPFS upload failed:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const clearImage = useCallback(() => {
    setIpfsImageUrl('');
    setImageUploadProgress(0);
  }, []);

  return {
    ipfsImageUrl,
    uploadingImage,
    imageUploadProgress,
    uploadImage,
    clearImage,
  };
}
