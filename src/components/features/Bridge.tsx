/**
 * Cross-Chain Bridge Components
 * Bridge tokens between BSC, Arbitrum, and Base
 *
 * Features:
 * - Chain selector with visual indicators
 * - Amount input with fee calculation
 * - Transfer status tracking
 * - Transaction history
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Loader2,
  Info,
  History,
  Zap,
} from 'lucide-react';
import {
  useBridge,
  useChainSwitch,
  SupportedChain,
  BridgeTransfer,
  BridgeQuote,
} from '../../hooks/useBridge';

// ============ Types ============

interface BridgeProps {
  defaultToken?: string;
  className?: string;
}

interface ChainSelectorProps {
  chains: SupportedChain[];
  selected: SupportedChain | null;
  onSelect: (chain: SupportedChain) => void;
  label: string;
  disabled?: boolean;
  excludeChainId?: number;
}

interface TransferCardProps {
  transfer: BridgeTransfer;
  chains: SupportedChain[];
  onRefund?: () => void;
}

// ============ Sub-Components ============

/**
 * Chain Selector Dropdown
 */
function ChainSelector({
  chains,
  selected,
  onSelect,
  label,
  disabled = false,
  excludeChainId,
}: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredChains = chains.filter(c => c.id !== excludeChainId);

  return (
    <div className="relative">
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3 p-3 rounded-xl
          bg-white/5 border border-white/10 transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:border-white/20'}
        `}
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <span className="text-xl">{selected.icon}</span>
            <span className="text-white font-medium">{selected.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">Select chain</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 top-full mt-2 w-full rounded-xl bg-gray-900 border border-white/10 shadow-xl overflow-hidden"
          >
            {filteredChains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onSelect(chain);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors
                  ${selected?.id === chain.id ? 'bg-white/10' : ''}
                `}
              >
                <span className="text-xl">{chain.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">{chain.name}</div>
                  <div className="text-xs text-gray-400">
                    Fee: {chain.bridgeFee / 100}% • ~{chain.estimatedTime}min
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Transfer Status Card
 */
function TransferCard({ transfer, chains, onRefund }: TransferCardProps) {
  const sourceChain = chains.find(c => c.id === transfer.sourceChainId);
  const destChain = chains.find(c => c.id === transfer.destChainId);

  const getStatusIcon = () => {
    switch (transfer.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'refunded':
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (transfer.status) {
      case 'pending':
        return 'Waiting for confirmation';
      case 'processing':
        return 'Processing on destination chain';
      case 'completed':
        return 'Transfer completed';
      case 'refunded':
        return 'Refunded to sender';
      case 'expired':
        return 'Transfer expired';
      default:
        return 'Unknown status';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-white/[0.03] border border-white/5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm text-gray-300">{getStatusText()}</span>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(transfer.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{sourceChain?.icon}</span>
          <span className="text-sm text-white">{sourceChain?.name}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-500" />
        <div className="flex items-center gap-2">
          <span className="text-lg">{destChain?.icon}</span>
          <span className="text-sm text-white">{destChain?.name}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Amount</span>
        <span className="text-white font-medium">
          {transfer.amount.toLocaleString()} {transfer.tokenSymbol}
        </span>
      </div>

      {/* Actions */}
      {transfer.status === 'expired' && onRefund && (
        <button
          onClick={onRefund}
          className="mt-3 w-full py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
        >
          Request Refund
        </button>
      )}

      {/* Tx Links */}
      {transfer.txHash && (
        <div className="mt-3 pt-3 border-t border-white/5 flex gap-3">
          <a
            href={`https://bscscan.com/tx/${transfer.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Source TX <ExternalLink className="w-3 h-3" />
          </a>
          {transfer.completionTxHash && (
            <a
              href={`https://arbiscan.io/tx/${transfer.completionTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Dest TX <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============ Main Component ============

export function Bridge({ defaultToken, className = '' }: BridgeProps) {
  const {
    supportedChains,
    currentChain,
    bridge,
    getBridgeQuote,
    refund,
    transfers,
    pendingTransfers,
    isBridging,
    error,
  } = useBridge();

  const { switchChain, isSwitching } = useChainSwitch();

  const [destChain, setDestChain] = useState<SupportedChain | null>(null);
  const [amount, setAmount] = useState('');
  const [token] = useState(defaultToken || '');
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-select first available destination chain
  useEffect(() => {
    if (!destChain && currentChain) {
      const available = supportedChains.find(c => c.id !== currentChain.id);
      if (available) setDestChain(available);
    }
  }, [currentChain, destChain, supportedChains]);

  // Get quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || !destChain || parseFloat(amount) <= 0) {
        setQuote(null);
        return;
      }

      try {
        const q = await getBridgeQuote(parseFloat(amount), destChain.id, token);
        setQuote(q);
      } catch (err) {
        console.error('Failed to get quote:', err);
        setQuote(null);
      }
    };

    const debounce = setTimeout(fetchQuote, 300);
    return () => clearTimeout(debounce);
  }, [amount, destChain, token, getBridgeQuote]);

  // Handle bridge
  const handleBridge = async () => {
    if (!destChain || !amount || parseFloat(amount) <= 0) return;

    try {
      await bridge({
        token,
        amount: parseFloat(amount),
        destChainId: destChain.id,
      });
      setAmount('');
      setQuote(null);
    } catch (err) {
      console.error('Bridge failed:', err);
    }
  };

  // Swap chains
  const handleSwapChains = () => {
    if (!destChain || !currentChain) return;
    const newDest = currentChain;
    switchChain(destChain.id);
    setDestChain(newDest);
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/20">
            <ArrowRightLeft className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cross-Chain Bridge</h2>
            <p className="text-xs text-gray-400">Transfer tokens between chains</p>
          </div>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`
            p-2 rounded-lg transition-colors
            ${showHistory ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400'}
          `}
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Pending Transfers Banner */}
      {pendingTransfers.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
          <div>
            <div className="text-sm text-yellow-400 font-medium">
              {pendingTransfers.length} transfer{pendingTransfers.length > 1 ? 's' : ''} in progress
            </div>
            <div className="text-xs text-yellow-400/70">
              Estimated completion in ~{pendingTransfers[0]?.sourceChainId ? '10' : '5'} minutes
            </div>
          </div>
        </div>
      )}

      {showHistory ? (
        // Transfer History
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Transfer History</h3>
            <span className="text-xs text-gray-500">{transfers.length} transfers</span>
          </div>

          {transfers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No transfers yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transfers.map((transfer) => (
                <TransferCard
                  key={transfer.id}
                  transfer={transfer}
                  chains={supportedChains}
                  {...(transfer.status === 'expired' && { onRefund: () => refund(transfer.id) })}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Bridge Form
        <div className="space-y-4">
          {/* Chain Selection */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
            <ChainSelector
              chains={supportedChains}
              selected={currentChain}
              onSelect={(chain) => switchChain(chain.id)}
              label="From"
              disabled={isSwitching}
            />

            <button
              onClick={handleSwapChains}
              disabled={!currentChain || !destChain || isSwitching}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50 mb-1"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>

            <ChainSelector
              chains={supportedChains}
              selected={destChain}
              onSelect={setDestChain}
              label="To"
              {...(currentChain?.id !== undefined && { excludeChainId: currentChain.id })}
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-lg font-medium placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="text-gray-400 text-sm">TOKEN</span>
              </div>
            </div>

            {destChain && (
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>Min: {destChain.minBridge}</span>
                <span>Max: {destChain.maxBridge.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Quote */}
          {quote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">You will receive</span>
                <span className="text-white font-medium">
                  ~{quote.outputAmount.toLocaleString()} TOKEN
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Bridge fee</span>
                <span className="text-gray-300">
                  {quote.fee.toFixed(4)} ({quote.feePercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>Estimated time</span>
                </div>
                <span className="text-gray-300">~{quote.estimatedTime} minutes</span>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Bridge Button */}
          <button
            onClick={handleBridge}
            disabled={!currentChain || !destChain || !amount || parseFloat(amount) <= 0 || isBridging}
            className={`
              w-full py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
              ${isBridging
                ? 'bg-purple-500/50 text-white/70 cursor-wait'
                : 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
              }
            `}
          >
            {isBridging ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Bridging...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Bridge Tokens
              </>
            )}
          </button>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Bridge transfers are processed by decentralized relayers. Most transfers complete
              within 5-10 minutes. Expired transfers can be refunded after 24 hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * BridgeWidget - Compact bridge widget for sidebars
 */
export function BridgeWidget({ className = '' }: { className?: string }) {
  const { pendingTransfers, supportedChains } = useBridge();

  return (
    <div className={`p-4 rounded-xl bg-white/[0.02] border border-white/5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <ArrowRightLeft className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-white">Cross-Chain Bridge</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {supportedChains.map((chain) => (
          <div
            key={chain.id}
            className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/5"
          >
            <span className="text-lg">{chain.icon}</span>
            <span className="text-[10px] text-gray-400">{chain.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {pendingTransfers.length > 0 && (
        <div className="text-xs text-yellow-400 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          {pendingTransfers.length} pending
        </div>
      )}
    </div>
  );
}

export default Bridge;
