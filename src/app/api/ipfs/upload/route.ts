import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side IPFS upload API route
 * SECURITY: API keys stored server-side only (no NEXT_PUBLIC_ prefix)
 * Proxies uploads to IPFS providers without exposing keys to client
 */

interface UploadResponse {
  success: boolean;
  ipfsUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get provider from query or default to Pinata
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'pinata';

    // Upload based on provider
    let ipfsUrl: string;

    switch (provider) {
      case 'pinata':
        ipfsUrl = await uploadToPinata(file);
        break;
      case 'web3storage':
        ipfsUrl = await uploadToWeb3Storage(file);
        break;
      case 'nftstorage':
        ipfsUrl = await uploadToNFTStorage(file);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid provider' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ipfsUrl
    });

  } catch (error) {
    console.error('IPFS upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Upload to Pinata
 * Uses server-side PINATA_API_KEY (no NEXT_PUBLIC_)
 */
async function uploadToPinata(file: File): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Pinata API credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': apiSecret,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Upload to Web3.Storage
 * Uses server-side WEB3STORAGE_API_KEY (no NEXT_PUBLIC_)
 */
async function uploadToWeb3Storage(file: File): Promise<string> {
  const apiKey = process.env.WEB3STORAGE_API_KEY;

  if (!apiKey) {
    throw new Error('Web3.Storage API key not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.web3.storage/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Web3.Storage upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return `ipfs://${data.cid}`;
}

/**
 * Upload to NFT.Storage
 * Uses server-side NFTSTORAGE_API_KEY (no NEXT_PUBLIC_)
 */
async function uploadToNFTStorage(file: File): Promise<string> {
  const apiKey = process.env.NFTSTORAGE_API_KEY;

  if (!apiKey) {
    throw new Error('NFT.Storage API key not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.nft.storage/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`NFT.Storage upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return `ipfs://${data.value.cid}`;
}
