// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DexConfig
 * @dev Library for managing DEX router addresses across different chains
 * @notice Provides chain-specific V2-compatible router addresses for automated liquidity
 */
library DexConfig {
    /**
     * @dev Get DEX router address for current chain
     * @param chainId The blockchain chain ID
     * @return router Address of the DEX router contract
     *
     * Chain IDs:
     * - 56: BSC Mainnet
     * - 97: BSC Testnet
     * - 42161: Arbitrum One (Uniswap V2 Router)
     * - 8453: Base (BaseSwap V2 Router)
     */
    function getRouterAddress(uint256 chainId) internal pure returns (address router) {
        // BSC Mainnet - PancakeSwap V2
        if (chainId == 56) {
            return 0x10ED43C718714eb63d5aA57B78B54704E256024E;
        }

        // BSC Testnet - PancakeSwap V2 Testnet
        if (chainId == 97) {
            return 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;
        }

        // Arbitrum One - Uniswap V2 Router
        if (chainId == 42161) {
            return 0x4752ba5dBc23f44D87826276BF6Fd6b1C372aD24;
        }

        // Base Mainnet - BaseSwap V2 Router
        if (chainId == 8453) {
            return 0x327Df1E6de05895d2ab08513aaDD9313Fe505d86;
        }

        // Unsupported chain - revert
        revert("DexConfig: Unsupported chain");
    }

    /**
     * @dev Get factory address for current chain
     * @param chainId The blockchain chain ID
     * @return factory Address of the DEX factory contract
     */
    function getFactoryAddress(uint256 chainId) internal pure returns (address factory) {
        // BSC Mainnet - PancakeSwap V2
        if (chainId == 56) {
            return 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
        }

        // BSC Testnet - PancakeSwap V2 Testnet
        if (chainId == 97) {
            return 0x6725F303b657a9451d8BA641348b6761A6CC7a17;
        }

        // Arbitrum/Base factory addresses are discovered via router.factory()
        // to avoid hardcoding chain-specific V2 factories in this library.
        return address(0);
    }

    /**
     * @dev Check if chain is supported
     * @param chainId The blockchain chain ID
     * @return supported True if chain has DEX router configured
     */
    function isChainSupported(uint256 chainId) internal pure returns (bool supported) {
        return
            chainId == 56 ||   // BSC Mainnet
            chainId == 97 ||   // BSC Testnet
            chainId == 42161 || // Arbitrum One
            chainId == 8453;   // Base
    }

    /**
     * @dev Get chain name for logging/events
     * @param chainId The blockchain chain ID
     * @return name Human-readable chain name
     */
    function getChainName(uint256 chainId) internal pure returns (string memory name) {
        if (chainId == 56) return "BSC Mainnet";
        if (chainId == 97) return "BSC Testnet";
        if (chainId == 42161) return "Arbitrum One";
        if (chainId == 421614) return "Arbitrum Sepolia";
        if (chainId == 8453) return "Base";
        if (chainId == 84532) return "Base Sepolia";
        return "Unknown Chain";
    }
}
