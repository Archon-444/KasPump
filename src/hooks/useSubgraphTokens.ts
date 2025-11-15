/**
 * useSubgraphTokens Hook
 * Fetch token data from The Graph subgraph
 */

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { querySubgraph } from '../lib/graphql/client'
import {
  GET_TOKENS,
  GET_TOKEN_BY_ADDRESS,
  GET_TOKEN_WITH_TRADES,
  GET_TRENDING_TOKENS,
  GET_NEWLY_CREATED,
  GET_RECENTLY_GRADUATED,
} from '../lib/graphql/queries'

export interface SubgraphToken {
  id: string
  address: string
  name: string
  symbol: string
  description?: string
  imageUrl?: string
  totalSupply: string
  currentSupply: string
  basePrice: string
  slope: string
  curveType: 'LINEAR' | 'EXPONENTIAL'
  currentPrice: string
  creator: {
    id: string
    address: string
  }
  createdAt: string
  isGraduated: boolean
  graduatedAt?: string
  ammAddress: string
  tradeCount: string
  buyCount: string
  sellCount: string
  volumeNative: string
  volumeNative24h: string
  holderCount: string
  priceChange1h: string
  priceChange24h: string
  priceChange7d: string
  marketCap: string
  chainId: string
  lastTradeAt?: string
}

export interface SubgraphTrade {
  id: string
  user: {
    id: string
    address: string
  }
  type: 'BUY' | 'SELL'
  nativeAmount: string
  tokenAmount: string
  price: string
  platformFee: string
  timestamp: string
  txHash: string
}

interface UseTokensOptions {
  first?: number
  skip?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  where?: any
  chainId?: number
  enabled?: boolean
}

/**
 * Fetch multiple tokens with pagination and filtering
 */
export function useSubgraphTokens(options: UseTokensOptions = {}) {
  const {
    first = 20,
    skip = 0,
    orderBy = 'createdAt',
    orderDirection = 'desc',
    where,
    chainId = 97,
    enabled = true,
  } = options

  const [tokens, setTokens] = useState<SubgraphToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const fetchTokens = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ tokens: SubgraphToken[] }>(
          GET_TOKENS,
          {
            first,
            skip,
            orderBy,
            orderDirection,
            where,
          },
          chainId
        )

        setTokens(result.tokens || [])
      } catch (err) {
        console.error('Error fetching tokens:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setTokens([])
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [first, skip, orderBy, orderDirection, JSON.stringify(where), chainId, enabled])

  return { tokens, loading, error, refetch: () => {} }
}

/**
 * Fetch a single token by address
 */
export function useSubgraphToken(tokenAddress: string | undefined, chainId: number = 97) {
  const [token, setToken] = useState<SubgraphToken | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!tokenAddress) {
      setLoading(false)
      return
    }

    const fetchToken = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ token: SubgraphToken }>(
          GET_TOKEN_BY_ADDRESS,
          {
            id: tokenAddress.toLowerCase(),
          },
          chainId
        )

        setToken(result.token || null)
      } catch (err) {
        console.error('Error fetching token:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    fetchToken()
  }, [tokenAddress, chainId])

  return { token, loading, error }
}

/**
 * Fetch token with recent trades
 */
export function useSubgraphTokenWithTrades(
  tokenAddress: string | undefined,
  tradesFirst: number = 50,
  chainId: number = 97
) {
  const [data, setData] = useState<{
    token: SubgraphToken | null
    trades: SubgraphTrade[]
  }>({
    token: null,
    trades: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!tokenAddress) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{
          token: SubgraphToken & { trades: SubgraphTrade[] }
        }>(
          GET_TOKEN_WITH_TRADES,
          {
            id: tokenAddress.toLowerCase(),
            tradesFirst,
          },
          chainId
        )

        setData({
          token: result.token || null,
          trades: result.token?.trades || [],
        })
      } catch (err) {
        console.error('Error fetching token with trades:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setData({ token: null, trades: [] })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tokenAddress, tradesFirst, chainId])

  return { ...data, loading, error }
}

/**
 * Fetch trending tokens (by 24h volume)
 */
export function useSubgraphTrendingTokens(first: number = 10, chainId: number = 97) {
  return useSubgraphTokens({
    first,
    orderBy: 'volumeNative24h',
    orderDirection: 'desc',
    where: { isGraduated: false },
    chainId,
  })
}

/**
 * Fetch newly created tokens
 */
export function useSubgraphNewTokens(first: number = 10, chainId: number = 97) {
  const [tokens, setTokens] = useState<SubgraphToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchTokens = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ tokens: SubgraphToken[] }>(
          GET_NEWLY_CREATED,
          { first },
          chainId
        )

        setTokens(result.tokens || [])
      } catch (err) {
        console.error('Error fetching new tokens:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setTokens([])
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [first, chainId])

  return { tokens, loading, error }
}

/**
 * Fetch recently graduated tokens
 */
export function useSubgraphGraduatedTokens(first: number = 10, chainId: number = 97) {
  const [tokens, setTokens] = useState<SubgraphToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchTokens = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ tokens: SubgraphToken[]  }>(
          GET_RECENTLY_GRADUATED,
          { first },
          chainId
        )

        setTokens(result.tokens || [])
      } catch (err) {
        console.error('Error fetching graduated tokens:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setTokens([])
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [first, chainId])

  return { tokens, loading, error }
}
