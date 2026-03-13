'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Loader, Crown, Clock } from 'lucide-react';
import { Card } from '../ui';
import { useMultichainWallet } from '../../hooks/useMultichainWallet';
import { cn, truncateAddress, formatTimeAgo } from '../../utils';

interface Comment {
  id: string;
  tokenAddress: string;
  walletAddress: string;
  text: string;
  timestamp: number;
  likes: number;
  isCreator?: boolean;
}

export interface TokenCommentThreadProps {
  tokenAddress: string;
  creatorAddress?: string;
  className?: string;
}

export const TokenCommentThread: React.FC<TokenCommentThreadProps> = ({
  tokenAddress,
  creatorAddress,
  className,
}) => {
  const wallet = useMultichainWallet();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tokens/comments?address=${tokenAddress}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // Silently fail on poll
    } finally {
      setLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchComments();
    pollRef.current = setInterval(fetchComments, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchComments]);

  const handlePost = async () => {
    if (!newComment.trim() || !wallet.address || posting) return;

    setPosting(true);
    setError(null);

    try {
      let signature: string | undefined;
      try {
        const message = `Post comment on ${tokenAddress}: ${newComment.trim().slice(0, 100)}`;
        if (wallet.signer) {
          signature = await wallet.signer.signMessage(message);
        }
      } catch {
        // Signature optional — proceed without
      }

      const isCreator = creatorAddress?.toLowerCase() === wallet.address.toLowerCase();

      const res = await fetch('/api/tokens/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          walletAddress: wallet.address,
          text: newComment.trim(),
          signature,
          isCreator,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post');
      }

      const { comment } = await res.json();
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <Card className={cn('glassmorphism p-5', className)}>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="text-yellow-400" size={18} />
        <h3 className="text-base font-semibold text-white">Thread</h3>
        <span className="text-xs text-gray-500 tabular-nums">{comments.length}</span>
      </div>

      {/* Comment Input */}
      {wallet.address ? (
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {wallet.address.slice(2, 4).toUpperCase()}
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                onKeyDown={handleKeyDown}
                placeholder="Post a comment..."
                rows={2}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/40 focus:ring-1 focus:ring-yellow-500/20 resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className={cn(
                  'text-[10px] tabular-nums',
                  newComment.length > 450 ? 'text-red-400' : 'text-gray-600'
                )}>
                  {newComment.length}/500
                </span>
                <button
                  onClick={handlePost}
                  disabled={!newComment.trim() || posting}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                    newComment.trim()
                      ? 'bg-yellow-500 text-white hover:bg-yellow-400 active:scale-95'
                      : 'bg-white/[0.04] text-gray-600 cursor-not-allowed'
                  )}
                >
                  {posting ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
                  Post
                </button>
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-400 mt-1 ml-10">{error}</p>}
        </div>
      ) : (
        <div className="mb-4 p-3 bg-white/[0.02] rounded-xl text-center">
          <p className="text-xs text-gray-500">Connect wallet to comment</p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 bg-gray-700/50 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-700/50 rounded w-24" />
                <div className="h-3 bg-gray-700/50 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <MessageCircle size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {comments.map((comment, i) => {
              const isCreator = comment.isCreator ||
                (creatorAddress && comment.walletAddress.toLowerCase() === creatorAddress.toLowerCase());

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i < 5 ? i * 0.03 : 0 }}
                  className="flex gap-2"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isCreator
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                      : 'bg-white/[0.06] text-gray-400'
                  )}>
                    {comment.walletAddress.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium text-gray-300 font-mono">
                        {truncateAddress(comment.walletAddress, 4, 4)}
                      </span>
                      {isCreator && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded">
                          <Crown size={8} />
                          Creator
                        </span>
                      )}
                      <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                        <Clock size={8} />
                        {formatTimeAgo(new Date(comment.timestamp))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 break-words whitespace-pre-wrap leading-relaxed">
                      {comment.text}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
};
