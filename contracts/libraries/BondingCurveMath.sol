// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BondingCurveMath — sigmoid bonding curve via piecewise-linear anchors
 *
 * Standardized sigmoid for V2: a single curve shape across every token, with
 * fixed total supply, fixed graduation threshold, and a pre-computed 31-point
 * anchor table biased toward the high-curvature midpoint. Runtime cost is
 * dominated by ~6-10 anchor reads + a few mulDiv interpolations per trade.
 *
 * Anchor table:
 *   - generated off-chain by `scripts/generate-sigmoid-anchors.js`
 *   - sigmoid params: a = 7.5 gwei, s0 = 400M tokens, k = 7.5e-9
 *   - calibrated for ~3 ETH raise at graduation
 *   - 31 anchors at fixed, non-uniform supply percentages
 *     (0,4,8,12,16,20, 23,26,...,77, 80,84,88,92,96,100)
 *
 * Storage choice: Solidity ^0.8.20 does not support `uint256[N] constant`
 * initializers, so the table lives inside three internal-pure helpers
 * (`_anchorSupply` / `_anchorPrice` / `_anchorIntegral`). Solc lowers each
 * to a jump table; observed cost is ~200-400 gas per access.
 *
 * Pricing approximation error is ~0.1-0.3% versus the true sigmoid — well
 * below the per-trade fee (10-100 bps) and invisible to users.
 */
library BondingCurveMath {

    // ========== FIXED CURVE PARAMETERS ==========

    uint256 internal constant PRECISION = 1e18;

    /// 1 billion tokens, 18 decimals.
    uint256 internal constant TOTAL_SUPPLY = 1_000_000_000 * PRECISION;
    /// 80% of TOTAL_SUPPLY — supply at which the curve graduates to a DEX LP.
    uint256 internal constant GRADUATION_THRESHOLD = 800_000_000 * PRECISION;

    // Region boundaries used by `_findSegment`. Derived from the anchor pcts:
    // low tail = [0%, 20%) with 4% stride; mid = [20%, 80%) with 3% stride;
    // high tail = [80%, 100%] with 4% stride.
    uint256 private constant LOW_REGION_END = 160_000_000 * PRECISION;        // 20% of THRESHOLD
    uint256 private constant HIGH_REGION_START = 640_000_000 * PRECISION;     // 80% of THRESHOLD
    uint256 private constant LOW_STRIDE = 32_000_000 * PRECISION;             // 4% of THRESHOLD
    uint256 private constant MID_STRIDE = 24_000_000 * PRECISION;             // 3% of THRESHOLD
    uint256 private constant HIGH_STRIDE = 32_000_000 * PRECISION;            // 4% of THRESHOLD

    uint256 private constant LAST_IDX = 30;

    // ========== ERRORS ==========

    error SupplyOutOfRange();
    error InverseInsufficientLiquidity();

    // ========== PUBLIC SURFACE ==========

    /// Spot price (wei per full token) at the given supply (token-wei).
    function getPriceSigmoid(uint256 supply) internal pure returns (uint256) {
        if (supply > GRADUATION_THRESHOLD) revert SupplyOutOfRange();
        if (supply == GRADUATION_THRESHOLD) return _anchorPrice(LAST_IDX);

        (uint256 idxLo, uint256 idxHi, uint256 sLo, uint256 sHi) = _findSegment(supply);
        uint256 pLo = _anchorPrice(idxLo);
        uint256 pHi = _anchorPrice(idxHi);
        return _interpolate(supply, sLo, sHi, pLo, pHi);
    }

    /// Cumulative cost (wei) to move supply from `sFrom` to `sTo`. Caller
    /// guarantees `sTo >= sFrom`. Both must be `<= GRADUATION_THRESHOLD`.
    function costToBuy(uint256 sFrom, uint256 sTo) internal pure returns (uint256) {
        if (sTo == sFrom) return 0;
        return _integralAt(sTo) - _integralAt(sFrom);
    }

    /// Native proceeds (wei) from selling `sFrom - sTo` tokens-worth of curve
    /// supply. Caller guarantees `sFrom >= sTo`.
    function proceedsFromSell(uint256 sFrom, uint256 sTo) internal pure returns (uint256) {
        if (sFrom == sTo) return 0;
        return _integralAt(sFrom) - _integralAt(sTo);
    }

    /// Inverse: how many token-wei can a buyer mint by depositing `nativeIn`
    /// wei when the curve is currently at `currentSupply`. Returns 0 if the
    /// trade would graduate; caller is responsible for clamping.
    ///
    /// Within our piecewise-linear approximation the integral is exact-linear
    /// inside a segment, so a single linear inversion per crossed segment is
    /// already within the table's intrinsic 0.1-0.3% sigmoid-approximation
    /// error. No Newton refinement needed.
    function tokensForNative(uint256 nativeIn, uint256 currentSupply)
        internal pure returns (uint256)
    {
        if (nativeIn == 0) return 0;
        if (currentSupply >= GRADUATION_THRESHOLD) revert SupplyOutOfRange();

        uint256 currentIntegral = _integralAt(currentSupply);
        uint256 targetIntegral = currentIntegral + nativeIn;
        uint256 capIntegral = _anchorIntegral(LAST_IDX);
        if (targetIntegral > capIntegral) {
            // Buyer is paying past graduation. Caller is expected to clamp
            // upstream (max-buy-per-tx, soft-launch cap, or graduation
            // gate). Return the remaining curve supply as a safe upper.
            return GRADUATION_THRESHOLD - currentSupply;
        }

        // Walk forward from the current segment until the target integral
        // falls inside [I_lo, I_hi]. Bounded by LAST_IDX iterations.
        (uint256 idxLo, uint256 idxHi, uint256 sLo, uint256 sHi) = _findSegment(currentSupply);
        uint256 iLo = _anchorIntegral(idxLo);
        uint256 iHi = _anchorIntegral(idxHi);

        while (targetIntegral > iHi && idxHi < LAST_IDX) {
            idxLo = idxHi;
            idxHi = idxHi + 1;
            sLo = sHi;
            sHi = _anchorSupply(idxHi);
            iLo = iHi;
            iHi = _anchorIntegral(idxHi);
        }

        // Linear inversion inside the bracketing segment.
        if (iHi == iLo) revert InverseInsufficientLiquidity();
        uint256 supplyAtTarget = _interpolate(targetIntegral, iLo, iHi, sLo, sHi);
        if (supplyAtTarget <= currentSupply) return 0;
        return supplyAtTarget - currentSupply;
    }

    // ========== INTERNAL HELPERS ==========

    function _integralAt(uint256 supply) private pure returns (uint256) {
        if (supply == 0) return 0;
        if (supply >= GRADUATION_THRESHOLD) return _anchorIntegral(LAST_IDX);
        (uint256 idxLo, uint256 idxHi, uint256 sLo, uint256 sHi) = _findSegment(supply);
        uint256 iLo = _anchorIntegral(idxLo);
        uint256 iHi = _anchorIntegral(idxHi);
        return _interpolate(supply, sLo, sHi, iLo, iHi);
    }

    /// Linear interpolation: y at x given (xLo, yLo) and (xHi, yHi). xHi > xLo.
    function _interpolate(
        uint256 x,
        uint256 xLo,
        uint256 xHi,
        uint256 yLo,
        uint256 yHi
    ) private pure returns (uint256) {
        if (x <= xLo) return yLo;
        if (x >= xHi) return yHi;
        // yHi >= yLo for both supply→price and supply→integral (monotone),
        // and the function is also used for integral→supply where the same
        // monotonicity holds.
        uint256 dy = yHi - yLo;
        uint256 dx = xHi - xLo;
        return yLo + (dy * (x - xLo)) / dx;
    }

    /// Bounded region lookup: returns the bracketing anchor pair for `supply`.
    /// Each region uses a single index-math op (no binary search).
    function _findSegment(uint256 supply)
        private pure
        returns (uint256 idxLo, uint256 idxHi, uint256 sLo, uint256 sHi)
    {
        if (supply >= GRADUATION_THRESHOLD) {
            idxLo = LAST_IDX - 1;
            idxHi = LAST_IDX;
        } else if (supply < LOW_REGION_END) {
            idxLo = supply / LOW_STRIDE;
            idxHi = idxLo + 1;
        } else if (supply < HIGH_REGION_START) {
            idxLo = 5 + (supply - LOW_REGION_END) / MID_STRIDE;
            idxHi = idxLo + 1;
        } else {
            idxLo = 25 + (supply - HIGH_REGION_START) / HIGH_STRIDE;
            if (idxLo >= LAST_IDX) {
                idxLo = LAST_IDX - 1;
            }
            idxHi = idxLo + 1;
        }
        sLo = _anchorSupply(idxLo);
        sHi = _anchorSupply(idxHi);
    }

    // ========== ANCHOR TABLE ==========
    //
    // Generated by scripts/generate-sigmoid-anchors.js.
    // Sigmoid params: a=7.5e9 wei, s0=400M tokens, k=7.5e-9 (|k·s0|≈3).
    // Supply values are token-wei; price is wei per full token; integral is
    // cumulative cost in wei from supply 0 to anchor.

    function _anchorSupply(uint256 idx) private pure returns (uint256) {
        if (idx == 0)  return 0;
        if (idx == 1)  return 32_000_000_000_000_000_000_000_000;
        if (idx == 2)  return 64_000_000_000_000_000_000_000_000;
        if (idx == 3)  return 96_000_000_000_000_000_000_000_000;
        if (idx == 4)  return 128_000_000_000_000_000_000_000_000;
        if (idx == 5)  return 160_000_000_000_000_000_000_000_000;
        if (idx == 6)  return 184_000_000_000_000_000_000_000_000;
        if (idx == 7)  return 208_000_000_000_000_000_000_000_000;
        if (idx == 8)  return 232_000_000_000_000_000_000_000_000;
        if (idx == 9)  return 256_000_000_000_000_000_000_000_000;
        if (idx == 10) return 280_000_000_000_000_000_000_000_000;
        if (idx == 11) return 304_000_000_000_000_000_000_000_000;
        if (idx == 12) return 328_000_000_000_000_000_000_000_000;
        if (idx == 13) return 352_000_000_000_000_000_000_000_000;
        if (idx == 14) return 376_000_000_000_000_000_000_000_000;
        if (idx == 15) return 400_000_000_000_000_000_000_000_000;
        if (idx == 16) return 424_000_000_000_000_000_000_000_000;
        if (idx == 17) return 448_000_000_000_000_000_000_000_000;
        if (idx == 18) return 472_000_000_000_000_000_000_000_000;
        if (idx == 19) return 496_000_000_000_000_000_000_000_000;
        if (idx == 20) return 520_000_000_000_000_000_000_000_000;
        if (idx == 21) return 544_000_000_000_000_000_000_000_000;
        if (idx == 22) return 568_000_000_000_000_000_000_000_000;
        if (idx == 23) return 592_000_000_000_000_000_000_000_000;
        if (idx == 24) return 616_000_000_000_000_000_000_000_000;
        if (idx == 25) return 640_000_000_000_000_000_000_000_000;
        if (idx == 26) return 672_000_000_000_000_000_000_000_000;
        if (idx == 27) return 704_000_000_000_000_000_000_000_000;
        if (idx == 28) return 736_000_000_000_000_000_000_000_000;
        if (idx == 29) return 768_000_000_000_000_000_000_000_000;
        if (idx == 30) return 800_000_000_000_000_000_000_000_000;
        revert SupplyOutOfRange();
    }

    function _anchorPrice(uint256 idx) private pure returns (uint256) {
        if (idx == 0)  return 355694049;
        if (idx == 1)  return 446432745;
        if (idx == 2)  return 558509589;
        if (idx == 3)  return 695947148;
        if (idx == 4)  return 863000490;
        if (idx == 5)  return 1063882987;
        if (idx == 6)  return 1239036526;
        if (idx == 7)  return 1436590114;
        if (idx == 8)  return 1657304192;
        if (idx == 9)  return 1901295125;
        if (idx == 10) return 2168751291;
        if (idx == 11) return 2458618028;
        if (idx == 12) return 2768349064;
        if (idx == 13) return 3094711574;
        if (idx == 14) return 3433717537;
        if (idx == 15) return 3780617345;
        if (idx == 16) return 4130032012;
        if (idx == 17) return 4476237717;
        if (idx == 18) return 4813548876;
        if (idx == 19) return 5136809396;
        if (idx == 20) return 5440963474;
        if (idx == 21) return 5721632688;
        if (idx == 22) return 5975710722;
        if (idx == 23) return 6201810822;
        if (idx == 24) return 6400636771;
        if (idx == 25) return 6573817013;
        if (idx == 26) return 6804052852;
        if (idx == 27) return 6941490411;
        if (idx == 28) return 7053567255;
        if (idx == 29) return 7144305951;
        if (idx == 30) return 7144305951;
        revert SupplyOutOfRange();
    }

    function _anchorIntegral(uint256 idx) private pure returns (uint256) {
        if (idx == 0)  return 0;
        if (idx == 1)  return 12782186473941490;
        if (idx == 2)  return 28799160841759904;
        if (idx == 3)  return 48797226737053448;
        if (idx == 4)  return 73655688684692368;
        if (idx == 5)  return 104390258952215856;
        if (idx == 6)  return 131981586183148448;
        if (idx == 7)  return 164043339712302048;
        if (idx == 8)  return 201123367618982624;
        if (idx == 9)  return 243780370290064032;
        if (idx == 10) return 292566523157607808;
        if (idx == 11) return 348006695405528192;
        if (idx == 12) return 410575384695971008;
        if (idx == 13) return 480673097455105536;
        if (idx == 14) return 558604373265354496;
        if (idx == 15) return 644559828984289536;
        if (idx == 16) return 738604373264901888;
        if (idx == 17) return 840673097454215808;
        if (idx == 18) return 950575384694711936;
        if (idx == 19) return 1068006695403950080;
        if (idx == 20) return 1192566523155813120;
        if (idx == 21) return 1323780370288100864;
        if (idx == 22) return 1461123367616989696;
        if (idx == 23) return 1604043339710323968;
        if (idx == 24) return 1751981586181260288;
        if (idx == 25) return 1904390258950487296;
        if (idx == 26) return 2113655688683293440;
        if (idx == 27) return 2328797226735944704;
        if (idx == 28) return 2548799160840977408;
        if (idx == 29) return 2772782186473543168;
        if (idx == 30) return 2999999999999945216;
        revert SupplyOutOfRange();
    }
}
