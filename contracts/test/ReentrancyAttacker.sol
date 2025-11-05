// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBondingCurveAMM {
    function buyTokens(uint256 minTokensOut) external payable;
    function sellTokens(uint256 tokenAmount, uint256 minNativeOut) external;
}

/**
 * @title ReentrancyAttacker
 * @dev Malicious contract for testing reentrancy protection
 * @notice FOR TESTING ONLY - DO NOT DEPLOY TO MAINNET
 */
contract ReentrancyAttacker {
    IBondingCurveAMM public amm;
    uint256 public attackCount;
    uint256 public maxAttacks = 3;
    bool public attacking = false;

    constructor(address _amm) {
        amm = IBondingCurveAMM(_amm);
    }

    /**
     * @dev Initiate reentrancy attack
     */
    function attack() external payable {
        require(msg.value > 0, "Need ETH to attack");
        attacking = true;
        attackCount = 0;

        // Start attack by buying tokens
        amm.buyTokens{value: msg.value}(0);
    }

    /**
     * @dev Receive function that attempts reentrancy
     */
    receive() external payable {
        if (attacking && attackCount < maxAttacks) {
            attackCount++;
            // Try to reenter buyTokens
            amm.buyTokens{value: msg.value / 2}(0);
        }
    }

    /**
     * @dev Fallback function that attempts reentrancy
     */
    fallback() external payable {
        if (attacking && attackCount < maxAttacks) {
            attackCount++;
            // Try to reenter buyTokens
            amm.buyTokens{value: msg.value / 2}(0);
        }
    }

    /**
     * @dev Stop attacking
     */
    function stopAttack() external {
        attacking = false;
    }
}
