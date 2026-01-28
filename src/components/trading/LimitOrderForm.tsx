'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import LimitOrderBookABI from '@/abis/LimitOrderBook.json';

interface LimitOrderFormProps {
  tokenAddress: string;
  tokenSymbol: string;
  currentPrice: string;
  orderBookAddress: string;
}

export function LimitOrderForm({
  tokenAddress,
  tokenSymbol,
  currentPrice,
  orderBookAddress,
}: LimitOrderFormProps) {
  const { address } = useAccount();
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !price || !amount) return;

    try {
      const priceWei = parseEther(price);
      const amountWei = parseEther(amount);

      if (orderType === 'buy') {
        const totalCost = (BigInt(priceWei) * BigInt(amountWei)) / BigInt(10 ** 18);

        writeContract({
          address: orderBookAddress as `0x${string}`,
          abi: LimitOrderBookABI.abi,
          functionName: 'createBuyOrder',
          args: [tokenAddress, priceWei, amountWei],
          value: totalCost,
        });
      } else {
        // For sell orders, user needs to approve tokens first
        writeContract({
          address: orderBookAddress as `0x${string}`,
          abi: LimitOrderBookABI.abi,
          functionName: 'createSellOrder',
          args: [tokenAddress, priceWei, amountWei],
        });
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const calculateTotal = () => {
    if (!price || !amount) return '0';
    try {
      const priceNum = parseFloat(price);
      const amountNum = parseFloat(amount);
      return (priceNum * amountNum).toFixed(6);
    } catch {
      return '0';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Limit Order</h3>

      {/* Order Type Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOrderType('buy')}
          className={`flex-1 py-2 px-4 rounded ${
            orderType === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setOrderType('sell')}
          className={`flex-1 py-2 px-4 rounded ${
            orderType === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Sell
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Price Display */}
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-sm text-gray-400">Current Price</div>
          <div className="text-lg font-semibold">
            {formatEther(BigInt(currentPrice || 0))} BNB
          </div>
        </div>

        {/* Price Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Limit Price (BNB per {tokenSymbol})
          </label>
          <input
            type="number"
            step="0.000001"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            required
          />
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount ({tokenSymbol})
          </label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
            required
          />
        </div>

        {/* Total Display */}
        <div className="bg-gray-700 p-3 rounded">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Total</span>
            <span className="text-lg font-semibold">{calculateTotal()} BNB</span>
          </div>
        </div>

        {/* Price Difference */}
        {price && currentPrice && (
          <div className="text-sm text-gray-400">
            {orderType === 'buy' ? 'Buy' : 'Sell'} when price{' '}
            {parseFloat(price) < parseFloat(formatEther(BigInt(currentPrice)))
              ? 'drops'
              : 'rises'}{' '}
            to {price} BNB
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!address || isConfirming || !price || !amount}
          className={`w-full py-3 px-4 rounded font-semibold ${
            orderType === 'buy'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isConfirming
            ? 'Confirming...'
            : isConfirmed
            ? 'Order Placed!'
            : `Place ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`}
        </button>
      </form>

      {/* Info */}
      <div className="mt-4 text-xs text-gray-400">
        <p>• Orders execute automatically when price reaches your limit</p>
        <p>• Platform fee: 0.3%</p>
        <p>• You can cancel anytime before execution</p>
      </div>
    </div>
  );
}
