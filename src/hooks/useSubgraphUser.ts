/**
 * useSubgraphUser Hook
 * Fetch user data from The Graph subgraph
 */

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { querySubgraph } from '../lib/graphql/client'
import {
  GET_USER,
  GET_USER_WITH_HOLDINGS,
  GET_USER_TRADES,
  GET_USER_CREATED_TOKENS,
} from '../lib/graphql/queries'
import { SubgraphToken, SubgraphTrade } from './useSubgraphTokens'

export interface SubgraphUser {
  id: string
  address: string
  tokensCreated: string
  tokensGraduated: string
  tradeCount: string
  buyCount: string
  sellCount: string
  volumeNative: string
  totalSpent: string
  totalReceived: string
  realizedPnL: string
  firstSeenAt: string
  lastSeenAt: string
}

export interface SubgraphTokenHolder {
  id: string
  token: {
    id: string
    name: string
    symbol: string
    currentPrice: string
  }
  balance: string
  totalBought: string
  totalSold: string
  totalSpent: string
  totalReceived: string
  realizedPnL: string
  unrealizedPnL: string
  avgBuyPrice: string
  avgSellPrice: string
  firstBoughtAt: string
  lastBoughtAt?: string
}

/**
 * Fetch user data by address
 */
export function useSubgraphUser(userAddress: string | undefined, chainId: number = 97) {
  const [user, setUser] = useState<SubgraphUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userAddress) {
      setLoading(false)
      setUser(null)
      return
    }

    const fetchUser = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ user: SubgraphUser }>(
          GET_USER,
          {
            id: userAddress.toLowerCase(),
          },
          chainId
        )

        setUser(result.user || null)
      } catch (err) {
        console.error('Error fetching user:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [userAddress, chainId])

  return { user, loading, error }
}

/**
 * Fetch user with token holdings
 */
export function useSubgraphUserWithHoldings(
  userAddress: string | undefined,
  chainId: number = 97
) {
  const [data, setData] = useState<{
    user: SubgraphUser | null
    holdings: SubgraphTokenHolder[]
  }>({
    user: null,
    holdings: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userAddress) {
      setLoading(false)
      setData({ user: null, holdings: [] })
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{
          user: SubgraphUser & { holdings: SubgraphTokenHolder[] }
        }>(
          GET_USER_WITH_HOLDINGS,
          {
            id: userAddress.toLowerCase(),
          },
          chainId
        )

        setData({
          user: result.user || null,
          holdings: result.user?.holdings || [],
        })
      } catch (err) {
        console.error('Error fetching user with holdings:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setData({ user: null, holdings: [] })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userAddress, chainId])

  return { ...data, loading, error }
}

/**
 * Fetch user's trading history
 */
export function useSubgraphUserTrades(
  userAddress: string | undefined,
  first: number = 50,
  skip: number = 0,
  chainId: number = 97
) {
  const [trades, setTrades] = useState<SubgraphTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userAddress) {
      setLoading(false)
      setTrades([])
      return
    }

    const fetchTrades = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ trades: SubgraphTrade[] }>(
          GET_USER_TRADES,
          {
            userId: userAddress.toLowerCase(),
            first,
            skip,
          },
          chainId
        )

        setTrades(result.trades || [])
      } catch (err) {
        console.error('Error fetching user trades:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setTrades([])
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [userAddress, first, skip, chainId])

  return { trades, loading, error }
}

/**
 * Fetch tokens created by user
 */
export function useSubgraphUserCreatedTokens(
  userAddress: string | undefined,
  chainId: number = 97
) {
  const [tokens, setTokens] = useState<SubgraphToken[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userAddress) {
      setLoading(false)
      setTokens([])
      return
    }

    const fetchTokens = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{
          user: { createdTokens: SubgraphToken[] }
        }>(
          GET_USER_CREATED_TOKENS,
          {
            userId: userAddress.toLowerCase(),
          },
          chainId
        )

        setTokens(result.user?.createdTokens || [])
      } catch (err) {
        console.error('Error fetching user created tokens:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setTokens([])
      } finally {
        setLoading(false)
      }
    }

    fetchTokens()
  }, [userAddress, chainId])

  return { tokens, loading, error }
}

/**
 * Fetch current connected wallet's data
 */
export function useSubgraphCurrentUser(chainId: number = 97) {
  const { address } = useAccount()
  return useSubgraphUserWithHoldings(address, chainId)
}
