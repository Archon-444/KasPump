/**
 * GraphQL Queries for The Graph Subgraph
 * Type-safe query definitions for all subgraph entities
 */

// ==================================================
// Token Queries
// ==================================================

export const GET_TOKENS = `
  query GetTokens($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String, $where: Token_filter) {
    tokens(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection, where: $where) {
      id
      address
      name
      symbol
      description
      imageUrl
      totalSupply
      currentSupply
      basePrice
      slope
      curveType
      currentPrice
      creator {
        id
        address
      }
      createdAt
      isGraduated
      graduatedAt
      ammAddress
      tradeCount
      buyCount
      sellCount
      volumeNative
      volumeNative24h
      holderCount
      priceChange1h
      priceChange24h
      priceChange7d
      marketCap
      chainId
      lastTradeAt
    }
  }
`

export const GET_TOKEN_BY_ADDRESS = `
  query GetToken($id: ID!) {
    token(id: $id) {
      id
      address
      name
      symbol
      description
      imageUrl
      totalSupply
      currentSupply
      basePrice
      slope
      curveType
      currentPrice
      creator {
        id
        address
        tokensCreated
        tokensGraduated
      }
      createdAt
      createdAtBlock
      isGraduated
      graduatedAt
      graduatedAtBlock
      ammAddress
      graduationThreshold
      dexPairAddress
      lpTokenAddress
      lpTokensLocked
      lpUnlockTime
      tradeCount
      buyCount
      sellCount
      volumeNative
      volumeNative24h
      volumeNative7d
      holderCount
      priceChange1h
      priceChange24h
      priceChange7d
      marketCap
      chainId
      lastTradeAt
      updatedAt
    }
  }
`

export const GET_TOKEN_WITH_TRADES = `
  query GetTokenWithTrades($id: ID!, $tradesFirst: Int!) {
    token(id: $id) {
      id
      name
      symbol
      currentPrice
      trades(first: $tradesFirst, orderBy: timestamp, orderDirection: desc) {
        id
        user {
          id
          address
        }
        type
        nativeAmount
        tokenAmount
        price
        platformFee
        timestamp
        txHash
      }
    }
  }
`

export const GET_TOKEN_DAILY_METRICS = `
  query GetTokenDailyMetrics($tokenId: String!, $days: Int!) {
    tokenDailyMetrics(
      first: $days
      orderBy: periodStartUnix
      orderDirection: desc
      where: { token: $tokenId }
    ) {
      id
      periodStartUnix
      priceOpen
      priceHigh
      priceLow
      priceClose
      volumeNative
      volumeToken
      tradeCount
      buyCount
      sellCount
      supplyEnd
      holderCountEnd
    }
  }
`

export const GET_TOKEN_HOURLY_METRICS = `
  query GetTokenHourlyMetrics($tokenId: String!, $hours: Int!) {
    tokenHourlyMetrics(
      first: $hours
      orderBy: periodStartUnix
      orderDirection: desc
      where: { token: $tokenId }
    ) {
      id
      periodStartUnix
      priceOpen
      priceHigh
      priceLow
      priceClose
      volumeNative
      tradeCount
    }
  }
`

// ==================================================
// User Queries
// ==================================================

export const GET_USER = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      address
      tokensCreated
      tokensGraduated
      tradeCount
      buyCount
      sellCount
      volumeNative
      totalSpent
      totalReceived
      realizedPnL
      firstSeenAt
      lastSeenAt
    }
  }
`

export const GET_USER_WITH_HOLDINGS = `
  query GetUserWithHoldings($id: ID!) {
    user(id: $id) {
      id
      address
      tokensCreated
      tokensGraduated
      tradeCount
      volumeNative
      realizedPnL
      holdings(where: { balance_gt: "0" }) {
        id
        token {
          id
          name
          symbol
          currentPrice
        }
        balance
        totalBought
        totalSold
        totalSpent
        totalReceived
        realizedPnL
        unrealizedPnL
        avgBuyPrice
        avgSellPrice
        firstBoughtAt
        lastBoughtAt
      }
    }
  }
`

export const GET_USER_TRADES = `
  query GetUserTrades($userId: String!, $first: Int!, $skip: Int!) {
    trades(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { user: $userId }
    ) {
      id
      token {
        id
        name
        symbol
      }
      type
      nativeAmount
      tokenAmount
      price
      platformFee
      timestamp
      txHash
    }
  }
`

export const GET_USER_CREATED_TOKENS = `
  query GetUserCreatedTokens($userId: String!) {
    user(id: $userId) {
      id
      createdTokens(orderBy: createdAt, orderDirection: desc) {
        id
        name
        symbol
        currentPrice
        isGraduated
        tradeCount
        volumeNative
        holderCount
        createdAt
      }
    }
  }
`

// ==================================================
// Trade Queries
// ==================================================

export const GET_RECENT_TRADES = `
  query GetRecentTrades($first: Int!, $skip: Int!) {
    trades(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
      id
      token {
        id
        name
        symbol
      }
      user {
        id
        address
      }
      type
      nativeAmount
      tokenAmount
      price
      platformFee
      timestamp
      txHash
    }
  }
`

export const GET_TOKEN_TRADES = `
  query GetTokenTrades($tokenId: String!, $first: Int!, $skip: Int!) {
    trades(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { token: $tokenId }
    ) {
      id
      user {
        id
        address
      }
      type
      nativeAmount
      tokenAmount
      price
      platformFee
      supplyBefore
      supplyAfter
      timestamp
      txHash
    }
  }
`

// ==================================================
// Platform Queries
// ==================================================

export const GET_PLATFORM_STATS = `
  query GetPlatformStats {
    factory(id: "1") {
      id
      tokenCount
      graduatedCount
      tradeCount
      totalVolumeNative
      totalFeesNative
      userCount
      platformFee
      creationFee
      updatedAt
    }
  }
`

export const GET_PLATFORM_DAILY_METRICS = `
  query GetPlatformDailyMetrics($days: Int!) {
    platformDailyMetrics(first: $days, orderBy: periodStartUnix, orderDirection: desc) {
      id
      periodStartUnix
      tokensCreated
      tokensGraduated
      tradeCount
      volumeNative
      uniqueTraders
      platformFeesNative
      newUsers
      totalUsers
    }
  }
`

// ==================================================
// Trending & Discovery Queries
// ==================================================

export const GET_TRENDING_TOKENS = `
  query GetTrendingTokens($first: Int!) {
    tokens(first: $first, orderBy: volumeNative24h, orderDirection: desc, where: { isGraduated: false }) {
      id
      address
      name
      symbol
      imageUrl
      currentPrice
      priceChange24h
      volumeNative24h
      tradeCount
      holderCount
      marketCap
      createdAt
    }
  }
`

export const GET_RECENTLY_GRADUATED = `
  query GetRecentlyGraduated($first: Int!) {
    tokens(first: $first, orderBy: graduatedAt, orderDirection: desc, where: { isGraduated: true }) {
      id
      address
      name
      symbol
      imageUrl
      currentPrice
      volumeNative
      holderCount
      graduatedAt
      dexPairAddress
    }
  }
`

export const GET_NEWLY_CREATED = `
  query GetNewlyCreated($first: Int!) {
    tokens(first: $first, orderBy: createdAt, orderDirection: desc) {
      id
      address
      name
      symbol
      imageUrl
      currentPrice
      creator {
        id
        address
      }
      createdAt
      tradeCount
      holderCount
    }
  }
`

// ==================================================
// Search Queries
// ==================================================

export const SEARCH_TOKENS = `
  query SearchTokens($searchText: String!) {
    tokenSearch: tokens(
      where: {
        or: [
          { name_contains_nocase: $searchText }
          { symbol_contains_nocase: $searchText }
        ]
      }
      first: 20
    ) {
      id
      address
      name
      symbol
      imageUrl
      currentPrice
      volumeNative
      holderCount
      isGraduated
    }
  }
`
