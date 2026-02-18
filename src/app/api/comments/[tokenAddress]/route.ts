/**
 * Comments API Route
 * GET /api/comments/[tokenAddress] - Get comments for a token
 * POST /api/comments - Create a new comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// ============ Types ============

interface Comment {
  id: string;
  tokenAddress: string;
  author: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  reactions: {
    rocket: number;
    fire: number;
    poop: number;
    heart: number;
    laugh: number;
  };
  parentId?: string;
  replyCount: number;
  isEdited: boolean;
  isPinned: boolean;
}

// ============ In-Memory Store (Replace with DB in production) ============

const commentsStore = new Map<string, Comment[]>();

function getComments(tokenAddress: string): Comment[] {
  return commentsStore.get(tokenAddress.toLowerCase()) || [];
}

function addComment(comment: Comment): void {
  const tokenAddress = comment.tokenAddress.toLowerCase();
  const comments = getComments(tokenAddress);
  comments.unshift(comment);
  commentsStore.set(tokenAddress, comments);
}

// ============ GET Handler ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenAddress: string }> }
) {
  try {
    const { tokenAddress } = await params;

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid token address' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const allComments = getComments(tokenAddress);
    const paginatedComments = allComments.slice(offset, offset + limit);

    return NextResponse.json({
      comments: paginatedComments,
      total: allComments.length,
      hasMore: offset + limit < allComments.length,
    });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
