import { BigInt, Address, dataSource } from "@graphprotocol/graph-ts"
import {
  TokenCreated as TokenCreatedEvent,
  TokenGraduated as TokenGraduatedEvent,
} from "../generated/TokenFactory/TokenFactory"
import {
  Token,
  User,
  Factory,
  TokenCreatedEvent as TokenCreatedEventEntity,
  TokenGraduatedEvent as TokenGraduatedEventEntity,
} from "../generated/schema"
import { BondingCurveAMM as BondingCurveAMMTemplate } from "../generated/templates"
import { BondingCurveAMM } from "../generated/TokenFactory/BondingCurveAMM"

const ZERO_BI = BigInt.fromI32(0)
const ONE_BI = BigInt.fromI32(1)
const ZERO_BD = BigInt.fromI32(0).toBigDecimal()

// Helper to get or create Factory entity
export function getOrCreateFactory(factoryAddress: Address): Factory {
  let factory = Factory.load("1")

  if (factory === null) {
    factory = new Factory("1")
    factory.address = factoryAddress
    factory.feeRecipient = Address.zero()
    factory.tokenCount = ZERO_BI
    factory.graduatedCount = ZERO_BI
    factory.tradeCount = ZERO_BI
    factory.totalVolumeNative = ZERO_BI
    factory.totalFeesNative = ZERO_BI
    factory.userCount = ZERO_BI
    factory.platformFee = BigInt.fromI32(50) // 0.5% in basis points
    factory.creationFee = BigInt.fromI64(25000000000000000) // 0.025 BNB
    factory.creationCooldown = BigInt.fromI32(60)
    factory.createdAt = ZERO_BI
    factory.updatedAt = ZERO_BI
  }

  return factory
}

// Helper to get or create User entity
export function getOrCreateUser(userAddress: Address, timestamp: BigInt): User {
  let user = User.load(userAddress.toHexString())

  if (user === null) {
    user = new User(userAddress.toHexString())
    user.address = userAddress
    user.tokensCreated = ZERO_BI
    user.tokensGraduated = ZERO_BI
    user.tradeCount = ZERO_BI
    user.buyCount = ZERO_BI
    user.sellCount = ZERO_BI
    user.volumeNative = ZERO_BI
    user.totalSpent = ZERO_BI
    user.totalReceived = ZERO_BI
    user.realizedPnL = ZERO_BI
    user.firstSeenAt = timestamp
    user.lastSeenAt = timestamp

    // Increment user count in factory
    let factory = getOrCreateFactory(dataSource.address())
    factory.userCount = factory.userCount.plus(ONE_BI)
    factory.save()
  } else {
    user.lastSeenAt = timestamp
  }

  user.save()
  return user
}

/**
 * Handle TokenCreated event
 * Creates Token entity and starts indexing its BondingCurveAMM
 */
export function handleTokenCreated(event: TokenCreatedEvent): void {
  let tokenAddress = event.params.tokenAddress
  let ammAddress = event.params.ammAddress
  let creatorAddress = event.params.creator

  // Get or create user (creator)
  let creator = getOrCreateUser(creatorAddress, event.block.timestamp)
  creator.tokensCreated = creator.tokensCreated.plus(ONE_BI)
  creator.save()

  // Create Token entity
  let token = new Token(tokenAddress.toHexString())
  token.address = tokenAddress
  token.name = event.params.name
  token.symbol = event.params.symbol
  token.description = "" // Will be populated by calling getTokenConfig if needed
  token.imageUrl = ""

  // Supply metrics
  token.totalSupply = event.params.totalSupply
  token.currentSupply = ZERO_BI // Starts at 0, increases with buys

  // Load bonding curve parameters from AMM contract
  let ammContract = BondingCurveAMM.bind(ammAddress)
  token.basePrice = ammContract.basePrice()
  token.slope = ammContract.slope()
  token.curveType = ammContract.curveType() == 0 ? "LINEAR" : "EXPONENTIAL"
  token.currentPrice = ammContract.getCurrentPrice()

  // Creator info
  token.creator = creator.id
  token.createdAt = event.block.timestamp
  token.createdAtBlock = event.block.number

  // AMM info
  token.ammAddress = ammAddress
  token.graduationThreshold = ammContract.graduationThreshold()

  // Status
  token.isGraduated = false
  token.graduatedAt = null
  token.graduatedAtBlock = null

  // DEX info (null until graduation)
  token.dexPairAddress = null
  token.lpTokenAddress = null
  token.lpTokensLocked = null
  token.lpUnlockTime = null

  // Aggregated metrics
  token.tradeCount = ZERO_BI
  token.buyCount = ZERO_BI
  token.sellCount = ZERO_BI
  token.volumeNative = ZERO_BI
  token.volumeNative24h = ZERO_BI
  token.volumeNative7d = ZERO_BI
  token.holderCount = ZERO_BI

  // Price change metrics (start at 0%)
  token.priceChange1h = ZERO_BD
  token.priceChange24h = ZERO_BD
  token.priceChange7d = ZERO_BD

  // Market cap
  token.marketCap = token.currentSupply.times(token.currentPrice)

  // Chain ID
  let network = dataSource.network()
  if (network == "chapel") {
    token.chainId = BigInt.fromI32(97) // BSC Testnet
  } else if (network == "bsc") {
    token.chainId = BigInt.fromI32(56) // BSC Mainnet
  } else if (network == "arbitrum-one") {
    token.chainId = BigInt.fromI32(42161) // Arbitrum
  } else if (network == "base") {
    token.chainId = BigInt.fromI32(8453) // Base
  } else {
    token.chainId = ZERO_BI
  }

  // Last updated
  token.lastTradeAt = null
  token.updatedAt = event.block.timestamp

  token.save()

  // Create TokenCreatedEvent entity
  let tokenCreatedEventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let tokenCreatedEvent = new TokenCreatedEventEntity(tokenCreatedEventId)
  tokenCreatedEvent.token = token.id
  tokenCreatedEvent.creator = creator.id
  tokenCreatedEvent.txHash = event.transaction.hash
  tokenCreatedEvent.blockNumber = event.block.number
  tokenCreatedEvent.timestamp = event.block.timestamp
  tokenCreatedEvent.logIndex = event.logIndex
  tokenCreatedEvent.save()

  // Update Factory stats
  let factory = getOrCreateFactory(event.address)
  factory.tokenCount = factory.tokenCount.plus(ONE_BI)
  factory.updatedAt = event.block.timestamp
  if (factory.createdAt.equals(ZERO_BI)) {
    factory.createdAt = event.block.timestamp
  }
  factory.save()

  // Start indexing the BondingCurveAMM contract for this token
  BondingCurveAMMTemplate.create(ammAddress)
}

/**
 * Handle TokenGraduated event from Factory
 * NOTE: Most graduation logic is in bonding-curve-amm.ts handleGraduated
 * This is just a backup in case the factory emits it
 */
export function handleTokenGraduated(event: TokenGraduatedEvent): void {
  let tokenAddress = event.params.tokenAddress
  let token = Token.load(tokenAddress.toHexString())

  if (token === null) {
    // Token should exist, but log and skip if not
    return
  }

  // Mark as graduated if not already
  if (!token.isGraduated) {
    token.isGraduated = true
    token.graduatedAt = event.block.timestamp
    token.graduatedAtBlock = event.block.number
    token.save()

    // Update factory graduated count
    let factory = getOrCreateFactory(event.address)
    factory.graduatedCount = factory.graduatedCount.plus(ONE_BI)
    factory.updatedAt = event.block.timestamp
    factory.save()

    // Update creator's graduated count
    let creator = User.load(token.creator)
    if (creator !== null) {
      creator.tokensGraduated = creator.tokensGraduated.plus(ONE_BI)
      creator.save()
    }
  }

  // Create TokenGraduatedEvent entity
  let eventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let graduatedEvent = new TokenGraduatedEventEntity(eventId)
  graduatedEvent.token = token.id
  graduatedEvent.finalSupply = event.params.finalSupply
  graduatedEvent.nativeReserve = ZERO_BI // Not in this event
  graduatedEvent.liquidityAmount = event.params.liquidityAdded
  graduatedEvent.creatorShare = ZERO_BI // Not in this event
  graduatedEvent.platformShare = ZERO_BI // Not in this event
  graduatedEvent.dexPairAddress = null
  graduatedEvent.lpTokenAddress = null
  graduatedEvent.lpTokensLocked = null
  graduatedEvent.lpUnlockTime = null
  graduatedEvent.txHash = event.transaction.hash
  graduatedEvent.blockNumber = event.block.number
  graduatedEvent.timestamp = event.block.timestamp
  graduatedEvent.logIndex = event.logIndex
  graduatedEvent.save()
}
