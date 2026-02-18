/**
 * TokenComments Component
 * Displays and manages comments for a token
 *
 * Features:
 * - Comment thread display
 * - Add/edit/delete comments
 * - Reactions with emoji picker
 * - Reply threads
 * - Load more pagination
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  MoreHorizontal,
  Trash2,
  Edit2,
  Flag,
  Rocket,
  Flame,
  Heart,
  Laugh,
  ThumbsDown,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useComments, Comment, ReactionType } from '../../hooks/useComments';
import { cn, formatTimeAgo } from '../../utils';

// ============ Types ============

interface TokenCommentsProps {
  tokenAddress: string;
  className?: string;
}

interface CommentItemProps {
  comment: Comment;
  onReact: (commentId: string, reaction: ReactionType) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onReply: (commentId: string) => void;
  currentUser?: string;
}

// ============ Reaction Config ============

const REACTIONS: { type: ReactionType; icon: React.ReactNode; label: string }[] = [
  { type: 'rocket', icon: <Rocket className="w-4 h-4" />, label: 'Rocket' },
  { type: 'fire', icon: <Flame className="w-4 h-4" />, label: 'Fire' },
  { type: 'heart', icon: <Heart className="w-4 h-4" />, label: 'Love' },
  { type: 'laugh', icon: <Laugh className="w-4 h-4" />, label: 'Haha' },
  { type: 'poop', icon: <ThumbsDown className="w-4 h-4" />, label: 'Dislike' },
];

// ============ Comment Item Component ============

function CommentItem({
  comment,
  onReact,
  onDelete,
  onEdit,
  onReply,
  currentUser,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUser?.toLowerCase() === comment.author.toLowerCase();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowReactions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReaction = (reaction: ReactionType) => {
    onReact(comment.id, reaction);
    setShowReactions(false);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent);
    }
    setIsEditing(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const totalReactions = Object.values(comment.reactions).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
          {comment.author.slice(2, 4).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white text-sm">
              {comment.authorEns || formatAddress(comment.author)}
            </span>
            <span className="text-gray-500 text-xs">
              {formatTimeAgo(new Date(comment.createdAt))}
            </span>
            {comment.isEdited && (
              <span className="text-gray-600 text-xs">(edited)</span>
            )}
          </div>

          {/* Body */}
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-sm hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-gray-300 text-sm break-words">{comment.content}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {/* Reaction summary */}
            {totalReactions > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full">
                {REACTIONS.filter(r => comment.reactions[r.type] > 0)
                  .slice(0, 3)
                  .map(r => (
                    <span key={r.type} className="text-xs">
                      {r.icon}
                    </span>
                  ))}
                <span className="text-xs text-gray-400 ml-1">{totalReactions}</span>
              </div>
            )}

            {/* React button */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowReactions(!showReactions)}
                className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1 transition-colors"
              >
                <Heart className="w-3.5 h-3.5" />
                React
              </button>

              <AnimatePresence>
                {showReactions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    className="absolute bottom-full left-0 mb-2 flex gap-1 p-1.5 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-10"
                  >
                    {REACTIONS.map(r => {
                      const hasReacted = comment.userReactions?.includes(r.type);
                      return (
                        <button
                          key={r.type}
                          onClick={() => handleReaction(r.type)}
                          className={cn(
                            'p-1.5 rounded-lg transition-all hover:scale-110',
                            hasReacted
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'hover:bg-white/10 text-gray-400'
                          )}
                          title={r.label}
                        >
                          {r.icon}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reply button */}
            <button
              onClick={() => onReply(comment.id)}
              className="text-gray-500 hover:text-gray-300 text-xs flex items-center gap-1 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Reply
            </button>

            {/* More menu */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-600 hover:text-gray-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-32 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10"
                  >
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            onDelete(comment.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-2"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Report
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============ Main Component ============

export function TokenComments({ tokenAddress, className }: TokenCommentsProps) {
  const { address: userAddress, isConnected } = useAccount();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useComments(tokenAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isConnected) return;

    const result = await addComment({
      content: newComment.trim(),
      parentId: replyingTo ?? undefined,
    });

    if (result) {
      setNewComment('');
      setReplyingTo(null);
    }
  };

  const handleReact = (commentId: string, reaction: ReactionType) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    if (comment.userReactions?.includes(reaction)) {
      removeReaction(commentId, reaction);
    } else {
      addReaction(commentId, reaction);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-400" />
          Comments
          {totalCount > 0 && (
            <span className="text-sm font-normal text-gray-400">({totalCount})</span>
          )}
        </h3>
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {replyingTo && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Replying to comment</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-red-400 hover:text-red-300"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={isConnected ? "Add a comment..." : "Connect wallet to comment"}
            disabled={!isConnected}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || !isConnected}
            className="px-4 py-3 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading && comments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReact={handleReact}
                onDelete={deleteComment}
                onEdit={editComment}
                onReply={handleReply}
                currentUser={userAddress}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="w-full py-2 text-center text-purple-400 hover:text-purple-300 text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Load more comments
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TokenComments;
