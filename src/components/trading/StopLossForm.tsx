'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import StopLossOrderBookABI from '@/abis/StopLossOrderBook.json';

interface StopLossFormProps {
  tokenAddress: string;
  ammAddress: string;
  tokenSymbol: string;
  currentPrice: string;
  userBalance: string;
  orderBookAddress: string;
}

export function StopLossForm({
  tokenAddress,
  ammAddress,
  tokenSymbol,
  currentPrice,
  userBalance,
  orderBookAddress,
}: StopLossFormProps) {
  const { address } = useAccount();
  const [triggerPrice, setTriggerPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('5'); // 5% default

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !triggerPrice || !amount) return;

    try {
      const triggerPriceWei = parseEther(triggerPrice);
      const amountWei = parseEther(amount);

      // Calculate minimum receive with slippage tolerance
      const estimatedReceive =
        (BigInt(amountWei) * BigInt(triggerPriceWei)) / BigInt(10 ** 18);
      const slippageMultiplier = BigInt((100 - parseFloat(slippageTolerance)) * 100);
      const minReceive = (estimatedReceive * slippageMultiplier) / BigInt(10000);

      writeContract({
        address: orderBookAddress as `0x${string}`,
        abi: StopLossOrderBookABI.abi,
        functionName: 'createStopLossOrder',
        args: [tokenAddress, ammAddress, triggerPriceWei, amountWei, minReceive],
      });
    } catch (error) {
      console.error('Error creating stop-loss order:', error);
    }
  };

  const calculateEstimatedReceive = () => {
    if (!triggerPrice || !amount) return '0';
    try {
      const priceNum = parseFloat(triggerPrice);
      const amountNum = parseFloat(amount);
      const slippage = parseFloat(slippageTolerance) / 100;
      return ((priceNum * amountNum) * (1 - slippage)).toFixed(6);
    } catch {
      return '0';
    }
  };

  const getPriceDifference = () => {
    if (!triggerPrice || !currentPrice) return 0;
    const trigger = parseFloat(triggerPrice);
    const current = parseFloat(formatEther(BigInt(currentPrice)));
    return (((trigger - current) / current) * 100).toFixed(2);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Stop-Loss Order</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Price Display */}
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-400">Current Price</div>
          <div className="text-lg font-semibold">
            {formatEther(BigInt(currentPrice || 0))} BNB
          </div>
        </div>

        {/* Trigger Price Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trigger Price (BNB per {tokenSymbol})
          </label>
          <input
            type="number"
            step="0.000001"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            required
          />
          {triggerPrice && currentPrice && (
            <div className="mt-1 text-sm">
              {parseFloat(getPriceDifference()) < 0 ? (
                <span className="text-red-400">
                  {getPriceDifference()}% below current price
                </span>
              ) : (
                <span className="text-yellow-400">
                  Warning: Trigger price is above current price
                </span>
              )}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount ({tokenSymbol})
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
              required
            />
            <button
              type="button"
              onClick={() => setAmount(formatEther(BigInt(userBalance || 0)))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-blue-400 hover:text-blue-300"
            >
              MAX
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-400">
            Balance: {formatEther(BigInt(userBalance || 0))} {tokenSymbol}
          </div>
        </div>

        {/* Slippage Tolerance */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Slippage Tolerance
          </label>
          <div className="flex gap-2">
            {['1', '3', '5', '10'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSlippageTolerance(value)}
                className={`px-3 py-1 rounded text-sm ${
                  slippageTolerance === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              step="0.1"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(e.target.value)}
              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            />
          </div>
        </div>

        {/* Estimated Receive */}
        <div className="bg-gray-700 p-3 rounded">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Minimum Receive</span>
            <span className="text-lg font-semibold">
              {calculateEstimatedReceive()} BNB
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            After {slippageTolerance}% slippage tolerance
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded p-3">
          <div className="flex items-start gap-2">
            <span className="text-yellow-500 text-lg">⚠️</span>
            <div className="text-sm text-yellow-200">
              <strong>Stop-Loss Protection:</strong> Your order will execute
              automatically when price drops to {triggerPrice || '___'} BNB. Tokens
              will be held in escrow until execution or cancellation.
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!address || isConfirming || !triggerPrice || !amount}
          className="w-full py-3 px-4 rounded font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirming
            ? 'Confirming...'
            : isConfirmed
            ? 'Stop-Loss Set!'
            : 'Create Stop-Loss Order'}
        </button>
      </form>

      {/* Info */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>• Tokens will be escrowed in the smart contract</p>
        <p>• Automatic execution when trigger price is reached</p>
        <p>• Platform fee: 0.3% + Executor reward: 0.1%</p>
        <p>• Cancel anytime before execution to reclaim tokens</p>
      </div>
    </div>
  );
}
