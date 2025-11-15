/**
 * useSubgraphPlatform Hook
 * Fetch platform-wide statistics from The Graph subgraph
 */

import { useState, useEffect } from 'react'
import { querySubgraph } from '../lib/graphql/client'
import {
  GET_PLATFORM_STATS,
  GET_PLATFORM_DAILY_METRICS,
} from '../lib/graphql/queries'

export interface PlatformStats {
  id: string
  tokenCount: string
  graduatedCount: string
  tradeCount: string
  totalVolumeNative: string
  totalFeesNative: string
  userCount: string
  platformFee: string
  creationFee: string
  updatedAt: string
}

export interface PlatformDailyMetric {
  id: string
  periodStartUnix: string
  tokensCreated: string
  tokensGraduated: string
  tradeCount: string
  volumeNative: string
  uniqueTraders: string
  platformFeesNative: string
  newUsers: string
  totalUsers: string
}

/**
 * Fetch platform statistics
 */
export function useSubgraphPlatformStats(chainId: number = 97) {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ factory: PlatformStats }>(
          GET_PLATFORM_STATS,
          undefined,
          chainId
        )

        setStats(result.factory || null)
      } catch (err) {
        console.error('Error fetching platform stats:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [chainId])

  return { stats, loading, error }
}

/**
 * Fetch platform daily metrics for charts/analytics
 */
export function useSubgraphPlatformMetrics(days: number = 30, chainId: number = 97) {
  const [metrics, setMetrics] = useState<PlatformDailyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await querySubgraph<{ platformDailyMetrics: PlatformDailyMetric[] }>(
          GET_PLATFORM_DAILY_METRICS,
          { days },
          chainId
        )

        setMetrics(result.platformDailyMetrics || [])
      } catch (err) {
        console.error('Error fetching platform metrics:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [days, chainId])

  return { metrics, loading, error }
}
