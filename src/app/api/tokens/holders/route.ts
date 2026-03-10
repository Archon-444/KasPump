import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BlockchainService } from '@/services/blockchain';

export const dynamic = 'force-dynamic';

const ERC20_TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('address');
    const chainIdParam = searchParams.get('chainId');
    const limitParam = searchParams.get('limit');

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json({ error: 'Valid token address required' }, { status: 400 });
    }

    const chainId = BlockchainService.resolveChainId(chainIdParam ? parseInt(chainIdParam) : undefined);
    const limit = Math.min(parseInt(limitParam || '20'), 50);

    const factory = BlockchainService.getTokenFactory(chainId);
    const provider = factory.runner?.provider;
    if (!provider) {
      return NextResponse.json({ holders: [] });
    }

    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)',
        'event Transfer(address indexed from, address indexed to, uint256 value)',
      ],
      provider
    );

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 50000);

    const transferFilter = {
      address: tokenAddress,
      topics: [ERC20_TRANSFER_TOPIC],
      fromBlock,
      toBlock: currentBlock,
    };

    const logs = await provider.getLogs(transferFilter).catch(() => []);

    const addresses = new Set<string>();
    for (const log of logs) {
      if (log.topics.length >= 3) {
        const to = ethers.getAddress('0x' + log.topics[2].slice(26));
        if (to !== ethers.ZeroAddress) {
          addresses.add(to);
        }
      }
    }

    let totalSupply: bigint;
    try {
      totalSupply = await tokenContract.totalSupply();
    } catch {
      totalSupply = 0n;
    }

    const addressList = Array.from(addresses).slice(0, limit * 2);
    const balances = await Promise.all(
      addressList.map(async (addr) => {
        try {
          const bal: bigint = await tokenContract.balanceOf(addr);
          return { address: addr, balance: bal };
        } catch {
          return { address: addr, balance: 0n };
        }
      })
    );

    const totalSupplyNum = parseFloat(ethers.formatEther(totalSupply));

    const holders = balances
      .filter(h => h.balance > 0n)
      .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0))
      .slice(0, limit)
      .map(h => {
        const balanceNum = parseFloat(ethers.formatEther(h.balance));
        return {
          address: h.address,
          balance: balanceNum.toString(),
          percentage: totalSupplyNum > 0 ? (balanceNum / totalSupplyNum) * 100 : 0,
        };
      });

    return NextResponse.json({ holders, totalHolders: addresses.size });
  } catch (error: any) {
    console.error('Holders API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holders', details: error.message },
      { status: 500 }
    );
  }
}
