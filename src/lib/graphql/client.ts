/**
 * GraphQL Client for The Graph Subgraph
 * Provides typed queries for KasPump data indexed by The Graph
 */

// These URLs must be set in environment variables — no fallback URLs.
// The Graph hosted service was decommissioned mid-2024; deploy to Goldsky or Alchemy Subgraphs.
// See TECHNICAL_DEBT.md #7 for deployment instructions.
const SUBGRAPH_URLS: Partial<Record<number, string>> = {
  97: process.env.NEXT_PUBLIC_SUBGRAPH_URL_BSC_TESTNET,
  56: process.env.NEXT_PUBLIC_SUBGRAPH_URL_BSC,
  42161: process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARBITRUM,
  8453: process.env.NEXT_PUBLIC_SUBGRAPH_URL_BASE,
}

export interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: string[]
  }>
}

export interface GraphQLVariables {
  [key: string]: any
}

/**
 * Execute a GraphQL query against the subgraph
 */
export async function querySubgraph<T = any>(
  query: string,
  variables?: GraphQLVariables,
  chainId: number = 97
): Promise<T> {
  const url = SUBGRAPH_URLS[chainId]

  if (!url) {
    throw new Error(
      `Subgraph URL not configured for chain ${chainId}. ` +
      `Set NEXT_PUBLIC_SUBGRAPH_URL_* environment variable. ` +
      `See TECHNICAL_DEBT.md #7 for deployment instructions.`
    )
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      // Cache for 30 seconds
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: GraphQLResponse<T> = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      throw new Error(result.errors[0]?.message || 'GraphQL query failed')
    }

    if (!result.data) {
      throw new Error('No data returned from subgraph')
    }

    return result.data
  } catch (error) {
    console.error('Subgraph query error:', error)
    throw error
  }
}

/**
 * Check if subgraph is available and healthy
 */
export async function checkSubgraphHealth(chainId: number = 97): Promise<boolean> {
  try {
    const result = await querySubgraph(
      `query { factory(id: "1") { id } }`,
      undefined,
      chainId
    )
    return !!result
  } catch (error) {
    console.error('Subgraph health check failed:', error)
    return false
  }
}
