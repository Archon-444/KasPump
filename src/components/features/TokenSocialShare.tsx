'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Twitter, Copy, Share2, ExternalLink, Check } from 'lucide-react';
import { KasPumpToken } from '../../types';
import { Button } from '../ui';
import { cn, truncateAddress, copyToClipboard } from '../../utils';
import { getExplorerUrl } from '../../config/chains';

export interface TokenSocialShareProps {
  token: KasPumpToken;
  chainId?: number;
  className?: string;
}

export const TokenSocialShare: React.FC<TokenSocialShareProps> = ({
  token,
  chainId,
  className
}) => {
  const [copied, setCopied] = React.useState(false);

  const tokenUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/tokens/${token.address}${chainId ? `?chain=${chainId}` : ''}`
    : '';
  
  const explorerUrl = chainId ? getExplorerUrl(chainId, 'address', token.address) : null;

  const shareText = `Check out ${token.name} ($${token.symbol}) on KasPump! 🚀\n\nPrice: $${token.price.toFixed(6)}\nMarket Cap: $${(token.marketCap / 1000).toFixed(0)}K\n\n${tokenUrl}`;

  const handleCopy = async () => {
    await copyToClipboard(tokenUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const canUseNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: `${token.name} on KasPump`,
          text: shareText,
          url: tokenUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="text-sm font-medium text-gray-300 mb-3">Share Token</div>
      
      <div className="flex flex-wrap gap-2">
        {/* Twitter Share */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleTwitterShare}
          className="flex items-center space-x-2 px-4 py-2 bg-[#1DA1F2]/15 hover:bg-[#1DA1F2]/25 text-[#1DA1F2] border border-[#1DA1F2]/20 rounded-xl text-sm font-medium transition-all duration-200"
        >
          <Twitter size={16} />
          <span>Twitter</span>
        </motion.button>

        {/* Native Share (Mobile) */}
        {canUseNativeShare && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNativeShare}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/20 rounded-xl text-sm font-medium transition-all duration-200"
          >
            <Share2 size={16} />
            <span>Share</span>
          </motion.button>
        )}

        {/* Copy Link */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className={cn(
            'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            copied
              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
          )}
        >
          {copied ? (
            <>
              <Check size={16} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>Copy Link</span>
            </>
          )}
        </motion.button>

        {/* Explorer Link */}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 rounded-xl text-sm font-medium transition-all duration-200"
          >
            <ExternalLink size={16} />
            <span>Explorer</span>
          </a>
        )}
      </div>

      {/* Token Address */}
      <div className="pt-3 border-t border-white/5">
        <div className="text-xs text-gray-400 mb-1">Contract Address</div>
        <div className="flex items-center space-x-2">
          <code className="text-xs text-gray-300 font-mono bg-white/[0.02] border border-white/5 px-2 py-1 rounded-lg">
            {truncateAddress(token.address, 8, 6)}
          </code>
          <button
            onClick={() => copyToClipboard(token.address)}
            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
            title="Copy address"
          >
            <Copy size={12} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
