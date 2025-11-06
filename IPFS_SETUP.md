# IPFS Integration Setup Guide

## Overview

KasPump now supports IPFS integration for storing token images on decentralized storage. The integration supports multiple IPFS providers and will automatically upload images when configured.

## Supported Providers

1. **Pinata** (Recommended) - Most reliable and feature-rich
2. **Web3.Storage** - Free tier available
3. **NFT.Storage** - Free tier available

## Setup Instructions

### Option 1: Pinata (Recommended)

1. **Create a Pinata Account**
   - Visit https://pinata.cloud
   - Sign up for a free account
   - Verify your email

2. **Generate API Key**
   - Go to Account Settings → API Keys
   - Click "New Key"
   - Grant "Pin File to IPFS" permission
   - Copy your JWT token

3. **Add to Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_IPFS_PROVIDER=pinata
   NEXT_PUBLIC_PINATA_API_KEY=your_jwt_token_here
   NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
   ```

### Option 2: Web3.Storage

1. **Create Account**
   - Visit https://web3.storage
   - Sign up with email or GitHub

2. **Generate API Token**
   - Go to Account → Create API Token
   - Copy the token

3. **Add to Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_IPFS_PROVIDER=web3storage
   NEXT_PUBLIC_WEB3STORAGE_API_KEY=your_token_here
   NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
   ```

### Option 3: NFT.Storage

1. **Create Account**
   - Visit https://nft.storage
   - Sign up with email or GitHub

2. **Generate API Key**
   - Go to Account → API Keys → Create API Key
   - Copy the key

3. **Add to Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_IPFS_PROVIDER=nftstorage
   NEXT_PUBLIC_NFTSTORAGE_API_KEY=your_key_here
   NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
   ```

## How It Works

1. **Image Upload Flow**:
   - User selects an image in the token creation form
   - If IPFS is configured, the image is automatically uploaded to IPFS
   - Upload progress is shown to the user
   - The IPFS hash/URL is stored and used when creating the token

2. **Fallback Behavior**:
   - If IPFS is not configured, images are stored locally (browser only)
   - If IPFS upload fails, the creation process continues without IPFS URL
   - Users can still create tokens without IPFS

3. **Multi-Chain Support**:
   - IPFS URLs are stored once and reused across all chains
   - Images are accessible from any chain since they're on IPFS

## Verification

After setup, you can verify IPFS is working by:

1. Creating a test token with an image
2. Checking the browser console for IPFS upload messages
3. The image URL in the token creation confirmation should show an IPFS gateway URL

## Troubleshooting

**Issue**: IPFS upload fails
- **Solution**: Check API key is correct and has proper permissions
- Verify environment variables are loaded (restart dev server)
- Check browser console for specific error messages

**Issue**: Images not showing after upload
- **Solution**: Verify gateway URL is correct
- Some gateways may have rate limits, try a different one
- Check IPFS hash is valid using IPFS explorer

## Code Location

- **IPFS Client**: `src/lib/ipfs.ts`
- **Integration**: `src/components/features/TokenCreationModal.tsx`
- **Usage**: Automatic when environment variables are set

## Notes

- Images are automatically uploaded when selected (if IPFS is configured)
- Upload happens in the background while user fills out the form
- Progress is shown during upload
- Failed uploads don't block token creation

