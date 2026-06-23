import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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

      let resolveUpload: (value: { url: string }) => void;
      (ipfsLib.uploadImageToIPFS as any).mockImplementation(
        (_file: File, options: any) => {
          // Simulate progress
          if (options.onProgress) {
            options.onProgress(50);
            options.onProgress(100);
          }
          return new Promise<{ url: string }>((resolve) => {
            resolveUpload = resolve;
          });
        }
      );

      const { result } = renderHook(() => useIPFSUpload());

      let uploadPromise: Promise<string | null>;
      act(() => {
        uploadPromise = result.current.uploadImage(mockFile);
      });

      // Upload is in flight
      expect(result.current.uploadingImage).toBe(true);
      expect(result.current.imageUploadProgress).toBe(100);

      let url: string | null = null;
      await act(async () => {
        resolveUpload!({ url: mockUrl });
        url = await uploadPromise!;
      });

      expect(url).toBe(mockUrl);
      expect(result.current.ipfsImageUrl).toBe(mockUrl);
      expect(result.current.uploadingImage).toBe(false);
      expect(result.current.imageUploadProgress).toBe(100);
    });

    it('should handle upload progress updates', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      let progressCallback: ((progress: number) => void) | undefined;
      let resolveUpload: (value: { url: string }) => void;

      (ipfsLib.uploadImageToIPFS as any).mockImplementation(
        (_file: File, options: any) => {
          progressCallback = options.onProgress;
          return new Promise<{ url: string }>((resolve) => {
            resolveUpload = resolve;
          });
        }
      );

      const { result } = renderHook(() => useIPFSUpload());

      let uploadPromise: Promise<string | null>;
      act(() => {
        uploadPromise = result.current.uploadImage(mockFile);
      });

      expect(progressCallback).toBeTruthy();

      // Simulate progress updates
      act(() => {
        progressCallback!(25);
      });

      expect(result.current.imageUploadProgress).toBe(25);

      act(() => {
        progressCallback!(75);
      });

      expect(result.current.imageUploadProgress).toBe(75);

      // Finish the upload so no state updates leak past the test
      await act(async () => {
        resolveUpload!({ url: 'ipfs://test' });
        await uploadPromise!;
      });

      expect(result.current.uploadingImage).toBe(false);
    });

    it('should handle upload failure', async () => {
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockError = new Error('Upload failed');

      (ipfsLib.uploadImageToIPFS as any).mockRejectedValue(mockError);

      const { result } = renderHook(() => useIPFSUpload());

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.uploadImage(mockFile);
        } catch (error) {
          caught = error;
        }
      });

      expect(caught).toBe(mockError);
      expect(result.current.uploadingImage).toBe(false);
    });

    it('should skip upload when IPFS is not configured', async () => {
      (ipfsLib.isIPFSConfigured as any).mockReturnValue(false);

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const { result } = renderHook(() => useIPFSUpload());

      let url: string | null = 'unset';
      await act(async () => {
        url = await result.current.uploadImage(mockFile);
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
