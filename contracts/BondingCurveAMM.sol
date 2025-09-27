// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BondingCurveAMM
 * @dev Automated Market Maker with bonding curve pricing for KasPump tokens
 */
contract BondingCurveAMM {
    // Token and curve configuration
    address public immutable token;
    uint256 public immutable basePrice;
    uint256 public immutable slope;
    uint8 public immutable curveType; // 0 = LINEAR, 1 = EXPONENTIAL  
    uint256 public immutable graduationThreshold;
    address public immutable feeRecipient;
    
    // State variables
    uint256 public currentSupply;
    uint256 public totalVolume;
    bool public isGraduated;
    
    // Constants
    uint256 public constant PRECISION = 1e18;
    uint256 public constant PLATFORM_FEE = 50; // 0.5% in basis points
    uint256 public constant MAX_SLIPPAGE = 1000; // 10% maximum slippage
    
    // Events
    event Trade(
        address indexed trader,
        bool indexed isBuy,
        uint256 kasAmount,
        uint256 tokenAmount,
        uint256 newPrice,
        uint256 fee
    );
    
    event Graduated(
        uint256 finalSupply,
        uint256 kasReserve,
        uint256 timestamp
    );
    
    // Custom errors
    error InsufficientAmount();
    error SlippageTooHigh();
    error AlreadyGraduated();
    error InvalidCurveType();
    error TransferFailed();

    modifier notGraduated() {
        if (isGraduated) revert AlreadyGraduated();
        _;
    }

    constructor(
        address _token,
        uint256 _basePrice,
        uint256 _slope,
        uint8 _curveType,
        uint256 _graduationThreshold,
        address _feeRecipient
    ) {
        if (_curveType > 1) revert InvalidCurveType();
        
        token = _token;
        basePrice = _basePrice;
        slope = _slope;
        curveType = _curveType;
        graduationThreshold = _graduationThreshold;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Buy tokens with KAS using bonding curve pricing
     */
    function buyTokens(uint256 minTokensOut) external payable notGraduated {
        if (msg.value == 0) revert InsufficientAmount();
        
        uint256 kasAmount = msg.value;
        uint256 fee = (kasAmount * PLATFORM_FEE) / 10000;
        uint256 kasAfterFee = kasAmount - fee;
        
        // Calculate tokens to mint based on curve
        uint256 tokensOut = calculateTokensOut(kasAfterFee, currentSupply);
        if (tokensOut < minTokensOut) revert SlippageTooHigh();
        
        // Update state
        currentSupply += tokensOut;
        totalVolume += kasAmount;
        
        // Check for graduation
        if (currentSupply >= graduationThreshold) {
            _graduateToken();
        }
        
        // Transfer tokens to buyer
        if (!IKRC20(token).transfer(msg.sender, tokensOut)) {
            revert TransferFailed();
        }
        
        // Send fee
        if (fee > 0) {
            (bool success, ) = feeRecipient.call{value: fee}("");
            if (!success) revert TransferFailed();
        }
        
        emit Trade(
            msg.sender,
            true,
            kasAmount,
            tokensOut,
            getCurrentPrice(),
            fee
        );
    }

    /**
     * @dev Sell tokens for KAS using bonding curve pricing
     */
    function sellTokens(uint256 tokenAmount, uint256 minKasOut) external notGraduated {
        if (tokenAmount == 0) revert InsufficientAmount();
        if (tokenAmount > currentSupply) revert InsufficientAmount();
        
        // Calculate KAS to return based on curve
        uint256 kasOut = calculateKasOut(tokenAmount, currentSupply);
        uint256 fee = (kasOut * PLATFORM_FEE) / 10000;
        uint256 kasAfterFee = kasOut - fee;
        
        if (kasAfterFee < minKasOut) revert SlippageTooHigh();
        
        // Transfer tokens from seller
        if (!IKRC20(token).transferFrom(msg.sender, address(this), tokenAmount)) {
            revert TransferFailed();
        }
        
        // Update state
        currentSupply -= tokenAmount;
        totalVolume += kasOut;
        
        // Send KAS to seller
        (bool success, ) = msg.sender.call{value: kasAfterFee}("");
        if (!success) revert TransferFailed();
        
        // Send fee
        if (fee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            if (!feeSuccess) revert TransferFailed();
        }
        
        emit Trade(
            msg.sender,
            false,
            kasAfterFee,
            tokenAmount,
            getCurrentPrice(),
            fee
        );
    }

    /**
     * @dev Calculate tokens received for given KAS amount
     */
    function calculateTokensOut(uint256 kasIn, uint256 supply) public view returns (uint256) {
        if (curveType == 0) {
            // Linear curve: P = basePrice + (slope * supply)
            // Numerical integration for tokens out
            return _integrateLinearCurve(kasIn, supply, true);
        } else {
            // Exponential curve: P = basePrice * e^(slope * supply)
            return _integrateExponentialCurve(kasIn, supply, true);
        }
    }

    /**
     * @dev Calculate KAS received for given token amount
     */
    function calculateKasOut(uint256 tokensIn, uint256 supply) public view returns (uint256) {
        if (curveType == 0) {
            return _integrateLinearCurve(tokensIn, supply, false);
        } else {
            return _integrateExponentialCurve(tokensIn, supply, false);
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
            // Exponential: P = basePrice * e^(slope * supply / PRECISION)
            // Approximation: e^x ≈ 1 + x + x²/2 + x³/6 for small x
            uint256 exponent = (slope * currentSupply) / PRECISION;
            if (exponent > 5 * PRECISION) exponent = 5 * PRECISION; // Cap to prevent overflow
            
            uint256 expValue = PRECISION + exponent + 
                              (exponent * exponent) / (2 * PRECISION) +
                              (exponent * exponent * exponent) / (6 * PRECISION * PRECISION);
            
            return (basePrice * expValue) / PRECISION;
        }
    }

    /**
     * @dev Internal function for linear curve integration
     */
    function _integrateLinearCurve(
        uint256 amount,
        uint256 supply,
        bool isBuying
    ) internal view returns (uint256) {
        if (isBuying) {
            // Buying: given KAS, find tokens
            // Solve: kasIn = tokens * (2 * basePrice + slope * (2 * supply + tokens)) / (2 * PRECISION)
            // Approximation with fixed steps for accuracy
            uint256 steps = 100;
            uint256 stepSize = amount / steps;
            uint256 tokens = 0;
            uint256 currentS = supply;
            
            for (uint256 i = 0; i < steps; i++) {
                uint256 price = basePrice + (slope * currentS) / PRECISION;
                uint256 tokensInStep = (stepSize * PRECISION) / price;
                tokens += tokensInStep;
                currentS += tokensInStep;
            }
            
            return tokens;
        } else {
            // Selling: given tokens, find KAS
            uint256 steps = 100;
            uint256 stepSize = amount / steps;
            uint256 kasOut = 0;
            uint256 currentS = supply;
            
            for (uint256 i = 0; i < steps; i++) {
                uint256 price = basePrice + (slope * currentS) / PRECISION;
                kasOut += (stepSize * price) / PRECISION;
                currentS -= stepSize;
            }
            
            return kasOut;
        }
    }

    /**
     * @dev Internal function for exponential curve integration (simplified)
     */
    function _integrateExponentialCurve(
        uint256 amount,
        uint256 supply,
        bool isBuying
    ) internal view returns (uint256) {
        // Simplified exponential integration
        // For now, use linear approximation with higher slope
        return _integrateLinearCurve(amount, supply, isBuying);
    }

    /**
     * @dev Graduate token to traditional AMM
     */
    function _graduateToken() internal {
        isGraduated = true;
        
        emit Graduated(
            currentSupply,
            address(this).balance,
            block.timestamp
        );
        
        // Future: Create Uniswap V2/V3 pair and add liquidity
        // This would involve deploying a pair contract and transferring
        // the remaining token supply + KAS reserves as initial liquidity
    }

    /**
     * @dev Get trading information for UI
     */
    function getTradingInfo() external view returns (
        uint256 _currentSupply,
        uint256 _currentPrice,
        uint256 _totalVolume,
        uint256 _graduation,
        bool _isGraduated
    ) {
        return (
            currentSupply,
            getCurrentPrice(),
            totalVolume,
            (currentSupply * 10000) / graduationThreshold, // Progress in basis points
            isGraduated
        );
    }

    /**
     * @dev Calculate price impact for a trade
     */
    function getPriceImpact(uint256 amount, bool isBuy) external view returns (uint256) {
        uint256 currentPrice = getCurrentPrice();
        
        if (isBuy) {
            uint256 tokensOut = calculateTokensOut(amount, currentSupply);
            uint256 newSupply = currentSupply + tokensOut;
            uint256 newPrice = getCurrentPrice() + (slope * tokensOut) / PRECISION;
            
            if (currentPrice == 0) return 0;
            return ((newPrice - currentPrice) * 10000) / currentPrice; // In basis points
        } else {
            uint256 newSupply = currentSupply - amount;
            uint256 newPrice;
            
            if (curveType == 0) {
                newPrice = basePrice + (slope * newSupply) / PRECISION;
            } else {
                // Exponential approximation
                uint256 exponent = (slope * newSupply) / PRECISION;
                newPrice = (basePrice * (PRECISION + exponent)) / PRECISION;
            }
            
            if (currentPrice == 0) return 0;
            return ((currentPrice - newPrice) * 10000) / currentPrice; // In basis points
        }
    }

    receive() external payable {}
}

/**
 * @dev Interface for KRC20 token interactions
 */
interface IKRC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
