/**
 * Shared Comments Store
 * In-memory storage for comments (replace with database in production)
 */

// ============ Types ============

export interface Comment {
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

export type ReactionType = 'rocket' | 'fire' | 'poop' | 'heart' | 'laugh';

// ============ Store ============

const commentsStore = new Map<string, Comment[]>();

// ============ Functions ============

export function getComments(tokenAddress: string): Comment[] {
  return commentsStore.get(tokenAddress.toLowerCase()) || [];
}

export function getCommentById(commentId: string): Comment | undefined {
  for (const comments of commentsStore.values()) {
    const found = comments.find(c => c.id === commentId);
    if (found) return found;
  }
  return undefined;
}

export function addComment(comment: Comment): void {
  const tokenAddress = comment.tokenAddress.toLowerCase();
  const comments = commentsStore.get(tokenAddress) || [];
  comments.unshift(comment);
  commentsStore.set(tokenAddress, comments);

  // Update parent's reply count if this is a reply
  if (comment.parentId) {
    const parentComment = getCommentById(comment.parentId);
    if (parentComment) {
      parentComment.replyCount++;
    }
  }
}

export function updateComment(commentId: string, content: string): Comment | null {
  for (const comments of commentsStore.values()) {
    const index = comments.findIndex(c => c.id === commentId);
    if (index !== -1) {
      const comment = comments[index];
      if (comment) {
        comment.content = content;
        comment.updatedAt = Date.now();
        comment.isEdited = true;
        return comment;
      }
    }
  }
  return null;
}

export function deleteComment(commentId: string): boolean {
  for (const [tokenAddress, comments] of commentsStore.entries()) {
    const index = comments.findIndex(c => c.id === commentId);
    if (index !== -1) {
      const comment = comments[index];
      comments.splice(index, 1);
      commentsStore.set(tokenAddress, comments);

      // Update parent's reply count if this was a reply
      if (comment?.parentId) {
        const parentComment = getCommentById(comment.parentId);
        if (parentComment && parentComment.replyCount > 0) {
          parentComment.replyCount--;
        }
      }
      return true;
    }
  }
  return false;
}

export function addReaction(commentId: string, reaction: ReactionType): Comment | null {
  const comment = getCommentById(commentId);
  if (comment) {
    comment.reactions[reaction]++;
    return comment;
  }
  return null;
}

export function removeReaction(commentId: string, reaction: ReactionType): Comment | null {
  const comment = getCommentById(commentId);
  if (comment && comment.reactions[reaction] > 0) {
    comment.reactions[reaction]--;
    return comment;
  }
  return null;
}

export function pinComment(commentId: string, isPinned: boolean): Comment | null {
  const comment = getCommentById(commentId);
  if (comment) {
    comment.isPinned = isPinned;
    return comment;
  }
  return null;
}

export default commentsStore;
