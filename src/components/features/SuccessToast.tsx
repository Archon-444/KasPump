'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, ExternalLink, Copy } from 'lucide-react';
import { cn, copyToClipboard, truncateAddress } from '../../utils';

export interface SuccessToastProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  txHash?: string;
  explorerUrl?: string;
  duration?: number;
  onAction?: () => void;
  actionLabel?: string;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  isOpen,
  onClose,
  title,
  message,
  txHash,
  explorerUrl,
  duration = 5000,
  onAction,
  actionLabel = 'View',
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  const handleCopyTxHash = async () => {
    if (txHash) {
      await copyToClipboard(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-4 right-4 z-50 max-w-md"
        >
          <div className="bg-gray-900 border border-green-500/30 rounded-lg shadow-2xl p-4 backdrop-blur-sm">
            {/* Success Icon & Title */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-400" size={24} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-white mb-1">{title}</h4>
                {message && (
                  <p className="text-sm text-gray-300 mb-2">{message}</p>
                )}

                {/* Transaction Hash */}
                {txHash && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-gray-800/50 rounded text-xs">
                    <code className="text-gray-300 font-mono truncate flex-1">
                      {truncateAddress(txHash, 8, 6)}
                    </code>
                    <button
                      onClick={handleCopyTxHash}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="Copy transaction hash"
                    >
                      {copied ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-gray-400 hover:text-white" />
                      )}
                    </button>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="View on explorer"
                      >
                        <ExternalLink size={14} className="text-gray-400 hover:text-yellow-400" />
                      </a>
                    )}
                  </div>
                )}

                {/* Action Button */}
                {onAction && (
                  <button
                    onClick={() => {
                      onAction();
                      onClose();
                    }}
                    className="mt-2 text-sm text-yellow-400 hover:text-yellow-300 font-medium"
                  >
                    {actionLabel} →
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

