# KasPump Subgraph

The Graph protocol subgraph for indexing KasPump platform data on BSC Testnet and mainnets.

## Overview

This subgraph indexes:
- **Tokens**: All KasPump tokens with metadata, pricing, and status
- **Trades**: All buy/sell transactions on bonding curves
- **Users**: Creator and trader statistics
- **Holdings**: Token ownership and P&L tracking
- **Time-series Metrics**: Hourly and daily aggregated data
- **Events**: Historical token creation and graduation events

## Quick Start

```bash
# Install dependencies
cd subgraph
npm install

# Generate TypeScript types from schema
npm run codegen

# Build the subgraph
npm run build

# Deploy to The Graph hosted service (BSC Testnet)
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet
```

## Configuration

### BSC Testnet (current)
- Network: `chapel`
- TokenFactory: `0x7Af627Bf902549543701C58366d424eE59A4ee08`
- Start Block: `70735503`

### Environment Setup

Before deploying, you need to authenticate with The Graph:

```bash
# Install The Graph CLI globally
npm install -g @graphprotocol/graph-cli

# Authenticate (get your access token from https://thegraph.com/studio/)
graph auth --product hosted-service <ACCESS_TOKEN>

# Deploy
graph deploy --product hosted-service <GITHUB_USERNAME>/kaspump-subgraph
```

## Schema

The subgraph schema includes the following entities:

### Core Entities
- `Token` - Token information and aggregated metrics
- `User` - User stats (creator and trader)
- `Trade` - Individual buy/sell transactions
- `TokenHolder` - Token ownership and P&L
- `Factory` - Global platform stats

### Time-series
- `TokenHourlyMetric` - OHLC price data and volume (hourly)
- `TokenDailyMetric` - OHLC price data and volume (daily)
- `PlatformDailyMetric` - Platform-wide daily stats

### Events
- `TokenCreatedEvent` - Token creation events
- `TokenGraduatedEvent` - Token graduation events

## Example Queries

### Get all tokens with pagination

```graphql
query GetTokens {
  tokens(first: 10, orderBy: createdAt, orderDirection: desc) {
    id
    name
    symbol
    totalSupply
    currentPrice
    isGraduated
    creator {
      id
      address
    }
    trades(first: 5, orderBy: timestamp, orderDirection: desc) {
      id
      type
      nativeAmount
      tokenAmount
      price
      timestamp
    }
  }
}
```

### Get token details with metrics

```graphql
query GetToken($tokenId: ID!) {
  token(id: $tokenId) {
    id
    name
    symbol
    description
    imageUrl
    totalSupply
    currentSupply
    currentPrice
    isGraduated
    volumeNative
    tradeCount
    holderCount
    dailyMetrics(first: 30, orderBy: periodStartUnix, orderDirection: desc) {
      periodStartUnix
      priceOpen
      priceHigh
      priceLow
      priceClose
      volumeNative
      tradeCount
    }
  }
}
```

### Get user's trading history

```graphql
query GetUserTrades($userAddress: String!) {
  user(id: $userAddress) {
    id
    address
    tradeCount
    volumeNative
    realizedPnL
    holdings {
      token {
        name
        symbol
      }
      balance
      realizedPnL
      unrealizedPnL
    }
    trades(first: 50, orderBy: timestamp, orderDirection: desc) {
      id
      token {
        name
        symbol
      }
      type
      nativeAmount
      tokenAmount
      price
      timestamp
    }
  }
}
```

### Get trending tokens (24h volume)

```graphql
query GetTrendingTokens {
  tokens(first: 10, orderBy: volumeNative24h, orderDirection: desc) {
    id
    name
    symbol
    currentPrice
    priceChange24h
    volumeNative24h
    tradeCount
    holderCount
  }
}
```

### Get platform statistics

```graphql
query GetPlatformStats {
  factory(id: "1") {
    tokenCount
    graduatedCount
    tradeCount
    totalVolumeNative
    totalFeesNative
    userCount
  }
  platformDailyMetrics(first: 30, orderBy: periodStartUnix, orderDirection: desc) {
    periodStartUnix
    tokensCreated
    tokensGraduated
    tradeCount
    volumeNative
    uniqueTraders
    platformFeesNative
  }
}
```

## Development

### Project Structure

```
subgraph/
├── schema.graphql           # GraphQL schema definition
├── subgraph.yaml           # Subgraph manifest
├── src/
│   ├── token-factory.ts    # TokenFactory event handlers
│   └── bonding-curve-amm.ts # BondingCurveAMM event handlers
├── abis/
│   ├── TokenFactory.json   # TokenFactory ABI
│   └── BondingCurveAMM.json # BondingCurveAMM ABI
└── package.json
```

### Testing

```bash
# Run codegen to generate types
npm run codegen

# Build to check for errors
npm run build
```

### Local Development

To test locally, you can run a Graph Node:

```bash
# Clone graph-node repo
git clone https://github.com/graphprotocol/graph-node
cd graph-node/docker

# Start Graph Node, IPFS, and Postgres
docker-compose up

# In another terminal, create and deploy local subgraph
npm run create:local
npm run deploy:local
```

## Multi-chain Support

To add support for other networks (BSC Mainnet, Arbitrum, Base):

1. Create a new `subgraph-{network}.yaml` file
2. Update the network name and contract addresses
3. Add a new deploy script to `package.json`

Example for BSC Mainnet:

```yaml
# subgraph-bsc-mainnet.yaml
network: bsc
source:
  address: "0x..." # Mainnet factory address
  startBlock: 12345678
```

## Monitoring

Once deployed, monitor your subgraph at:
- Hosted Service: https://thegraph.com/hosted-service/subgraph/{username}/kaspump-subgraph
- Health: Check sync status and errors
- Playground: Test GraphQL queries

## Troubleshooting

### Subgraph fails to sync

1. Check contract address is correct
2. Verify start block is accurate
3. Check network name matches The Graph's network names
4. Review logs for errors

### Build fails

1. Run `npm run codegen` to regenerate types
2. Check for TypeScript errors in mapping files
3. Verify ABIs match contract events

### Query returns no data

1. Check if subgraph is fully synced
2. Verify entity IDs are lowercase
3. Test query in The Graph playground
4. Check if events were emitted on-chain

## Performance Tips

- Use pagination (`first`, `skip`) for large queries
- Order results for consistent pagination
- Use specific fields instead of querying all
- Index frequently queried fields in schema
- Cache results on frontend for 1-2 minutes

## Future Enhancements

- [ ] Add DEX pair tracking (PancakeSwap/Uniswap)
- [ ] Track LP token locks
- [ ] Add user reputation scores
- [ ] Calculate APY for holders
- [ ] Track social media metrics
- [ ] Add whale alert tracking

## Resources

- [The Graph Docs](https://thegraph.com/docs/)
- [AssemblyScript API](https://thegraph.com/docs/en/developing/assemblyscript-api/)
- [Hosted Service](https://thegraph.com/hosted-service/)
- [Discord Support](https://discord.gg/graphprotocol)
