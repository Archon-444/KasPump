/**
 * Comments API Route
 * GET /api/comments/[tokenAddress] - Get comments for a token
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getComments } from '../../../../lib/stores/commentsStore';

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
    const sortBy = searchParams.get('sortBy') || 'newest'; // newest, oldest, reactions

    let allComments = getComments(tokenAddress);

    // Sort comments
    if (sortBy === 'oldest') {
      allComments = [...allComments].sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortBy === 'reactions') {
      allComments = [...allComments].sort((a, b) => {
        const aTotal = Object.values(a.reactions).reduce((sum, v) => sum + v, 0);
        const bTotal = Object.values(b.reactions).reduce((sum, v) => sum + v, 0);
        return bTotal - aTotal;
      });
    }
    // Default 'newest' is already sorted by createdAt desc from addComment

    // Pinned comments first
    const pinned = allComments.filter(c => c.isPinned);
    const unpinned = allComments.filter(c => !c.isPinned);
    allComments = [...pinned, ...unpinned];

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
