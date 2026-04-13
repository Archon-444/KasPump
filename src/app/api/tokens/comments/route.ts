import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

interface Comment {
  id: string;
  tokenAddress: string;
  walletAddress: string;
  text: string;
  timestamp: number;
  likes: number;
  isCreator?: boolean;
}

function commentKey(tokenAddress: string): string {
  return `comments:${tokenAddress.toLowerCase()}`;
}

async function readComments(tokenAddress: string): Promise<Comment[]> {
  try {
    const comments = await kv.get<Comment[]>(commentKey(tokenAddress));
    return comments || [];
  } catch {
    return [];
  }
}

async function writeComments(tokenAddress: string, comments: Comment[]) {
  await kv.set(commentKey(tokenAddress), comments);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('address');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json({ error: 'Valid token address required' }, { status: 400 });
    }

    const limit = Math.min(parseInt(limitParam || '50'), 100);
    const offset = parseInt(offsetParam || '0');

    const comments = await readComments(tokenAddress);
    const sorted = comments.sort((a, b) => b.timestamp - a.timestamp);
    const paginated = sorted.slice(offset, offset + limit);

    return NextResponse.json({
      comments: paginated,
      total: comments.length,
      hasMore: offset + limit < comments.length,
    });
  } catch (error: any) {
    console.error('Comments GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, walletAddress, text, signature, isCreator } = body;

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json({ error: 'Valid token address required' }, { status: 400 });
    }
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text required' }, { status: 400 });
    }
    if (text.length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 });
    }

    if (signature) {
      try {
        const message = `Post comment on ${tokenAddress}: ${text.trim().slice(0, 100)}`;
        const recovered = ethers.verifyMessage(message, signature);
        if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
      }
    }

    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tokenAddress: tokenAddress.toLowerCase(),
      walletAddress: walletAddress.toLowerCase(),
      text: text.trim(),
      timestamp: Date.now(),
      likes: 0,
      isCreator: !!isCreator,
    };

    const comments = await readComments(tokenAddress);

    const recentByWallet = comments.filter(
      c => c.walletAddress === walletAddress.toLowerCase() && Date.now() - c.timestamp < 10000
    );
    if (recentByWallet.length >= 3) {
      return NextResponse.json({ error: 'Rate limited. Wait a moment.' }, { status: 429 });
    }

    comments.push(comment);
    await writeComments(tokenAddress, comments);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error('Comments POST Error:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
