// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPancakeRouter.sol";

/**
 * @title BondingCurveAMM - PRODUCTION GRADE WITH DEX INTEGRATION
 * @dev Automated Market Maker with bonding curve pricing and automatic DEX liquidity
 * @notice Battle-tested security fixes applied:
 *  - ReentrancyGuard: Prevents reentrancy attacks
 *  - Pausable: Emergency stop mechanism
 *  - Ownable: Access control for admin functions
 *  - SafeERC20: Safe token transfer operations
 *  - Address.sendValue: Safe ETH transfers
 *  - Comprehensive input validation
 *  - Fixed precision loss issues
 *  - Proper Checks-Effects-Interactions pattern
 * @notice DEX Integration Features:
 *  - Automatic liquidity provision on graduation (70% of funds)
 *  - LP token locking for 6 months (anti-rug mechanism)
 *  - Funds split: 70% DEX liquidity, 20% creator, 10% platform
 */
contract BondingCurveAMM is ReentrancyGuard, Pausable, Ownable {
    using Address for address payable;
    using SafeERC20 for IERC20;

    // ========== IMMUTABLE STATE ==========

    IERC20 public immutable token;
    address payable public immutable tokenCreator; // Address that created the token
    uint256 public immutable basePrice;
    uint256 public immutable slope;
    uint8 public immutable curveType; // 0 = LINEAR, 1 = EXPONENTIAL
    uint256 public immutable graduationThreshold;
    address payable public immutable feeRecipient;
    uint8 public immutable membershipTier; // For tiered fees
    IPancakeRouter public immutable dexRouter; // DEX router for liquidity provision

    // ========== ANTI-SNIPER PROTECTION ==========

    uint256 public immutable launchTimestamp;
    uint256 public immutable sniperProtectionDuration; // seconds
    uint256 public constant MAX_SNIPER_FEE = 9900; // 99% max fee in basis points
    uint256 public constant DEFAULT_SNIPER_DURATION = 60; // 60 seconds default

    // ========== MUTABLE STATE ==========

    uint256 public currentSupply;
    uint256 public totalVolume;
    bool public isGraduated;

    // Graduation withdrawal tracking
    mapping(address => uint256) public withdrawableGraduationFunds;
    uint256 public totalGraduationFunds;

    // Creator revenue sharing — accumulated from per-trade fee split
    uint256 public creatorAccumulatedFees;

    // Referral tracking
    address payable public immutable referrer; // Address that referred token creation (can be zero)
    uint256 public constant REFERRAL_TRADE_SHARE = 500; // 5% of platform fee goes to referrer (basis points)
    uint256 public referrerAccumulatedFees;

    // DEX LP token tracking
    address public lpTokenAddress; // Address of LP token contract
    uint256 public lpTokensLocked; // Amount of LP tokens locked
    uint256 public lpUnlockTime; // Timestamp when LP can be unlocked (6 months)

    // ========== ANTI-BOT + SOFT-LAUNCH STATE ==========

    // Same-block trade tracking (anti-sandwich, anti-flip)
    mapping(address => uint256) public lastBuyBlock;

    // Snapshot of last successful trade's spot price for deviation guard
    uint256 public lastTradePrice;

    // Soft-launch cap: 0 = disabled. Owner-set, capped against gross native raised
    // from buys. Partial-fill + refund applied on entry that would breach the cap.
    uint256 public softLaunchCapNative;
    uint256 public totalNativeRaised;

    // ========== CONSTANTS ==========

    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% maximum slippage

    // Continuous fee decay — pre-trade supply linked.
    // fee = MAX_FEE_BPS - FEE_DECAY_RANGE_BPS * preTradeSupply / graduationThreshold,
    // floor-clamped at MIN_FEE_BPS so post-graduation edge cases never go below 0.10%.
    uint256 public constant MAX_FEE_BPS = 100;        // 1.00% at supply 0
    uint256 public constant FEE_DECAY_RANGE_BPS = 90; // decays to MAX - 90 = 10 bps at threshold
    uint256 public constant MIN_FEE_BPS = 10;         // 0.10% hard floor

    // Creator revenue sharing: 50% of platform fee goes to token creator on every trade
    uint256 public constant CREATOR_FEE_SHARE = 5000; // 50% of fee in basis points

    // Anti-bot guards (sniper window only, except same-block which has its own gating)
    uint256 public constant MAX_BUY_PER_TX_BPS = 200;        // 2% of remaining curve supply
    uint256 public constant MAX_PRICE_DEVIATION_BPS = 5000;  // 50% spot-price deviation
    uint256 public constant SAME_BLOCK_LARGE_BPS = 50;       // 0.5% remaining-supply size threshold

    // Safety limits
    uint256 public constant MAX_TOTAL_SUPPLY = 1e12 * 1e18; // 1 trillion tokens max
    uint256 public constant MIN_BASE_PRICE = 1e12; // Minimum 0.000001 ETH
    uint256 public constant MAX_BASE_PRICE = 1e24; // Maximum 1,000,000 ETH
    uint256 public constant MAX_SLOPE = 1e20; // Prevent extreme slopes

    // DEX Integration constants
    uint256 public constant LP_LOCK_DURATION = 180 days; // 6 months LP lock
    uint256 public constant DEX_LIQUIDITY_PERCENT = 70; // 70% for DEX
    uint256 public constant CREATOR_PERCENT = 20; // 20% for creator
    uint256 public constant PLATFORM_PERCENT = 10; // 10% for platform
    uint256 public constant DEX_SLIPPAGE_TOLERANCE = 5; // 5% slippage on DEX add

    // ========== EVENTS ==========

    event Trade(
        address indexed trader,
        bool indexed isBuy,
        uint256 nativeAmount,
        uint256 tokenAmount,
        uint256 newPrice,
        uint256 fee,
        uint256 timestamp
    );

    event Graduated(
        uint256 finalSupply,
        uint256 nativeReserve,
        uint256 timestamp
    );

    event GraduationFundsWithdrawn(
        address indexed user,
        uint256 amount
    );

    event GraduationFundsSplit(
        uint256 creatorShare,
        uint256 platformShare,
        address indexed creator,
        address indexed platform
    );

    event LiquidityAdded(
        uint256 tokenAmount,
        uint256 nativeAmount,
        uint256 liquidity,
        address indexed lpTokenAddress,
        address indexed dexPair
    );

    event LPTokensLocked(
        uint256 amount,
        uint256 unlockTime,
        address indexed lpToken
    );

    event LPTokensWithdrawn(
        address indexed creator,
        uint256 amount,
        address indexed lpToken
    );

    event EmergencyWithdraw(
        address indexed admin,
        uint256 amount,
        string reason
    );

    event LiquidityProvisionFailed(
        uint256 nativeAmount,
        uint256 timestamp
    );

    event CreatorFeeAccumulated(
        address indexed creator,
        uint256 amount,
        uint256 totalAccumulated
    );

    event CreatorFeesWithdrawn(
        address indexed creator,
        uint256 amount
    );

    event ReferrerFeeAccumulated(
        address indexed referrer,
        uint256 amount,
        uint256 totalAccumulated
    );

    event ReferrerFeesWithdrawn(
        address indexed referrer,
        uint256 amount
    );

    // Structured ops/safety event surface (V2 — see plan §10).
    // Legacy `Trade` is preserved for indexer compatibility; consumers should
    // migrate to TradeExecuted for richer trade context.
    //
    // `nativeGross` and `nativeNet` are kept symmetric across buy and sell so
    // an indexer can aggregate volume off either field without mixing units:
    //   buy:  nativeGross = post-cap-clamp gross, nativeNet = nativeAfterFee
    //   sell: nativeGross = curve-computed gross, nativeNet = nativeAfterFee
    event TradeExecuted(
        address indexed trader,
        address indexed token,
        bool isBuy,
        uint256 supplyBefore,
        uint256 supplyAfter,
        uint256 nativeGross,
        uint256 nativeNet,
        uint256 tokenAmount,
        uint256 feeAmount,
        uint256 feeBps,
        uint256 priceAfter
    );

    // Note: there is intentionally NO PriceDeviationBlocked event. The deviation
    // guard reverts the trade and reverted EVM transactions discard logs, so an
    // event there is a false monitoring surface. Use the parameterized
    // `PriceDeviation` custom error below; consumers decode it from failed
    // simulations / provider error responses / debug_traceTransaction output.

    event SoftLaunchCapHit(
        address indexed token,
        address indexed buyer,
        uint256 requestedNative,
        uint256 acceptedNative,
        uint256 refundedNative
    );

    event SoftLaunchCapUpdated(
        uint256 oldCap,
        uint256 newCap
    );

    // ========== CUSTOM ERRORS ==========

    error InvalidAmount();
    error SlippageTooHigh();
    error AlreadyGraduated();
    error NotGraduated();
    error InvalidCurveType();
    error TransferFailed();
    error ZeroAddress();
    error InvalidParameter(string param);
    error InsufficientBalance();
    error NoWithdrawableFunds();
    error LPTokensStillLocked();
    error NoLPTokensToWithdraw();
    error DEXLiquidityFailed();
    error MaxBuyExceeded();
    error SameBlockTrade();
    error PriceDeviation(
        address trader,
        bool isBuy,
        uint256 spotBefore,
        uint256 spotProjected,
        uint256 deviationBps
    );
    error SoftLaunchCapReached();

    // ========== MODIFIERS ==========

    modifier notGraduated() {
        if (isGraduated) revert AlreadyGraduated();
        _;
    }

    modifier onlyGraduated() {
        if (!isGraduated) revert NotGraduated();
        _;
    }

    // ========== CONSTRUCTOR ==========

    /**
     * @dev Constructor with comprehensive validation
     * @param _token Token address (cannot be zero)
     * @param _tokenCreator Address of token creator (receives graduation funds)
     * @param _basePrice Initial price (must be within bounds)
     * @param _slope Price increase per token (must be reasonable)
     * @param _curveType 0 for linear, 1 for exponential
     * @param _graduationThreshold Supply at which token graduates
     * @param _feeRecipient Address receiving platform fees (cannot be zero)
     * @param _membershipTier Tier level (0=Basic, 1=Premium, 2=Enterprise)
     * @param _dexRouter DEX router address for liquidity provision (cannot be zero)
     */
    constructor(
        address _token,
        address payable _tokenCreator,
        uint256 _basePrice,
        uint256 _slope,
        uint8 _curveType,
        uint256 _graduationThreshold,
        address payable _feeRecipient,
        uint8 _membershipTier,
        address _dexRouter,
        uint256 _sniperProtectionDuration,
        address payable _referrer
    ) Ownable(msg.sender) {
        // ========== CRITICAL: Comprehensive Input Validation ==========

        if (_token == address(0)) revert ZeroAddress();
        if (_tokenCreator == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_dexRouter == address(0)) revert ZeroAddress();
        if (_curveType > 1) revert InvalidCurveType();

        if (_basePrice < MIN_BASE_PRICE || _basePrice > MAX_BASE_PRICE) {
            revert InvalidParameter("basePrice");
        }

        if (_slope > MAX_SLOPE) {
            revert InvalidParameter("slope");
        }

        if (_graduationThreshold == 0 || _graduationThreshold > MAX_TOTAL_SUPPLY) {
            revert InvalidParameter("graduationThreshold");
        }

        if (_membershipTier > 2) {
            revert InvalidParameter("membershipTier");
        }

        // Set immutable variables
        token = IERC20(_token);
        tokenCreator = _tokenCreator;
        basePrice = _basePrice;
        slope = _slope;
        curveType = _curveType;
        graduationThreshold = _graduationThreshold;
        feeRecipient = _feeRecipient;
        membershipTier = _membershipTier;
        dexRouter = IPancakeRouter(_dexRouter);
        launchTimestamp = block.timestamp;
        sniperProtectionDuration = _sniperProtectionDuration > 0
            ? _sniperProtectionDuration
            : DEFAULT_SNIPER_DURATION;
        referrer = _referrer; // Can be address(0) if no referrer

        // Seed deviation guard with the initial spot price.
        lastTradePrice = _basePrice;
    }

    // ========== EXTERNAL FUNCTIONS ==========

    /**
     * @dev Buy tokens with native currency (ETH/BNB)
     * @param minTokensOut Minimum tokens to receive (slippage protection)
     *
     * SECURITY FIXES APPLIED:
     * - nonReentrant: Prevents reentrancy attacks
     * - whenNotPaused: Allows emergency stop
     * - Checks-Effects-Interactions pattern
     * - SafeERC20 for token transfer
     * - Address.sendValue for ETH transfer
     */
    function buyTokens(uint256 minTokensOut)
        external
        payable
        nonReentrant
        whenNotPaused
        notGraduated
    {
        // ========== CHECKS ==========

        if (msg.value == 0) revert InvalidAmount();

        // Snapshot pre-trade state. Fee derives from pre-trade supply only.
        uint256 supplyBefore = currentSupply;
        uint256 spotBefore = getCurrentPrice();

        // Soft-launch cap: partial-fill + refund instead of hard revert, so an
        // attacker cannot push the curve to one wei below the cap and grief
        // every subsequent buy.
        uint256 nativeAmount = msg.value;
        uint256 refundAmount = 0;
        uint256 cap = softLaunchCapNative;
        if (cap > 0) {
            if (totalNativeRaised >= cap) revert SoftLaunchCapReached();
            uint256 capRemaining = cap - totalNativeRaised;
            if (nativeAmount > capRemaining) {
                refundAmount = nativeAmount - capRemaining;
                nativeAmount = capRemaining;
            }
        }

        // Continuous fee decay against pre-trade supply.
        uint256 platformFee = _getFeeBps(supplyBefore);
        uint256 fee = (nativeAmount * platformFee) / 10000;
        uint256 nativeAfterFee = nativeAmount - fee;

        // Split fee: 50% to creator, 5% to referrer (if exists), rest to platform
        uint256 creatorCut = (fee * CREATOR_FEE_SHARE) / 10000;
        uint256 referrerCut = (referrer != address(0)) ? (fee * REFERRAL_TRADE_SHARE) / 10000 : 0;
        uint256 platformCut = fee - creatorCut - referrerCut;

        // Calculate tokens to mint based on curve
        uint256 tokensOut = calculateTokensOut(nativeAfterFee, supplyBefore);

        // Reject zero-output buys: when the soft-launch cap clamps nativeAmount
        // to a tiny remainder the curve math can return 0 tokens, and the
        // slippage check below permits this when minTokensOut == 0.
        if (tokensOut == 0) revert InvalidAmount();

        // Slippage protection
        if (tokensOut < minTokensOut) revert SlippageTooHigh();

        // Ensure AMM has enough tokens
        uint256 ammBalance = token.balanceOf(address(this));
        if (tokensOut > ammBalance) revert InsufficientBalance();

        // Anti-sniper guards (sniper window only).
        bool sniperActive = block.timestamp < launchTimestamp + sniperProtectionDuration;
        if (sniperActive) {
            uint256 remainingCurve = graduationThreshold > supplyBefore
                ? graduationThreshold - supplyBefore
                : 0;
            uint256 maxBuy = (remainingCurve * MAX_BUY_PER_TX_BPS) / 10000;
            if (tokensOut > maxBuy) revert MaxBuyExceeded();

            // Deviation guard: any single trade moving spot price > 50% vs the
            // last-trade snapshot is rejected during the sniper window.
            uint256 supplyAfter = supplyBefore + tokensOut;
            uint256 spotProjected = _spotPriceAtSupply(supplyAfter);
            uint256 ref = lastTradePrice;
            if (ref > 0) {
                uint256 diff = spotProjected > ref ? spotProjected - ref : ref - spotProjected;
                uint256 deviation = (diff * 10000) / ref;
                if (deviation > MAX_PRICE_DEVIATION_BPS) {
                    revert PriceDeviation(msg.sender, true, spotBefore, spotProjected, deviation);
                }
            }
        }

        // ========== EFFECTS ==========

        // Update state BEFORE external calls (prevents reentrancy)
        currentSupply = supplyBefore + tokensOut;
        totalVolume += nativeAmount;
        totalNativeRaised += nativeAmount;
        lastBuyBlock[msg.sender] = block.number;

        // Accumulate creator and referrer fees (pull pattern — safe)
        creatorAccumulatedFees += creatorCut;
        if (referrerCut > 0) {
            referrerAccumulatedFees += referrerCut;
        }

        // Check for graduation
        bool graduated = currentSupply >= graduationThreshold;

        // Refresh the deviation snapshot to the new post-trade spot price.
        uint256 priceAfter = getCurrentPrice();
        lastTradePrice = priceAfter;

        // ========== INTERACTIONS ==========

        // Safe token transfer to buyer
        token.safeTransfer(msg.sender, tokensOut);

        // Safe platform fee transfer (only platform's share)
        if (platformCut > 0) {
            feeRecipient.sendValue(platformCut);
        }

        // Soft-launch refund (after fee + token transfers, before graduation).
        // Emitting `msg.value` (= requested) explicitly alongside the clamped
        // `nativeAmount` (= accepted) makes ops dashboards' "real demand"
        // queries trivial without reconstructing requested off-chain.
        if (refundAmount > 0) {
            payable(msg.sender).sendValue(refundAmount);
            emit SoftLaunchCapHit(
                address(token),
                msg.sender,
                msg.value,
                nativeAmount,
                refundAmount
            );
        }

        // Handle graduation
        if (graduated && !isGraduated) {
            _graduateToken();
        }

        if (creatorCut > 0) {
            emit CreatorFeeAccumulated(tokenCreator, creatorCut, creatorAccumulatedFees);
        }
        if (referrerCut > 0) {
            emit ReferrerFeeAccumulated(referrer, referrerCut, referrerAccumulatedFees);
        }

        emit Trade(
            msg.sender,
            true, // isBuy
            nativeAmount,
            tokensOut,
            priceAfter,
            fee,
            block.timestamp
        );

        emit TradeExecuted(
            msg.sender,
            address(token),
            true,
            supplyBefore,
            currentSupply,
            nativeAmount,    // nativeGross: post-cap clamp, before fee
            nativeAfterFee,  // nativeNet: allocated to mint
            tokensOut,
            fee,
            platformFee,
            priceAfter
        );
    }

    /**
     * @dev Sell tokens for native currency
     * @param tokenAmount Amount of tokens to sell
     * @param minNativeOut Minimum native currency to receive
     *
     * SECURITY FIXES APPLIED:
     * - nonReentrant: Prevents reentrancy
     * - SafeERC20: Safe token transfers
     * - Address.sendValue: Safe ETH transfer
     * - Proper state updates before external calls
     */
    function sellTokens(uint256 tokenAmount, uint256 minNativeOut)
        external
        nonReentrant
        whenNotPaused
        notGraduated
    {
        // ========== CHECKS ==========

        if (tokenAmount == 0) revert InvalidAmount();
        if (tokenAmount > currentSupply) revert InvalidAmount();

        // Snapshot pre-trade state. Fee derives from pre-trade supply only.
        uint256 supplyBefore = currentSupply;
        uint256 spotBefore = getCurrentPrice();

        // Same-block anti-sandwich guard: only triggers when the same address
        // bought in this block AND either the sniper window is active OR the
        // sell is large (> SAME_BLOCK_LARGE_BPS of remaining curve supply).
        if (lastBuyBlock[msg.sender] == block.number) {
            bool sniperActive = block.timestamp < launchTimestamp + sniperProtectionDuration;
            uint256 remainingCurve = graduationThreshold > supplyBefore
                ? graduationThreshold - supplyBefore
                : 0;
            bool largeSell = remainingCurve > 0 &&
                tokenAmount * 10000 > remainingCurve * SAME_BLOCK_LARGE_BPS;
            if (sniperActive || largeSell) revert SameBlockTrade();
        }

        // Calculate native currency to return
        uint256 nativeOut = calculateNativeOut(tokenAmount, supplyBefore);

        // Continuous fee decay against pre-trade supply.
        uint256 platformFee = _getFeeBps(supplyBefore);
        uint256 fee = (nativeOut * platformFee) / 10000;
        uint256 nativeAfterFee = nativeOut - fee;

        // Split fee: 50% to creator, 5% to referrer (if exists), rest to platform
        uint256 creatorCut = (fee * CREATOR_FEE_SHARE) / 10000;
        uint256 referrerCut = (referrer != address(0)) ? (fee * REFERRAL_TRADE_SHARE) / 10000 : 0;
        uint256 platformCut = fee - creatorCut - referrerCut;

        // Slippage protection
        if (nativeAfterFee < minNativeOut) revert SlippageTooHigh();

        // Ensure contract has enough native currency (exclude reserved creator/referrer fees)
        uint256 reservedFees = creatorAccumulatedFees + referrerAccumulatedFees;
        uint256 availableLiquidity = address(this).balance - reservedFees;
        if (nativeOut > availableLiquidity) revert InsufficientBalance();

        // Deviation guard during sniper window (sells too).
        bool sniperActiveSell = block.timestamp < launchTimestamp + sniperProtectionDuration;
        if (sniperActiveSell) {
            uint256 supplyAfter = supplyBefore - tokenAmount;
            uint256 spotProjected = _spotPriceAtSupply(supplyAfter);
            uint256 ref = lastTradePrice;
            if (ref > 0) {
                uint256 diff = spotProjected > ref ? spotProjected - ref : ref - spotProjected;
                uint256 deviation = (diff * 10000) / ref;
                if (deviation > MAX_PRICE_DEVIATION_BPS) {
                    revert PriceDeviation(msg.sender, false, spotBefore, spotProjected, deviation);
                }
            }
        }

        // ========== EFFECTS ==========

        // Update state BEFORE external calls
        currentSupply = supplyBefore - tokenAmount;
        totalVolume += nativeOut;

        // Accumulate creator and referrer fees (pull pattern — safe)
        creatorAccumulatedFees += creatorCut;
        if (referrerCut > 0) {
            referrerAccumulatedFees += referrerCut;
        }

        uint256 priceAfter = getCurrentPrice();
        lastTradePrice = priceAfter;

        // ========== INTERACTIONS ==========

        // Safe token transfer FROM seller TO contract
        token.safeTransferFrom(msg.sender, address(this), tokenAmount);

        // Safe native currency transfer to seller
        payable(msg.sender).sendValue(nativeAfterFee);

        // Safe platform fee transfer (only platform's share)
        if (platformCut > 0) {
            feeRecipient.sendValue(platformCut);
        }

        if (creatorCut > 0) {
            emit CreatorFeeAccumulated(tokenCreator, creatorCut, creatorAccumulatedFees);
        }
        if (referrerCut > 0) {
            emit ReferrerFeeAccumulated(referrer, referrerCut, referrerAccumulatedFees);
        }

        emit Trade(
            msg.sender,
            false, // isSell
            nativeAfterFee,
            tokenAmount,
            priceAfter,
            fee,
            block.timestamp
        );

        emit TradeExecuted(
            msg.sender,
            address(token),
            false,
            supplyBefore,
            currentSupply,
            nativeOut,       // nativeGross: curve-computed, before fee
            nativeAfterFee,  // nativeNet: actually sent to seller
            tokenAmount,
            fee,
            platformFee,
            priceAfter
        );
    }

    /**
     * @dev Withdraw graduation funds (pull payment pattern)
     * SECURITY: Uses pull pattern instead of push to prevent DoS
     */
    function withdrawGraduationFunds() external nonReentrant onlyGraduated {
        uint256 amount = withdrawableGraduationFunds[msg.sender];

        if (amount == 0) revert NoWithdrawableFunds();

        // Effects before interactions
        withdrawableGraduationFunds[msg.sender] = 0;
        totalGraduationFunds -= amount;

        // Safe transfer
        payable(msg.sender).sendValue(amount);

        emit GraduationFundsWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Withdraw accumulated creator trading fees (pull payment pattern)
     * @notice Creator earns 50% of platform fees on every trade of their token
     */
    function withdrawCreatorFees() external nonReentrant {
        if (msg.sender != tokenCreator) revert NoWithdrawableFunds();
        uint256 amount = creatorAccumulatedFees;
        if (amount == 0) revert NoWithdrawableFunds();

        // Effects before interactions
        creatorAccumulatedFees = 0;

        // Safe transfer
        payable(msg.sender).sendValue(amount);

        emit CreatorFeesWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Withdraw accumulated referrer fees (pull payment pattern)
     * @notice Referrer earns 5% of platform fees on every trade
     */
    function withdrawReferrerFees() external nonReentrant {
        if (msg.sender != referrer) revert NoWithdrawableFunds();
        uint256 amount = referrerAccumulatedFees;
        if (amount == 0) revert NoWithdrawableFunds();

        // Effects before interactions
        referrerAccumulatedFees = 0;

        // Safe transfer
        payable(msg.sender).sendValue(amount);

        emit ReferrerFeesWithdrawn(msg.sender, amount);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @dev Calculate tokens received for given native amount
     * SECURITY FIX: Improved precision handling
     */
    function calculateTokensOut(uint256 nativeIn, uint256 supply) public view returns (uint256) {
        if (nativeIn == 0) return 0;

        if (curveType == 0) {
            // Linear curve
            return _calculateLinearTokensOut(nativeIn, supply);
        } else {
            // Exponential curve
            return _calculateExponentialTokensOut(nativeIn, supply);
        }
    }

    /**
     * @dev Calculate native currency received for given token amount
     */
    function calculateNativeOut(uint256 tokensIn, uint256 supply) public view returns (uint256) {
        if (tokensIn == 0) return 0;

        if (curveType == 0) {
            return _calculateLinearNativeOut(tokensIn, supply);
        } else {
            return _calculateExponentialNativeOut(tokensIn, supply);
        }
    }

    /**
     * @dev Get current price based on supply
     */
    function getCurrentPrice() public view returns (uint256) {
        if (curveType == 0) {
            // Linear: P = basePrice + (slope * supply / PRECISION)
            return basePrice + (slope * currentSupply) / PRECISION;
        } else {
            // Exponential approximation
            uint256 exponent = (slope * currentSupply) / PRECISION;
            if (exponent > 5 * PRECISION) exponent = 5 * PRECISION;

            uint256 expValue = PRECISION + exponent +
                              (exponent * exponent) / (2 * PRECISION);

            return (basePrice * expValue) / PRECISION;
        }
    }

    /**
     * @dev Get market cap in native currency (BNB/ETH)
     * @return Market cap as currentSupply * currentPrice / PRECISION
     */
    function getMarketCap() public view returns (uint256) {
        if (currentSupply == 0) return 0;
        return (currentSupply * getCurrentPrice()) / PRECISION;
    }

    /**
     * @dev Live trading fee in basis points, evaluated against current pre-trade supply.
     *
     * Fee = MAX_FEE_BPS - FEE_DECAY_RANGE_BPS * preTradeSupply / graduationThreshold,
     *       floor-clamped at MIN_FEE_BPS.
     * Anti-sniper surcharge is added on top during the protection window.
     */
    function getPlatformFee() public view returns (uint256) {
        return _getFeeBps(currentSupply);
    }

    /**
     * @dev Internal continuous fee schedule, parameterized by an explicit pre-trade
     * supply snapshot. Trade entry points snapshot supply before any state mutation
     * and pass it here, which prevents a buyer from lowering their own fee by
     * pushing supply forward in the same trade. Includes the anti-sniper surcharge.
     */
    function _getFeeBps(uint256 preTradeSupply) internal view returns (uint256) {
        uint256 baseFee;
        if (preTradeSupply >= graduationThreshold) {
            baseFee = MIN_FEE_BPS;
        } else {
            uint256 decay = (FEE_DECAY_RANGE_BPS * preTradeSupply) / graduationThreshold;
            baseFee = decay >= FEE_DECAY_RANGE_BPS
                ? MAX_FEE_BPS - FEE_DECAY_RANGE_BPS
                : MAX_FEE_BPS - decay;
            if (baseFee < MIN_FEE_BPS) baseFee = MIN_FEE_BPS;
        }
        return _applySniperSurcharge(baseFee);
    }

    function _applySniperSurcharge(uint256 baseFee) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - launchTimestamp;
        if (elapsed >= sniperProtectionDuration) {
            return baseFee;
        }
        uint256 remaining = sniperProtectionDuration - elapsed;
        uint256 sniperSurcharge = ((MAX_SNIPER_FEE - baseFee) * remaining) / sniperProtectionDuration;
        return baseFee + sniperSurcharge;
    }

    /**
     * @dev Spot price at a hypothetical supply, used by the deviation guard.
     * Mirrors the curve branches in `getCurrentPrice` without mutating state.
     */
    function _spotPriceAtSupply(uint256 supply) internal view returns (uint256) {
        if (curveType == 0) {
            return basePrice + (slope * supply) / PRECISION;
        }
        uint256 exponent = (slope * supply) / PRECISION;
        if (exponent > 5 * PRECISION) exponent = 5 * PRECISION;
        uint256 expValue = PRECISION + exponent + (exponent * exponent) / (2 * PRECISION);
        return (basePrice * expValue) / PRECISION;
    }

    /**
     * @dev Check if anti-sniper protection is still active
     */
    function isSniperProtectionActive() external view returns (bool) {
        return block.timestamp < launchTimestamp + sniperProtectionDuration;
    }

    /**
     * @dev Get remaining sniper protection time in seconds
     */
    function sniperProtectionRemaining() external view returns (uint256) {
        if (block.timestamp >= launchTimestamp + sniperProtectionDuration) return 0;
        return (launchTimestamp + sniperProtectionDuration) - block.timestamp;
    }

    /**
     * @dev Get trading information for UI
     */
    function getTradingInfo() external view returns (
        uint256 _currentSupply,
        uint256 _currentPrice,
        uint256 _totalVolume,
        uint256 _graduationProgress,
        bool _isGraduated
    ) {
        return (
            currentSupply,
            getCurrentPrice(),
            totalVolume,
            (currentSupply * 10000) / graduationThreshold,
            isGraduated
        );
    }

    /**
     * @dev Calculate price impact for a trade
     */
    function getPriceImpact(uint256 amount, bool isBuy) external view returns (uint256) {
        uint256 currentPrice = getCurrentPrice();
        if (currentPrice == 0) return 0;

        if (isBuy) {
            uint256 tokensOut = calculateTokensOut(amount, currentSupply);
            uint256 newSupply = currentSupply + tokensOut;
            uint256 newPrice;

            if (curveType == 0) {
                newPrice = basePrice + (slope * newSupply) / PRECISION;
            } else {
                uint256 exponent = (slope * newSupply) / PRECISION;
                newPrice = (basePrice * (PRECISION + exponent)) / PRECISION;
            }

            return ((newPrice - currentPrice) * 10000) / currentPrice;
        } else {
            if (amount > currentSupply) return 10000; // 100% impact

            uint256 newSupply = currentSupply - amount;
            uint256 newPrice;

            if (curveType == 0) {
                newPrice = basePrice + (slope * newSupply) / PRECISION;
            } else {
                uint256 exponent = (slope * newSupply) / PRECISION;
                newPrice = (basePrice * (PRECISION + exponent)) / PRECISION;
            }

            return ((currentPrice - newPrice) * 10000) / currentPrice;
        }
    }

    // ========== INTERNAL FUNCTIONS ==========

    /**
     * @dev Linear curve integration with improved precision
     * SECURITY FIX: Better precision handling, prevents loss
     */
    function _calculateLinearTokensOut(uint256 nativeIn, uint256 supply) internal view returns (uint256) {
        uint256 availableLiquidity = token.balanceOf(address(this));
        if (availableLiquidity == 0) {
            return 0;
        }

        uint256 maxDelta = availableLiquidity;
        if (supply + maxDelta > MAX_TOTAL_SUPPLY) {
            maxDelta = MAX_TOTAL_SUPPLY - supply;
        }

        uint256 currentCost = _linearCumulativeCost(supply);
        uint256 low = 0;
        uint256 high = maxDelta;

        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            uint256 targetCost = _linearCumulativeCost(supply + mid) - currentCost;

            if (targetCost <= nativeIn) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return low;
    }

    function _calculateLinearNativeOut(uint256 tokensIn, uint256 supply) internal view returns (uint256) {
        if (tokensIn > supply) {
            return 0;
        }

        uint256 costAtSupply = _linearCumulativeCost(supply);
        uint256 costAfter = _linearCumulativeCost(supply - tokensIn);

        return costAtSupply - costAfter;
    }

    function _linearCumulativeCost(uint256 supply) internal view returns (uint256) {
        if (supply == 0) {
            return 0;
        }

        uint256 baseComponent = Math.mulDiv(basePrice, supply, PRECISION);
        uint256 squaredSupply = Math.mulDiv(supply, supply, PRECISION);
        uint256 slopeComponent = Math.mulDiv(slope, squaredSupply, 2 * PRECISION);

        return baseComponent + slopeComponent;
    }

    /**
     * @dev Exponential curve: Calculate tokens out for given native input
     * Uses binary search with exponential cumulative cost
     */
    function _calculateExponentialTokensOut(uint256 nativeIn, uint256 supply) internal view returns (uint256) {
        uint256 availableLiquidity = token.balanceOf(address(this));
        if (availableLiquidity == 0) {
            return 0;
        }

        uint256 maxDelta = availableLiquidity;
        if (supply + maxDelta > MAX_TOTAL_SUPPLY) {
            maxDelta = MAX_TOTAL_SUPPLY - supply;
        }

        uint256 currentCost = _exponentialCumulativeCost(supply);
        uint256 low = 0;
        uint256 high = maxDelta;

        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            uint256 targetCost = _exponentialCumulativeCost(supply + mid) - currentCost;

            if (targetCost <= nativeIn) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return low;
    }

    /**
     * @dev Exponential curve: Calculate native out for given tokens
     */
    function _calculateExponentialNativeOut(uint256 tokensIn, uint256 supply) internal view returns (uint256) {
        if (tokensIn > supply) {
            return 0;
        }

        uint256 costAtSupply = _exponentialCumulativeCost(supply);
        uint256 costAfter = _exponentialCumulativeCost(supply - tokensIn);

        return costAtSupply - costAfter;
    }

    /**
     * @dev Calculate cumulative cost for exponential curve
     * Exponential formula: P(s) = basePrice * e^(slope * s / PRECISION)
     * Integral: C(s) = (basePrice * PRECISION / slope) * (e^(slope * s / PRECISION) - 1)
     * Using Taylor series approximation for e^x: 1 + x + x^2/2 + x^3/6 (safe for small x)
     */
    function _exponentialCumulativeCost(uint256 supply) internal view returns (uint256) {
        if (supply == 0) {
            return 0;
        }

        // Calculate exponent: slope * supply / PRECISION
        uint256 exponent = Math.mulDiv(slope, supply, PRECISION);

        // Cap exponent to prevent overflow (e^5 ≈ 148, which is reasonable)
        if (exponent > 5 * PRECISION) {
            exponent = 5 * PRECISION;
        }

        // Taylor series approximation: e^x ≈ 1 + x + x^2/2 + x^3/6
        // For precision, multiply terms by PRECISION
        uint256 x = exponent;
        uint256 x2 = Math.mulDiv(x, x, PRECISION);
        uint256 x3 = Math.mulDiv(x2, x, PRECISION);

        // e^x - 1 ≈ x + x^2/2 + x^3/6
        uint256 expMinusOne = x + x2 / 2 + x3 / 6;

        // Cumulative cost: (basePrice * PRECISION / slope) * (e^x - 1)
        // Rewritten to avoid division issues: (basePrice * expMinusOne) / slope
        if (slope == 0) {
            // If slope is 0, fall back to linear
            return Math.mulDiv(basePrice, supply, PRECISION);
        }

        return Math.mulDiv(basePrice, expMinusOne, slope);
    }

    /**
     * @dev Graduate token - Automatic DEX liquidity provision with LP locking
     * @notice AUTOMATED DEX INTEGRATION:
     *  - 70% of funds → DEX liquidity (LP tokens locked 6 months)
     *  - 20% of funds → Creator (withdrawable)
     *  - 10% of funds → Platform (immediate transfer)
     */
    function _graduateToken() internal {
        isGraduated = true;

        // Exclude accumulated creator/referrer fees from graduation split
        uint256 reservedFees = creatorAccumulatedFees + referrerAccumulatedFees;
        uint256 contractBalance = address(this).balance - reservedFees;

        // ECONOMIC MODEL: Three-way split for automated DEX liquidity
        uint256 liquidityAmount = (contractBalance * DEX_LIQUIDITY_PERCENT) / 100; // 70%
        uint256 creatorShare = (contractBalance * CREATOR_PERCENT) / 100; // 20%
        uint256 platformShare = (contractBalance * PLATFORM_PERCENT) / 100; // 10%

        // Track creator-withdrawable amount
        totalGraduationFunds = creatorShare;
        withdrawableGraduationFunds[tokenCreator] = creatorShare;

        // Transfer platform share immediately (safe, trusted recipient)
        feeRecipient.sendValue(platformShare);

        // AUTOMATED LIQUIDITY PROVISION to DEX
        _addLiquidityToDEX(liquidityAmount);

        emit GraduationFundsSplit(
            creatorShare,
            platformShare,
            tokenCreator,
            feeRecipient
        );

        emit Graduated(
            currentSupply,
            contractBalance,
            block.timestamp
        );
    }

    /**
     * @dev Add liquidity to DEX and lock LP tokens
     * @param nativeAmount Amount of native currency to add
     * SECURITY: Uses try/catch to prevent graduation DoS on DEX failure
     */
    function _addLiquidityToDEX(uint256 nativeAmount) internal {
        // Get all remaining tokens in AMM
        uint256 tokenAmount = token.balanceOf(address(this));

        if (tokenAmount == 0 || nativeAmount == 0) {
            // If no tokens/native, skip DEX integration (shouldn't happen in normal flow)
            return;
        }

        // Approve router to spend tokens
        token.safeIncreaseAllowance(address(dexRouter), tokenAmount);

        // Calculate minimum amounts (5% slippage tolerance)
        uint256 minTokenAmount = (tokenAmount * (100 - DEX_SLIPPAGE_TOLERANCE)) / 100;
        uint256 minNativeAmount = (nativeAmount * (100 - DEX_SLIPPAGE_TOLERANCE)) / 100;

        try dexRouter.addLiquidityETH{value: nativeAmount}(
            address(token),
            tokenAmount,
            minTokenAmount,
            minNativeAmount,
            address(this), // LP tokens sent to this contract (will be locked)
            block.timestamp + 300 // 5 minute deadline
        ) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
            // Get LP token address from factory
            address weth = dexRouter.WETH();
            address factory = dexRouter.factory();
            address lpToken = IPancakeFactory(factory).getPair(address(token), weth);

            // Store LP token info
            lpTokenAddress = lpToken;
            lpTokensLocked = liquidity;
            lpUnlockTime = block.timestamp + LP_LOCK_DURATION; // 6 months from now

            emit LiquidityAdded(
                amountToken,
                amountETH,
                liquidity,
                lpToken,
                lpToken
            );

            emit LPTokensLocked(
                liquidity,
                lpUnlockTime,
                lpToken
            );
        } catch {
            // If DEX liquidity fails, don't revert graduation
            // Funds remain in contract for emergency withdrawal
            // This prevents DoS attacks on graduation
            emit LiquidityProvisionFailed(nativeAmount, block.timestamp);
        }
    }

    /**
     * @dev Withdraw LP tokens after lock period expires
     * @notice Only token creator can withdraw, and only after 6 months
     * SECURITY: Time-locked to prevent rug pulls
     */
    function withdrawLPTokens() external nonReentrant {
        // Only creator can withdraw
        if (msg.sender != tokenCreator) revert NoWithdrawableFunds();

        // Check if tokens are still locked
        if (block.timestamp < lpUnlockTime) revert LPTokensStillLocked();

        // Check if there are LP tokens to withdraw
        if (lpTokensLocked == 0) revert NoLPTokensToWithdraw();

        uint256 amount = lpTokensLocked;
        address lpToken = lpTokenAddress;

        // Effects before interactions
        lpTokensLocked = 0;

        // Transfer LP tokens to creator using SafeERC20
        IERC20(lpToken).safeTransfer(tokenCreator, amount);

        emit LPTokensWithdrawn(tokenCreator, amount, lpToken);
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @dev Set or clear the soft-launch cap on cumulative gross native raised.
     * Cap = 0 disables the gate. Intended to be raised on mainnet day-one and
     * cleared (set to 0) by ops after the 48h soft-launch window if no incidents.
     */
    function setSoftLaunchCap(uint256 newCap) external onlyOwner {
        uint256 oldCap = softLaunchCapNative;
        softLaunchCapNative = newCap;
        emit SoftLaunchCapUpdated(oldCap, newCap);
    }

    /**
     * @dev Emergency pause trading
     * @notice Only owner can pause. Use in case of discovered vulnerability.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause trading
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw (only if critical bug discovered)
     * @param reason Reason for emergency withdrawal (for transparency)
     */
    function emergencyWithdraw(string calldata reason) external onlyOwner whenPaused {
        uint256 reservedFees = creatorAccumulatedFees + referrerAccumulatedFees;
        uint256 withdrawable = address(this).balance > reservedFees
            ? address(this).balance - reservedFees
            : 0;

        emit EmergencyWithdraw(owner(), withdrawable, reason);

        if (withdrawable > 0) {
            payable(owner()).sendValue(withdrawable);
        }
    }

    /**
     * @dev Receive function to accept ETH/BNB
     */
    receive() external payable {}
}
