// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPancakeRouter.sol";
import "./libraries/BondingCurveMath.sol";
import "./CreatorVesting.sol";

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
    address payable public immutable feeRecipient;
    uint8 public immutable membershipTier; // For tiered fees
    IPancakeRouter public immutable dexRouter; // DEX router for liquidity provision

    // V2: total supply, graduation threshold, and the curve shape itself are
    // standardized across every token — see BondingCurveMath. Per-token curve
    // parameters (basePrice / slope / curveType) are gone.

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

    // ========== EXPLICIT GRADUATION ACCOUNTING (PR 3) ==========
    //
    // Native that has flowed into the curve and not yet been redirected (sells,
    // refunds, fee payouts, graduation distribution). Maintained explicitly so
    // graduation accounting never reads `address(this).balance` blindly — that
    // would conflate accumulated creator/referrer fees, in-flight refunds, and
    // any stray native (selfdestruct beneficiary, etc.) with the curve's own
    // proceeds.
    //
    // Invariant: address(this).balance ==
    //     curveNativeBalance
    //   + creatorAccumulatedFees + referrerAccumulatedFees
    //   + totalGraduationFunds
    // (any leftover beyond these buckets is ignored on purpose).
    uint256 public curveNativeBalance;

    // Address of the per-token CreatorVesting contract deployed at graduation.
    // Zero until graduation; set inside `_graduateToken`.
    address public creatorVesting;

    // Timestamp-based vesting duration for the creator's allocation.
    uint256 public constant VESTING_DURATION_SECONDS = 180 days;

    // Token allocation at graduation (of the 200M post-curve remainder).
    // Mirrors the native split, see plan §5a.
    uint256 public constant LP_TOKEN_BPS = 7000;        // 70%
    uint256 public constant VESTING_TOKEN_BPS = 2000;   // 20%
    // Treasury token allocation = remainder (10%) — implicit from the above.

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

    // PR 3 — graduation correctness surface.
    //
    // `nativeUsedForLP` and `tokensUsedForLP` are the amounts the DEX
    // actually consumed (not the planned earmarks). `lpAdded == false`
    // means LP was skipped (pair pre-polluted, DEX failure, or zero
    // amounts) and the earmarked native + tokens were routed to treasury.
    event GraduationTriggered(
        address indexed token,
        uint256 finalSupply,
        uint256 finalPrice,
        bool lpAdded,
        uint256 nativeTargetForLP,
        uint256 tokensTargetForLP,
        uint256 nativeUsedForLP,
        uint256 tokensUsedForLP
    );

    // Emitted when graduation finds a pre-existing token/WETH pair that
    // already has non-zero reserves. The AMM refuses to add liquidity to a
    // polluted pool; the LP earmark instead rolls into treasury. Front-end
    // and ops can show this distinctively.
    event LiquidityPairPrePolluted(address indexed pair);

    event GraduationOverpaymentRefunded(
        address indexed buyer,
        uint256 requestedNative,
        uint256 acceptedNative,
        uint256 refundedNative
    );

    event CreatorVestingCreated(
        address indexed token,
        address indexed creator,
        address indexed vestingContract,
        uint256 totalAmount,
        uint256 startTime,
        uint256 endTime
    );

    event TreasuryAllocated(
        address indexed recipient,
        uint256 nativeAmount,
        uint256 tokenAmount
    );

    // ========== CUSTOM ERRORS ==========

    error InvalidAmount();
    error SlippageTooHigh();
    error AlreadyGraduated();
    error NotGraduated();
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
     * @dev Constructor — V2 sigmoid curve. Per-token curve params are gone:
     * `BondingCurveMath.TOTAL_SUPPLY` and `BondingCurveMath.GRADUATION_THRESHOLD`
     * are fixed protocol-wide and the spot price comes from the standardized
     * 31-anchor sigmoid table.
     *
     * @param _token Token address (cannot be zero)
     * @param _tokenCreator Address of token creator (receives graduation funds)
     * @param _feeRecipient Address receiving platform fees (cannot be zero)
     * @param _membershipTier Tier level (0=Basic, 1=Premium, 2=Enterprise)
     * @param _dexRouter DEX router address for liquidity provision (cannot be zero)
     */
    constructor(
        address _token,
        address payable _tokenCreator,
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

        if (_membershipTier > 2) {
            revert InvalidParameter("membershipTier");
        }

        // Set immutable variables
        token = IERC20(_token);
        tokenCreator = _tokenCreator;
        feeRecipient = _feeRecipient;
        membershipTier = _membershipTier;
        dexRouter = IPancakeRouter(_dexRouter);
        launchTimestamp = block.timestamp;
        sniperProtectionDuration = _sniperProtectionDuration > 0
            ? _sniperProtectionDuration
            : DEFAULT_SNIPER_DURATION;
        referrer = _referrer; // Can be address(0) if no referrer

        // Seed deviation guard with the spot price at supply 0.
        lastTradePrice = BondingCurveMath.getPriceSigmoid(0);
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
        uint256 softLaunchRefund = 0;
        uint256 graduationRefund = 0;
        uint256 cap = softLaunchCapNative;
        if (cap > 0) {
            if (totalNativeRaised >= cap) revert SoftLaunchCapReached();
            uint256 capRemaining = cap - totalNativeRaised;
            if (nativeAmount > capRemaining) {
                softLaunchRefund = nativeAmount - capRemaining;
                nativeAmount = capRemaining;
            }
        }
        // After soft-launch clamp; before graduation clamp.
        uint256 acceptedAfterSoftLaunch = nativeAmount;

        // Continuous fee decay against pre-trade supply.
        uint256 platformFee = _getFeeBps(supplyBefore);

        // PR 3 — Graduation overpayment clamp. Plan §5b / acceptance criteria
        // §1: a graduation buy consumes only the exact gross native needed to
        // reach GRADUATION_THRESHOLD; any excess is refunded in the same tx.
        // Without this clamp, leftover net would silently fold into the
        // graduation funds split (LP / creator / treasury) and distort LP
        // price continuity at the seam.
        {
            uint256 threshold = BondingCurveMath.GRADUATION_THRESHOLD;
            if (threshold > supplyBefore) {
                uint256 requiredNet = BondingCurveMath.costToBuy(supplyBefore, threshold);
                uint256 estNet = nativeAmount - (nativeAmount * platformFee) / 10000;
                if (estNet >= requiredNet) {
                    // The buyer is paying for >= the full remaining curve.
                    // Compute the exact gross required and refund the rest.
                    uint256 denom = 10000 - platformFee;
                    // Ceiling division: requiredGross * (10000 - feeBps) / 10000
                    // is guaranteed >= requiredNet so post-fee net always
                    // covers the full integral to threshold.
                    uint256 requiredGross = denom == 0
                        ? nativeAmount
                        : (requiredNet * 10000 + denom - 1) / denom;
                    if (nativeAmount > requiredGross) {
                        graduationRefund = nativeAmount - requiredGross;
                        nativeAmount = requiredGross;
                    }
                }
            }
        }

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
            uint256 threshold = BondingCurveMath.GRADUATION_THRESHOLD;
            uint256 remainingCurve = threshold > supplyBefore
                ? threshold - supplyBefore
                : 0;
            uint256 maxBuy = (remainingCurve * MAX_BUY_PER_TX_BPS) / 10000;
            if (tokensOut > maxBuy) revert MaxBuyExceeded();

            // Deviation guard: any single trade moving spot price > 50% vs the
            // last-trade snapshot is rejected during the sniper window.
            uint256 supplyAfter = supplyBefore + tokensOut;
            uint256 spotProjected = spotPriceAtSupply(supplyAfter);
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
        // PR 3 — explicit accounting. The buyer's net (post-fee) is the only
        // native that belongs to the curve; fees go to their own buckets.
        curveNativeBalance += nativeAfterFee;
        lastBuyBlock[msg.sender] = block.number;

        // Accumulate creator and referrer fees (pull pattern — safe)
        creatorAccumulatedFees += creatorCut;
        if (referrerCut > 0) {
            referrerAccumulatedFees += referrerCut;
        }

        // Check for graduation
        bool graduated = currentSupply >= BondingCurveMath.GRADUATION_THRESHOLD;

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

        // Combined refund (soft-launch overflow + graduation overpayment).
        // Emit one event per refund cause so ops can distinguish them.
        uint256 totalRefund = softLaunchRefund + graduationRefund;
        if (totalRefund > 0) {
            payable(msg.sender).sendValue(totalRefund);
            if (softLaunchRefund > 0) {
                emit SoftLaunchCapHit(
                    address(token),
                    msg.sender,
                    msg.value,
                    acceptedAfterSoftLaunch,
                    softLaunchRefund
                );
            }
            if (graduationRefund > 0) {
                emit GraduationOverpaymentRefunded(
                    msg.sender,
                    acceptedAfterSoftLaunch,
                    nativeAmount,
                    graduationRefund
                );
            }
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
            uint256 threshold = BondingCurveMath.GRADUATION_THRESHOLD;
            uint256 remainingCurve = threshold > supplyBefore
                ? threshold - supplyBefore
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

        // PR 3 — sell-side liquidity check is anchored on `curveNativeBalance`
        // (the explicit accounting var) rather than `address(this).balance`
        // minus fee buckets. That's safer because stray ETH (selfdestruct
        // beneficiary, etc.) cannot make the looser check pass and then
        // trigger an arithmetic panic when `curveNativeBalance -= nativeOut`
        // runs in the effects block. With the explicit var, the user-facing
        // error is `InsufficientBalance` exactly as intended.
        if (nativeOut > curveNativeBalance) revert InsufficientBalance();

        // Deviation guard during sniper window (sells too).
        bool sniperActiveSell = block.timestamp < launchTimestamp + sniperProtectionDuration;
        if (sniperActiveSell) {
            uint256 supplyAfter = supplyBefore - tokenAmount;
            uint256 spotProjected = spotPriceAtSupply(supplyAfter);
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
        // PR 3 — explicit accounting: gross native leaves the curve on a sell.
        // The fee on it is split into accumulator buckets / sent to platform
        // by the interaction block below; the seller pockets nativeAfterFee.
        curveNativeBalance -= nativeOut;

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
     * @dev Calculate tokens received for given native amount.
     * Pure pass-through to the standardized sigmoid library.
     */
    function calculateTokensOut(uint256 nativeIn, uint256 supply) public pure returns (uint256) {
        if (nativeIn == 0) return 0;
        return BondingCurveMath.tokensForNative(nativeIn, supply);
    }

    /**
     * @dev Calculate native currency received for given token amount.
     */
    function calculateNativeOut(uint256 tokensIn, uint256 supply) public pure returns (uint256) {
        if (tokensIn == 0 || tokensIn > supply) return 0;
        return BondingCurveMath.proceedsFromSell(supply, supply - tokensIn);
    }

    /**
     * @dev Get current spot price (wei per full token) at the live supply.
     */
    function getCurrentPrice() public view returns (uint256) {
        return BondingCurveMath.getPriceSigmoid(currentSupply);
    }

    /**
     * @dev Standardized graduation threshold exposed for read compat with
     * older clients that read it off the AMM. Returns the library constant.
     */
    function graduationThreshold() public pure returns (uint256) {
        return BondingCurveMath.GRADUATION_THRESHOLD;
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
        uint256 threshold = BondingCurveMath.GRADUATION_THRESHOLD;
        uint256 baseFee;
        if (preTradeSupply >= threshold) {
            baseFee = MIN_FEE_BPS;
        } else {
            uint256 decay = (FEE_DECAY_RANGE_BPS * preTradeSupply) / threshold;
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
     * @dev Spot price at a hypothetical supply. Used by the deviation guard
     * internally and exposed externally as a pure diagnostic so UIs and
     * indexers can render "what would the price be at X supply?" without
     * mutating state, and so anchor-table regression tests can pin every
     * row of the table from outside the contract.
     */
    function spotPriceAtSupply(uint256 supply) public pure returns (uint256) {
        return BondingCurveMath.getPriceSigmoid(supply);
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
            (currentSupply * 10000) / BondingCurveMath.GRADUATION_THRESHOLD,
            isGraduated
        );
    }

    /**
     * @dev Calculate price impact for a trade, in basis points.
     */
    function getPriceImpact(uint256 amount, bool isBuy) external view returns (uint256) {
        uint256 currentPrice = getCurrentPrice();
        if (currentPrice == 0) return 0;

        uint256 newSupply;
        if (isBuy) {
            uint256 tokensOut = calculateTokensOut(amount, currentSupply);
            newSupply = currentSupply + tokensOut;
        } else {
            if (amount > currentSupply) return 10000; // 100% impact
            newSupply = currentSupply - amount;
        }
        uint256 newPrice = BondingCurveMath.getPriceSigmoid(newSupply);

        if (isBuy) {
            return newPrice > currentPrice
                ? ((newPrice - currentPrice) * 10000) / currentPrice
                : 0;
        }
        return currentPrice > newPrice
            ? ((currentPrice - newPrice) * 10000) / currentPrice
            : 0;
    }

    /**
     * @dev Graduate token — PR 3 explicit-accounting rebuild.
     *
     * Invariants this function preserves (see plan §5 / PR 3 acceptance
     * criteria):
     *  1. The graduation buyer never overpays — guaranteed upstream by
     *     the graduation overpayment clamp in `buyTokens`. Here we just
     *     use the explicit `curveNativeBalance` instead of
     *     `address(this).balance`, which would conflate accumulated
     *     creator/referrer fee buckets and any stray native.
     *  2. LP starts at the final sigmoid spot price within ≤0.1% — the
     *     LP token / native ratio is computed from `finalPrice` directly,
     *     not from a "70% of native" target that would float with how
     *     much excess native happened to be in the contract.
     *  3. Of the remaining 200M unsold tokens: 70% → LP, 20% → vesting,
     *     10% → treasury. Tokens that can't be paired with native at
     *     finalPrice spill into treasury (token side), never the native
     *     side; we never fabricate native and never create a mismatched LP.
     *  4. CreatorVesting drips linearly per block over 6 months, cliff at
     *     graduation block.
     *
     * Fee buckets (creatorAccumulatedFees, referrerAccumulatedFees) are
     * untouched here — those are pull-payment buckets settled separately.
     */
    function _graduateToken() internal {
        isGraduated = true;

        uint256 nativeAvailable = curveNativeBalance;
        uint256 finalPrice = BondingCurveMath.getPriceSigmoid(
            BondingCurveMath.GRADUATION_THRESHOLD
        );
        uint256 remainingSupply = BondingCurveMath.TOTAL_SUPPLY -
            BondingCurveMath.GRADUATION_THRESHOLD;

        // Token allocation — 70% LP / 20% vesting / 10% treasury.
        uint256 tokensForLPTarget = (remainingSupply * LP_TOKEN_BPS) / 10000;
        uint256 tokensForVesting = (remainingSupply * VESTING_TOKEN_BPS) / 10000;
        uint256 tokensForTreasury =
            remainingSupply - tokensForLPTarget - tokensForVesting;

        // Price-continuous LP sizing. nativeForLP = tokensForLP × finalPrice
        // (units: token × wei/token = wei). If we don't have enough native to
        // pair the full 70% of tokens at finalPrice, we shrink tokens (never
        // native) and roll the difference to the treasury allocation.
        uint256 nativeForLPRequired = (tokensForLPTarget * finalPrice) / PRECISION;

        uint256 tokensForLP;
        uint256 nativeForLP;
        if (nativeForLPRequired <= nativeAvailable) {
            tokensForLP = tokensForLPTarget;
            nativeForLP = nativeForLPRequired;
        } else {
            // Native shortfall path: fit tokens to available native at finalPrice.
            nativeForLP = nativeAvailable;
            tokensForLP = (nativeForLP * PRECISION) / finalPrice;
            tokensForTreasury += tokensForLPTarget - tokensForLP;
        }

        uint256 nativeRemaining = nativeAvailable - nativeForLP;
        // Mirror plan §5a's 20:10 native split. Anchored on the surplus that
        // remained after the price-continuous LP draw, not on raw 70/20/10 of
        // total raise — that decoupling is necessary because the LP draw is
        // sized by curve geometry, not by a percentage of native.
        uint256 creatorNative = (nativeRemaining * 2) / 3;
        uint256 treasuryNative = nativeRemaining - creatorNative;

        // ===== EFFECTS (state) =====
        curveNativeBalance = 0;
        totalGraduationFunds = creatorNative;
        withdrawableGraduationFunds[tokenCreator] = creatorNative;

        // ===== INTERACTIONS =====
        // 1) Creator vesting — deploy + fund. CreatorVesting holds the
        //    20%-of-remainder allocation and drips it linearly per block.
        CreatorVesting vesting = new CreatorVesting(
            address(token),
            tokenCreator,
            tokensForVesting,
            block.timestamp,
            VESTING_DURATION_SECONDS
        );
        creatorVesting = address(vesting);
        if (tokensForVesting > 0) {
            token.safeTransfer(address(vesting), tokensForVesting);
        }
        emit CreatorVestingCreated(
            address(token),
            tokenCreator,
            address(vesting),
            tokensForVesting,
            block.timestamp,
            block.timestamp + VESTING_DURATION_SECONDS
        );

        // 2) Treasury token allocation. PR 3 minimal: feeRecipient acts as
        //    the treasury sink; a dedicated Treasury vault contract gets
        //    plugged in here in a later PR without further AMM changes.
        if (tokensForTreasury > 0) {
            token.safeTransfer(feeRecipient, tokensForTreasury);
        }

        // 3) DEX liquidity. Wrapped so a DEX hiccup doesn't brick graduation.
        //    On failure (DEX revert, polluted pre-existing pair, or zero
        //    earmarks), the LP-earmarked native + tokens roll into treasury.
        //    On partial consumption (router used less than offered), the
        //    leftover native + tokens also roll into treasury — never left
        //    untracked in the AMM.
        (
            bool lpAdded,
            uint256 lpNativeUsed,
            uint256 lpTokenUsed,
            uint256 lpNativeRefund,
            uint256 lpTokenRefund
        ) = _addLiquidityToDEX(nativeForLP, tokensForLP);

        if (!lpAdded) {
            treasuryNative += nativeForLP;
            if (tokensForLP > 0) {
                token.safeTransfer(feeRecipient, tokensForLP);
            }
        } else {
            if (lpNativeRefund > 0) {
                treasuryNative += lpNativeRefund;
            }
            if (lpTokenRefund > 0) {
                token.safeTransfer(feeRecipient, lpTokenRefund);
            }
        }

        // 4) Treasury native push.
        if (treasuryNative > 0) {
            feeRecipient.sendValue(treasuryNative);
        }
        emit TreasuryAllocated(
            feeRecipient,
            treasuryNative,
            tokensForTreasury + (lpAdded ? lpTokenRefund : tokensForLP)
        );

        // Legacy events kept for indexer compat.
        emit GraduationFundsSplit(
            creatorNative,
            treasuryNative,
            tokenCreator,
            feeRecipient
        );
        emit Graduated(currentSupply, nativeAvailable, block.timestamp);

        // V2 structured event. Carries both target (planned) and actual
        // (router-consumed) amounts so dashboards can show whether
        // graduation truly produced liquidity.
        emit GraduationTriggered(
            address(token),
            currentSupply,
            finalPrice,
            lpAdded,
            nativeForLP,
            tokensForLP,
            lpNativeUsed,
            lpTokenUsed
        );
    }

    /**
     * @dev Add liquidity to the DEX with explicit token + native amounts.
     * Returns (success, nativeRefund) where nativeRefund is the portion of
     * the offered native the DEX did not consume (handled by the caller —
     * PR 3 routes it to the treasury, never leaves it untracked).
     * SECURITY: try/catch prevents a DEX failure from bricking graduation.
     */
    function _addLiquidityToDEX(uint256 nativeAmount, uint256 tokenAmount)
        internal
        returns (
            bool success,
            uint256 nativeUsed,
            uint256 tokenUsed,
            uint256 nativeRefund,
            uint256 tokenRefund
        )
    {
        if (tokenAmount == 0 || nativeAmount == 0) {
            // Nothing to LP. Caller's `if (!lpAdded)` branch then folds the
            // earmarked native + tokens into treasury, so signaling false
            // keeps accounting honest even in the degenerate case.
            return (false, 0, 0, 0, 0);
        }

        // Pre-seeded pair defense. If the token/WETH pair already exists
        // with non-zero reserves (someone front-ran with dust), refuse to
        // pair our LP against an arbitrary external ratio. The earmarked
        // native + tokens roll to treasury via the caller's failure branch.
        // V1 policy: empty pair required for clean migration.
        address weth = dexRouter.WETH();
        address factoryAddr = dexRouter.factory();
        address existingPair = IPancakeFactory(factoryAddr).getPair(address(token), weth);
        if (existingPair != address(0)) {
            (uint112 r0, uint112 r1, ) = IPancakePair(existingPair).getReserves();
            if (r0 != 0 || r1 != 0) {
                emit LiquidityPairPrePolluted(existingPair);
                return (false, 0, 0, 0, 0);
            }
        }

        token.safeIncreaseAllowance(address(dexRouter), tokenAmount);
        uint256 minTokenAmount = (tokenAmount * (100 - DEX_SLIPPAGE_TOLERANCE)) / 100;
        uint256 minNativeAmount = (nativeAmount * (100 - DEX_SLIPPAGE_TOLERANCE)) / 100;

        try dexRouter.addLiquidityETH{value: nativeAmount}(
            address(token),
            tokenAmount,
            minTokenAmount,
            minNativeAmount,
            address(this),
            block.timestamp + 300
        ) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
            address lpToken = IPancakeFactory(factoryAddr).getPair(address(token), weth);

            lpTokenAddress = lpToken;
            lpTokensLocked = liquidity;
            lpUnlockTime = block.timestamp + LP_LOCK_DURATION;

            emit LiquidityAdded(amountToken, amountETH, liquidity, lpToken, lpToken);
            emit LPTokensLocked(liquidity, lpUnlockTime, lpToken);

            success = true;
            nativeUsed = amountETH;
            tokenUsed = amountToken;
            nativeRefund = nativeAmount - amountETH;
            tokenRefund = tokenAmount - amountToken;
        } catch {
            emit LiquidityProvisionFailed(nativeAmount, block.timestamp);
            // Default zero return values already signal "nothing used,
            // nothing refunded by the router" — caller routes the full
            // earmark to treasury.
        }

        // Reset router allowance whether the call succeeded or failed. If
        // the router consumed less than approved (partial fill or revert),
        // leftover allowance is unnecessary attack surface — even against a
        // trusted router, post-graduation the AMM should hold no live
        // approvals. forceApprove handles non-zero->zero safely on tokens
        // that require zero-then-set approve sequencing (USDT, etc.).
        token.forceApprove(address(dexRouter), 0);
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
    // ========== LEGACY COMPATIBILITY GETTERS ==========
    // Preserved for subgraph/indexer compatibility with V1 surfaces.
    function basePrice() external pure returns (uint256) {
        return BondingCurveMath.getPriceSigmoid(0);
    }

    function slope() external pure returns (uint256) {
        return 0;
    }

    function curveType() external pure returns (uint8) {
        return 2; // V2 sigmoid
    }
