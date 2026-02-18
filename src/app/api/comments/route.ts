/**
 * Comments API Route
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

function addComment(comment: Comment): void {
  const tokenAddress = comment.tokenAddress.toLowerCase();
  const comments = commentsStore.get(tokenAddress) || [];
  comments.unshift(comment);
  commentsStore.set(tokenAddress, comments);
}

// ============ POST Handler ============

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, author, content, parentId } = body;

    // Validate inputs
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid token address' },
        { status: 400 }
      );
    }

    if (!author || !ethers.isAddress(author)) {
      return NextResponse.json(
        { error: 'Invalid author address' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Create comment
    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tokenAddress: tokenAddress.toLowerCase(),
      author: author.toLowerCase(),
      content: content.trim(),
      createdAt: Date.now(),
      reactions: {
        rocket: 0,
        fire: 0,
        poop: 0,
        heart: 0,
        laugh: 0,
      },
      parentId: parentId || undefined,
      replyCount: 0,
      isEdited: false,
      isPinned: false,
    };

    addComment(comment);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
