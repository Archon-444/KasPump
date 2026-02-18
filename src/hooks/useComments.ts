/**
 * useComments Hook
 * Manages token comments and reactions
 *
 * Features:
 * - Fetch comments for a token
 * - Create, edit, delete comments
 * - Add reactions to comments
 * - Real-time updates via polling
 *
 * @example
 * ```typescript
 * const {
 *   comments,
 *   isLoading,
 *   addComment,
 *   addReaction,
 *   deleteComment,
 * } = useComments(tokenAddress);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

// ============ Types ============

export type ReactionType = 'rocket' | 'fire' | 'poop' | 'heart' | 'laugh';

export interface CommentReactions {
  rocket: number;
  fire: number;
  poop: number;
  heart: number;
  laugh: number;
}

export interface Comment {
  id: string;
  tokenAddress: string;
  author: string;
  authorEns?: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  reactions: CommentReactions;
  userReactions?: ReactionType[]; // Reactions by current user
  parentId?: string; // For replies
  replyCount?: number;
  isEdited?: boolean;
  isPinned?: boolean;
}

export interface CommentInput {
  content: string;
  parentId?: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  addComment: (input: CommentInput) => Promise<Comment | null>;
  editComment: (id: string, content: string) => Promise<boolean>;
  deleteComment: (id: string) => Promise<boolean>;
  addReaction: (commentId: string, reaction: ReactionType) => Promise<boolean>;
  removeReaction: (commentId: string, reaction: ReactionType) => Promise<boolean>;

  // Pagination
  loadMore: () => Promise<void>;
  hasMore: boolean;

  // Refresh
  refresh: () => Promise<void>;
}

interface UseCommentsOptions {
  limit?: number;
  pollInterval?: number; // ms, 0 to disable
}

// ============ Local Storage Cache ============

const COMMENTS_STORAGE_PREFIX = 'kaspump_comments_';
const USER_REACTIONS_KEY = 'kaspump_user_reactions';

function getStorageKey(tokenAddress: string): string {
  return `${COMMENTS_STORAGE_PREFIX}${tokenAddress.toLowerCase()}`;
}

function loadCachedComments(tokenAddress: string): Comment[] {
  try {
    const stored = localStorage.getItem(getStorageKey(tokenAddress));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCachedComments(tokenAddress: string, comments: Comment[]): void {
  try {
    localStorage.setItem(getStorageKey(tokenAddress), JSON.stringify(comments));
  } catch {
    // Storage full or disabled
  }
}

function getUserReactions(): Record<string, ReactionType[]> {
  try {
    const stored = localStorage.getItem(USER_REACTIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveUserReaction(commentId: string, reaction: ReactionType, add: boolean): void {
  try {
    const reactions = getUserReactions();
    if (!reactions[commentId]) {
      reactions[commentId] = [];
    }

    if (add && !reactions[commentId].includes(reaction)) {
      reactions[commentId].push(reaction);
    } else if (!add) {
      reactions[commentId] = reactions[commentId].filter(r => r !== reaction);
    }

    localStorage.setItem(USER_REACTIONS_KEY, JSON.stringify(reactions));
  } catch {
    // Storage full or disabled
  }
}

// ============ Hook ============

export function useComments(
  tokenAddress: string | undefined,
  options: UseCommentsOptions = {}
): UseCommentsReturn {
  const { limit = 50, pollInterval = 30000 } = options;
  const { address: userAddress } = useAccount();

  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const pollRef = useRef<NodeJS.Timeout>();

  // Generate unique ID
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async (reset = false) => {
    if (!tokenAddress) return;

    if (reset) {
      setOffset(0);
      setIsLoading(true);
    }

    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      const response = await fetch(
        `/api/comments/${tokenAddress}?limit=${limit}&offset=${currentOffset}`
      );

      if (response.ok) {
        const data = await response.json();
        const fetchedComments = data.comments || [];
        const userReactions = getUserReactions();

        // Annotate with user reactions
        const annotatedComments = fetchedComments.map((c: Comment) => ({
          ...c,
          userReactions: userReactions[c.id] || [],
        }));

        if (reset) {
          setComments(annotatedComments);
        } else {
          setComments(prev => [...prev, ...annotatedComments]);
        }

        setTotalCount(data.total || fetchedComments.length);
        setHasMore(fetchedComments.length === limit);
        setOffset(currentOffset + fetchedComments.length);

        // Cache comments
        saveCachedComments(tokenAddress, annotatedComments);
      } else {
        // Load from cache on error
        const cached = loadCachedComments(tokenAddress);
        if (cached.length > 0) {
          setComments(cached);
          setTotalCount(cached.length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments');

      // Load from cache
      const cached = loadCachedComments(tokenAddress);
      if (cached.length > 0) {
        setComments(cached);
        setTotalCount(cached.length);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, limit, offset]);

  // Initial load and polling
  useEffect(() => {
    fetchComments(true);

    // Set up polling if enabled
    if (pollInterval > 0) {
      pollRef.current = setInterval(() => {
        fetchComments(true);
      }, pollInterval);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [tokenAddress, pollInterval]);

  // Load more comments
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchComments(false);
  }, [hasMore, isLoading, fetchComments]);

  // Add comment
  const addComment = useCallback(async (input: CommentInput): Promise<Comment | null> => {
    if (!tokenAddress || !userAddress || !input.content.trim()) {
      return null;
    }

    const newComment: Comment = {
      id: generateId(),
      tokenAddress: tokenAddress.toLowerCase(),
      author: userAddress.toLowerCase(),
      content: input.content.trim(),
      createdAt: Date.now(),
      reactions: { rocket: 0, fire: 0, poop: 0, heart: 0, laugh: 0 },
      userReactions: [],
      parentId: input.parentId,
      replyCount: 0,
    };

    // Optimistic update
    setComments(prev => [newComment, ...prev]);
    setTotalCount(prev => prev + 1);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          author: userAddress,
          content: input.content.trim(),
          parentId: input.parentId,
        }),
      });

      if (response.ok) {
        const savedComment = await response.json();
        // Update with server response
        setComments(prev =>
          prev.map(c => c.id === newComment.id ? { ...savedComment, userReactions: [] } : c)
        );
        return savedComment;
      } else {
        // Revert on error
        setComments(prev => prev.filter(c => c.id !== newComment.id));
        setTotalCount(prev => prev - 1);
        setError('Failed to post comment');
        return null;
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setComments(prev => prev.filter(c => c.id !== newComment.id));
      setTotalCount(prev => prev - 1);
      setError('Failed to post comment');
      return null;
    }
  }, [tokenAddress, userAddress, generateId]);

  // Edit comment
  const editComment = useCallback(async (id: string, content: string): Promise<boolean> => {
    if (!content.trim()) return false;

    const originalComment = comments.find(c => c.id === id);
    if (!originalComment) return false;

    // Optimistic update
    setComments(prev =>
      prev.map(c => c.id === id
        ? { ...c, content: content.trim(), isEdited: true, updatedAt: Date.now() }
        : c
      )
    );

    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        // Revert on error
        setComments(prev =>
          prev.map(c => c.id === id ? originalComment : c)
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to edit comment:', err);
      setComments(prev =>
        prev.map(c => c.id === id ? originalComment : c)
      );
      return false;
    }
  }, [comments]);

  // Delete comment
  const deleteComment = useCallback(async (id: string): Promise<boolean> => {
    const originalComments = [...comments];

    // Optimistic update
    setComments(prev => prev.filter(c => c.id !== id));
    setTotalCount(prev => prev - 1);

    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on error
        setComments(originalComments);
        setTotalCount(prev => prev + 1);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setComments(originalComments);
      setTotalCount(prev => prev + 1);
      return false;
    }
  }, [comments]);

  // Add reaction
  const addReaction = useCallback(async (
    commentId: string,
    reaction: ReactionType
  ): Promise<boolean> => {
    // Optimistic update
    setComments(prev =>
      prev.map(c => {
        if (c.id !== commentId) return c;
        const userReactions = c.userReactions || [];
        if (userReactions.includes(reaction)) return c;

        return {
          ...c,
          reactions: {
            ...c.reactions,
            [reaction]: c.reactions[reaction] + 1,
          },
          userReactions: [...userReactions, reaction],
        };
      })
    );

    saveUserReaction(commentId, reaction, true);

    try {
      const response = await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction, action: 'add' }),
      });

      return response.ok;
    } catch (err) {
      console.error('Failed to add reaction:', err);
      // Reactions are best-effort, don't revert
      return false;
    }
  }, []);

  // Remove reaction
  const removeReaction = useCallback(async (
    commentId: string,
    reaction: ReactionType
  ): Promise<boolean> => {
    // Optimistic update
    setComments(prev =>
      prev.map(c => {
        if (c.id !== commentId) return c;
        const userReactions = c.userReactions || [];
        if (!userReactions.includes(reaction)) return c;

        return {
          ...c,
          reactions: {
            ...c.reactions,
            [reaction]: Math.max(0, c.reactions[reaction] - 1),
          },
          userReactions: userReactions.filter(r => r !== reaction),
        };
      })
    );

    saveUserReaction(commentId, reaction, false);

    try {
      const response = await fetch(`/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction, action: 'remove' }),
      });

      return response.ok;
    } catch (err) {
      console.error('Failed to remove reaction:', err);
      return false;
    }
  }, []);

  // Refresh
  const refresh = useCallback(async () => {
    await fetchComments(true);
  }, [fetchComments]);

  return {
    comments,
    totalCount,
    isLoading,
    error,
    addComment,
    editComment,
    deleteComment,
    addReaction,
    removeReaction,
    loadMore,
    hasMore,
    refresh,
  };
}

export default useComments;
