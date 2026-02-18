import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIPFSUpload } from './useIPFSUpload';
import * as ipfsLib from '../lib/ipfs';

// Mock the IPFS library
vi.mock('../lib/ipfs', () => ({
  uploadImageToIPFS: vi.fn(),
  isIPFSConfigured: vi.fn(),
}));

describe('useIPFSUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ipfsLib.isIPFSConfigured as any).mockReturnValue(true);
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useIPFSUpload());

      expect(result.current.ipfsImageUrl).toBe('');
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.imageUploadProgress).toBe(0);
    });
  });

  describe('Image Upload', () => {
    it('should upload image successfully', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockUrl = 'ipfs://QmTest123';

      (ipfsLib.uploadImageToIPFS as any).mockImplementation(
        (...args: any[]) => {
          const options = args[1];
          // Simulate progress
          if (options.onProgress) {
            options.onProgress(50);
            options.onProgress(100);
          }
          return Promise.resolve({ url: mockUrl });
        }
      );

      const { result } = renderHook(() => useIPFSUpload());

      const uploadPromise = act(async () => {
        return result.current.uploadImage(mockFile);
      });

      await waitFor(() => {
        expect(result.current.uploadingImage).toBe(true);
      });

      const url = await uploadPromise;

      expect(url).toBe(mockUrl);
      expect(result.current.ipfsImageUrl).toBe(mockUrl);
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.imageUploadProgress).toBe(100);
    });

    it('should handle upload progress updates', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      let progressCallback: ((progress: number) => void) | null = null;

      (ipfsLib.uploadImageToIPFS as any).mockImplementation(
        (...args: any[]) => {
          const options = args[1];
          progressCallback = options.onProgress;
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ url: 'ipfs://test' });
            }, 100);
          });
        }
      );

      const { result } = renderHook(() => useIPFSUpload());

      act(() => {
        result.current.uploadImage(mockFile);
      });

      await waitFor(() => {
        expect(progressCallback).toBeTruthy();
      });

      // Simulate progress updates
      act(() => {
        progressCallback!(25);
      });

      expect(result.current.imageUploadProgress).toBe(25);

      act(() => {
        progressCallback!(75);
      });

      expect(result.current.imageUploadProgress).toBe(75);
    });

    it('should handle upload failure', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockError = new Error('Upload failed');

      (ipfsLib.uploadImageToIPFS as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useIPFSUpload());

      await expect(
        act(async () => {
          return result.current.uploadImage(mockFile);
        })
      ).rejects.toThrow('Upload failed');

      expect(result.current.uploadingImage).toBe(false);
    });

    it('should skip upload when IPFS is not configured', async () => {
      (ipfsLib.isIPFSConfigured as any).mockReturnValue(false);

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const { result } = renderHook(() => useIPFSUpload());

      const url = await act(async () => {
        return result.current.uploadImage(mockFile);
      });

      expect(url).toBeNull();
      expect(ipfsLib.uploadImageToIPFS).not.toHaveBeenCalled();
    });
  });

  describe('Clear Image', () => {
    it('should clear image URL and reset state', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockUrl = 'ipfs://QmTest123';

      (ipfsLib.uploadImageToIPFS as any).mockResolvedValue({ url: mockUrl });

      const { result } = renderHook(() => useIPFSUpload());

      // Upload first
      await act(async () => {
        await result.current.uploadImage(mockFile);
      });

      expect(result.current.ipfsImageUrl).toBe(mockUrl);

      // Clear
      act(() => {
        result.current.clearImage();
      });

      expect(result.current.ipfsImageUrl).toBe('');
      expect(result.current.imageUploadProgress).toBe(0);
    });
  });

  describe('Multiple Uploads', () => {
    it('should handle multiple consecutive uploads', async () => {
      const mockFile1 = new File(['test1'], 'test1.png', { type: 'image/png' });
      const mockFile2 = new File(['test2'], 'test2.png', { type: 'image/png' });

      (ipfsLib.uploadImageToIPFS as any)
        .mockResolvedValueOnce({ url: 'ipfs://QmTest1' })
        .mockResolvedValueOnce({ url: 'ipfs://QmTest2' });

      const { result } = renderHook(() => useIPFSUpload());

      // First upload
      await act(async () => {
        await result.current.uploadImage(mockFile1);
      });

      expect(result.current.ipfsImageUrl).toBe('ipfs://QmTest1');

      // Second upload (should replace)
      await act(async () => {
        await result.current.uploadImage(mockFile2);
      });

      expect(result.current.ipfsImageUrl).toBe('ipfs://QmTest2');
      expect(ipfsLib.uploadImageToIPFS).toHaveBeenCalledTimes(2);
    });
  });
});
