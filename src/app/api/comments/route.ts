/**
 * Comments API Route
 * POST /api/comments - Create a new comment
 * PATCH /api/comments - Update a comment
 * DELETE /api/comments - Delete a comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  Comment,
  addComment,
  updateComment,
  deleteComment,
  addReaction,
  removeReaction,
  getCommentById,
  ReactionType,
} from '../../../lib/stores/commentsStore';

// ============ POST Handler - Create Comment ============

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

    // Validate parent exists if this is a reply
    if (parentId) {
      const parent = getCommentById(parentId);
      if (!parent) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
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

// ============ PATCH Handler - Update Comment or Add Reaction ============

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, author, content, reaction, action } = body;

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const existingComment = getCommentById(commentId);
    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Handle reaction
    if (reaction) {
      const validReactions: ReactionType[] = ['rocket', 'fire', 'poop', 'heart', 'laugh'];
      if (!validReactions.includes(reaction)) {
        return NextResponse.json(
          { error: 'Invalid reaction type' },
          { status: 400 }
        );
      }

      const updated = action === 'remove'
        ? removeReaction(commentId, reaction)
        : addReaction(commentId, reaction);

      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to update reaction' },
          { status: 500 }
        );
      }

      return NextResponse.json(updated);
    }

    // Handle content update
    if (content !== undefined) {
      if (!author || !ethers.isAddress(author)) {
        return NextResponse.json(
          { error: 'Author address required for editing' },
          { status: 400 }
        );
      }

      if (existingComment.author.toLowerCase() !== author.toLowerCase()) {
        return NextResponse.json(
          { error: 'Not authorized to edit this comment' },
          { status: 403 }
        );
      }

      if (typeof content !== 'string' || content.trim().length === 0) {
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

      const updated = updateComment(commentId, content.trim());
      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to update comment' },
          { status: 500 }
        );
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: 'No update action specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// ============ DELETE Handler - Delete Comment ============

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const author = searchParams.get('author');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const existingComment = getCommentById(commentId);
    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (!author || !ethers.isAddress(author)) {
      return NextResponse.json(
        { error: 'Author address required for deletion' },
        { status: 400 }
      );
    }

    if (existingComment.author.toLowerCase() !== author.toLowerCase()) {
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }

    const deleted = deleteComment(commentId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
