import { BigInt, Address, ethereum, log } from "@graphprotocol/graph-ts"
import {
  Trade as TradeEvent,
  Graduated as GraduatedEvent,
  GraduationFundsSplit as GraduationFundsSplitEvent,
  LiquidityAdded as LiquidityAddedEvent,
  LPTokensLocked as LPTokensLockedEvent,
  LPTokensWithdrawn as LPTokensWithdrawnEvent,
} from "../generated/templates/BondingCurveAMM/BondingCurveAMM"
import { BondingCurveAMM } from "../generated/templates/BondingCurveAMM/BondingCurveAMM"
import {
  Token,
  Trade,
  User,
  TokenHolder,
  TokenHourlyMetric,
  TokenDailyMetric,
  PlatformDailyMetric,
  Factory,
  TokenGraduatedEvent,
} from "../generated/schema"
import { getOrCreateUser, getOrCreateFactory } from "./token-factory"

const ZERO_BI = BigInt.fromI32(0)
const ONE_BI = BigInt.fromI32(1)
const ZERO_BD = BigInt.fromI32(0).toBigDecimal()

/**
 * Get or create TokenHolder entity
 */
function getOrCreateTokenHolder(
  tokenAddress: Address,
  userAddress: Address,
  timestamp: BigInt
): TokenHolder {
  let holderId = tokenAddress.toHexString() + "-" + userAddress.toHexString()
  let holder = TokenHolder.load(holderId)

  if (holder === null) {
    holder = new TokenHolder(holderId)
    holder.token = tokenAddress.toHexString()
    holder.user = userAddress.toHexString()
    holder.balance = ZERO_BI
    holder.totalBought = ZERO_BI
    holder.totalSold = ZERO_BI
    holder.totalSpent = ZERO_BI
    holder.totalReceived = ZERO_BI
    holder.realizedPnL = ZERO_BI
    holder.unrealizedPnL = ZERO_BI
    holder.avgBuyPrice = ZERO_BI
    holder.avgSellPrice = ZERO_BI
    holder.firstBoughtAt = timestamp
    holder.lastBoughtAt = null
    holder.lastSoldAt = null
    holder.updatedAt = timestamp

    // Increment holder count in token
    let token = Token.load(tokenAddress.toHexString())
    if (token !== null) {
      token.holderCount = token.holderCount.plus(ONE_BI)
      token.save()
    }
  }

  return holder
}

/**
 * Get or create hourly metric for a token
 */
function getOrCreateHourlyMetric(
  tokenAddress: Address,
  timestamp: BigInt
): TokenHourlyMetric {
  let hourIndex = timestamp.toI32() / 3600 // Unix timestamp / seconds per hour
  let hourStartUnix = BigInt.fromI32(hourIndex * 3600)
  let metricId = tokenAddress.toHexString() + "-" + hourStartUnix.toString()

  let metric = TokenHourlyMetric.load(metricId)

  if (metric === null) {
    metric = new TokenHourlyMetric(metricId)
    metric.token = tokenAddress.toHexString()
    metric.periodStartUnix = hourStartUnix
    metric.priceOpen = ZERO_BI
    metric.priceHigh = ZERO_BI
    metric.priceLow = ZERO_BI
    metric.priceClose = ZERO_BI
    metric.volumeNative = ZERO_BI
    metric.volumeToken = ZERO_BI
    metric.tradeCount = ZERO_BI
    metric.buyCount = ZERO_BI
    metric.sellCount = ZERO_BI
    metric.supplyStart = ZERO_BI
    metric.supplyEnd = ZERO_BI
    metric.uniqueTraders = ZERO_BI
  }

  return metric
}

/**
 * Get or create daily metric for a token
 */
function getOrCreateDailyMetric(
  tokenAddress: Address,
  timestamp: BigInt
): TokenDailyMetric {
  let dayIndex = timestamp.toI32() / 86400 // Unix timestamp / seconds per day
  let dayStartUnix = BigInt.fromI32(dayIndex * 86400)
  let metricId = tokenAddress.toHexString() + "-" + dayStartUnix.toString()

  let metric = TokenDailyMetric.load(metricId)

  if (metric === null) {
    metric = new TokenDailyMetric(metricId)
    metric.token = tokenAddress.toHexString()
    metric.periodStartUnix = dayStartUnix
    metric.priceOpen = ZERO_BI
    metric.priceHigh = ZERO_BI
    metric.priceLow = ZERO_BI
    metric.priceClose = ZERO_BI
    metric.volumeNative = ZERO_BI
    metric.volumeToken = ZERO_BI
    metric.tradeCount = ZERO_BI
    metric.buyCount = ZERO_BI
    metric.sellCount = ZERO_BI
    metric.supplyStart = ZERO_BI
    metric.supplyEnd = ZERO_BI
    metric.holderCountStart = ZERO_BI
    metric.holderCountEnd = ZERO_BI
    metric.newHolders = ZERO_BI
    metric.uniqueTraders = ZERO_BI
  }

  return metric
}

function getOrCreateGraduationEvent(
  token: Token,
  event: ethereum.Event
): TokenGraduatedEvent {
  let eventId = event.transaction.hash.toHex() + "-graduation"
  let graduatedEvent = TokenGraduatedEvent.load(eventId)

  if (graduatedEvent === null) {
    graduatedEvent = new TokenGraduatedEvent(eventId)
    graduatedEvent.token = token.id
    graduatedEvent.finalSupply = ZERO_BI
    graduatedEvent.nativeReserve = ZERO_BI
    graduatedEvent.liquidityAmount = ZERO_BI
    graduatedEvent.creatorShare = ZERO_BI
    graduatedEvent.platformShare = ZERO_BI
    graduatedEvent.dexPairAddress = null
    graduatedEvent.lpTokenAddress = null
    graduatedEvent.lpTokensLocked = null
    graduatedEvent.lpUnlockTime = null
    graduatedEvent.txHash = event.transaction.hash
    graduatedEvent.blockNumber = event.block.number
    graduatedEvent.timestamp = event.block.timestamp
    graduatedEvent.logIndex = event.logIndex
  }

  return graduatedEvent
}

/**
 * Handle Trade event
 * Updates Token, User, TokenHolder, and time-series metrics
 */
export function handleTrade(event: TradeEvent): void {
  let ammAddress = event.address
  let trader = event.params.trader
  let isBuy = event.params.isBuy
  let nativeAmount = event.params.nativeAmount
  let tokenAmount = event.params.tokenAmount
  let price = event.params.newPrice
  let fee = event.params.fee
  let timestamp = event.params.timestamp

  // Load AMM contract to get token address
  let ammContract = BondingCurveAMM.bind(ammAddress)
  let tokenAddress = ammContract.token()

  // Load token
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    log.warning("Token not found for AMM: {}", [ammAddress.toHexString()])
    return
  }

  // Get or create user
  let user = getOrCreateUser(trader, timestamp)

  // Get supply before/after
  let supplyBefore = token.currentSupply
  let supplyAfter = isBuy ? supplyBefore.plus(tokenAmount) : supplyBefore.minus(tokenAmount)

  // Create Trade entity
  let tradeId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let trade = new Trade(tradeId)
  trade.token = token.id
  trade.user = user.id
  trade.type = isBuy ? "BUY" : "SELL"
  trade.nativeAmount = nativeAmount
  trade.tokenAmount = tokenAmount
  trade.price = price
  trade.platformFee = fee
  trade.supplyBefore = supplyBefore
  trade.supplyAfter = supplyAfter
  trade.txHash = event.transaction.hash
  trade.blockNumber = event.block.number
  trade.timestamp = timestamp
  trade.logIndex = event.logIndex
  trade.gasUsed = event.transaction.gasUsed
  trade.gasPrice = event.transaction.gasPrice
  trade.save()

  // Update Token
  token.currentSupply = supplyAfter
  token.currentPrice = price
  token.tradeCount = token.tradeCount.plus(ONE_BI)
  if (isBuy) {
    token.buyCount = token.buyCount.plus(ONE_BI)
  } else {
    token.sellCount = token.sellCount.plus(ONE_BI)
  }
  token.volumeNative = token.volumeNative.plus(nativeAmount)
  token.marketCap = token.currentSupply.times(token.currentPrice)
  token.lastTradeAt = timestamp
  token.updatedAt = timestamp
  token.save()

  // Update User
  user.tradeCount = user.tradeCount.plus(ONE_BI)
  if (isBuy) {
    user.buyCount = user.buyCount.plus(ONE_BI)
    user.totalSpent = user.totalSpent.plus(nativeAmount)
  } else {
    user.sellCount = user.sellCount.plus(ONE_BI)
    user.totalReceived = user.totalReceived.plus(nativeAmount)
    user.realizedPnL = user.totalReceived.minus(user.totalSpent)
  }
  user.volumeNative = user.volumeNative.plus(nativeAmount)
  user.save()

  // Update TokenHolder
  let holder = getOrCreateTokenHolder(tokenAddress, trader, timestamp)
  if (isBuy) {
    holder.balance = holder.balance.plus(tokenAmount)
    holder.totalBought = holder.totalBought.plus(tokenAmount)
    holder.totalSpent = holder.totalSpent.plus(nativeAmount)
    holder.lastBoughtAt = timestamp

    // Update average buy price
    if (holder.totalBought.gt(ZERO_BI)) {
      holder.avgBuyPrice = holder.totalSpent.div(holder.totalBought)
    }
  } else {
    holder.balance = holder.balance.minus(tokenAmount)
    holder.totalSold = holder.totalSold.plus(tokenAmount)
    holder.totalReceived = holder.totalReceived.plus(nativeAmount)
    holder.lastSoldAt = timestamp

    // Update average sell price
    if (holder.totalSold.gt(ZERO_BI)) {
      holder.avgSellPrice = holder.totalReceived.div(holder.totalSold)
    }

    // Update realized P&L
    holder.realizedPnL = holder.totalReceived.minus(holder.totalSpent)
  }

  // Update unrealized P&L (for remaining balance)
  if (holder.balance.gt(ZERO_BI)) {
    let currentValue = holder.balance.times(price)
    let costBasis = holder.balance.times(holder.avgBuyPrice)
    holder.unrealizedPnL = currentValue.minus(costBasis)
  } else {
    holder.unrealizedPnL = ZERO_BI
  }

  holder.updatedAt = timestamp
  holder.save()

  // Update hourly metrics
  let hourlyMetric = getOrCreateHourlyMetric(tokenAddress, timestamp)
  if (hourlyMetric.priceOpen.equals(ZERO_BI)) {
    hourlyMetric.priceOpen = price
    hourlyMetric.supplyStart = supplyBefore
  }
  hourlyMetric.priceClose = price
  if (price.gt(hourlyMetric.priceHigh)) {
    hourlyMetric.priceHigh = price
  }
  if (hourlyMetric.priceLow.equals(ZERO_BI) || price.lt(hourlyMetric.priceLow)) {
    hourlyMetric.priceLow = price
  }
  hourlyMetric.volumeNative = hourlyMetric.volumeNative.plus(nativeAmount)
  hourlyMetric.volumeToken = hourlyMetric.volumeToken.plus(tokenAmount)
  hourlyMetric.tradeCount = hourlyMetric.tradeCount.plus(ONE_BI)
  if (isBuy) {
    hourlyMetric.buyCount = hourlyMetric.buyCount.plus(ONE_BI)
  } else {
    hourlyMetric.sellCount = hourlyMetric.sellCount.plus(ONE_BI)
  }
  hourlyMetric.supplyEnd = supplyAfter
  hourlyMetric.save()

  // Update daily metrics
  let dailyMetric = getOrCreateDailyMetric(tokenAddress, timestamp)
  if (dailyMetric.priceOpen.equals(ZERO_BI)) {
    dailyMetric.priceOpen = price
    dailyMetric.supplyStart = supplyBefore
    dailyMetric.holderCountStart = token.holderCount
  }
  dailyMetric.priceClose = price
  if (price.gt(dailyMetric.priceHigh)) {
    dailyMetric.priceHigh = price
  }
  if (dailyMetric.priceLow.equals(ZERO_BI) || price.lt(dailyMetric.priceLow)) {
    dailyMetric.priceLow = price
  }
  dailyMetric.volumeNative = dailyMetric.volumeNative.plus(nativeAmount)
  dailyMetric.volumeToken = dailyMetric.volumeToken.plus(tokenAmount)
  dailyMetric.tradeCount = dailyMetric.tradeCount.plus(ONE_BI)
  if (isBuy) {
    dailyMetric.buyCount = dailyMetric.buyCount.plus(ONE_BI)
  } else {
    dailyMetric.sellCount = dailyMetric.sellCount.plus(ONE_BI)
  }
  dailyMetric.supplyEnd = supplyAfter
  dailyMetric.holderCountEnd = token.holderCount
  dailyMetric.save()

  // Update Factory stats
  let factory = getOrCreateFactory(Address.zero()) // Will load existing
  factory.tradeCount = factory.tradeCount.plus(ONE_BI)
  factory.totalVolumeNative = factory.totalVolumeNative.plus(nativeAmount)
  factory.totalFeesNative = factory.totalFeesNative.plus(fee)
  factory.updatedAt = timestamp
  factory.save()
}

/**
 * Handle Graduated event from AMM
 */
export function handleGraduated(event: GraduatedEvent): void {
  let ammAddress = event.address
  let finalSupply = event.params.finalSupply
  let nativeReserve = event.params.nativeReserve
  let timestamp = event.params.timestamp

  // Load AMM contract to get token address
  let ammContract = BondingCurveAMM.bind(ammAddress)
  let tokenAddress = ammContract.token()

  // Load token
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    log.warning("Token not found for AMM graduation: {}", [ammAddress.toHexString()])
    return
  }

  // Mark as graduated
  token.isGraduated = true
  token.graduatedAt = timestamp
  token.graduatedAtBlock = event.block.number
  token.save()

  // Update Factory graduated count
  let factory = getOrCreateFactory(Address.zero())
  factory.graduatedCount = factory.graduatedCount.plus(ONE_BI)
  factory.save()

  // Update creator's graduated count
  let creator = User.load(token.creator)
  if (creator !== null) {
    creator.tokensGraduated = creator.tokensGraduated.plus(ONE_BI)
    creator.save()
  }

  // Create TokenGraduatedEvent entity
  let graduatedEvent = getOrCreateGraduationEvent(token, event)
  graduatedEvent.finalSupply = finalSupply
  graduatedEvent.nativeReserve = nativeReserve
  graduatedEvent.timestamp = timestamp
  graduatedEvent.blockNumber = event.block.number
  graduatedEvent.logIndex = event.logIndex
  graduatedEvent.save()
}

/**
 * Handle GraduationFundsSplit event
 * This provides details about how graduation funds were distributed
 */
export function handleGraduationFundsSplit(event: GraduationFundsSplitEvent): void {
  let ammAddress = event.address
  let creatorShare = event.params.creatorShare
  let platformShare = event.params.platformShare
  let creator = event.params.creator
  let platform = event.params.platform

  // Load AMM contract to get token address
  let ammContract = BondingCurveAMM.bind(ammAddress)
  let tokenAddress = ammContract.token()

  // Load token
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    return
  }

  // Update the graduation event if it exists
  // Find the most recent graduation event for this token
  let graduatedEvent = getOrCreateGraduationEvent(token, event)
  graduatedEvent.creatorShare = creatorShare
  graduatedEvent.platformShare = platformShare
  graduatedEvent.save()
}

/**
 * Handle LiquidityAdded event
 * Fired when DEX liquidity is automatically added on graduation
 */
export function handleLiquidityAdded(event: LiquidityAddedEvent): void {
  let ammAddress = event.address
  let tokenAmount = event.params.tokenAmount
  let nativeAmount = event.params.nativeAmount
  let liquidity = event.params.liquidity
  let lpTokenAddress = event.params.lpTokenAddress
  let dexPair = event.params.dexPair

  // Load AMM contract to get token address
  let ammContract = BondingCurveAMM.bind(ammAddress)
  let tokenAddress = ammContract.token()

  // Load token
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    log.warning("Token not found for AMM liquidity: {}", [ammAddress.toHexString()])
    return
  }

  // Update token with DEX info
  token.dexPairAddress = dexPair
  token.lpTokenAddress = lpTokenAddress
  token.save()

  // Update the graduation event if it exists
  let graduatedEvent = getOrCreateGraduationEvent(token, event)
  graduatedEvent.liquidityAmount = nativeAmount
  graduatedEvent.dexPairAddress = dexPair
  graduatedEvent.lpTokenAddress = lpTokenAddress
  graduatedEvent.save()

  log.info("Liquidity added for token {}: {} tokens, {} native, {} LP tokens", [
    token.name,
    tokenAmount.toString(),
    nativeAmount.toString(),
    liquidity.toString(),
  ])
}

/**
 * Handle LPTokensLocked event
 * Fired when LP tokens are locked for 6 months
 */
export function handleLPTokensLocked(event: LPTokensLockedEvent): void {
  let ammAddress = event.address
  let amount = event.params.amount
  let unlockTime = event.params.unlockTime
  let lpToken = event.params.lpToken

  // Load AMM contract to get token address
  let ammContract = BondingCurveAMM.bind(ammAddress)
  let tokenAddress = ammContract.token()

  // Load token
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    log.warning("Token not found for LP locking: {}", [ammAddress.toHexString()])
    return
  }

  // Update token with LP lock info
  token.lpTokensLocked = amount
  token.lpUnlockTime = unlockTime
  token.save()

  // Update the graduation event if it exists
  let graduatedEvent = getOrCreateGraduationEvent(token, event)
  graduatedEvent.lpTokensLocked = amount
  graduatedEvent.lpUnlockTime = unlockTime
  graduatedEvent.save()

  log.info("LP tokens locked for token {}: {} LP tokens until timestamp {}", [
    token.name,
    amount.toString(),
    unlockTime.toString(),
  ])
}

/**
 * Handle LPTokensWithdrawn event
 * Fired when creator withdraws LP tokens after lock period
 */
export function handleLPTokensWithdrawn(event: LPTokensWithdrawnEvent): void {
  let ammAddress = event.address
  let creator = event.params.creator
  let amount = event.params.amount
  let lpToken = event.params.lpToken

  // Load AMM contract to get token address
  let ammContract = BondingCurveAMM.bind(ammAddress)
  let tokenAddress = ammContract.token()

  // Load token
  let token = Token.load(tokenAddress.toHexString())
  if (token === null) {
    log.warning("Token not found for LP withdrawal: {}", [ammAddress.toHexString()])
    return
  }

  // Update token - LP tokens no longer locked
  token.lpTokensLocked = null
  token.save()

  log.info("LP tokens withdrawn by creator for token {}: {} LP tokens", [
    token.name,
    amount.toString(),
  ])
}
