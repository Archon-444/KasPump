// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DexConfig
 * @dev Library for managing DEX router addresses across different chains
 * @notice Provides chain-specific DEX router addresses for automated liquidity
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
     * - 42161: Arbitrum One
     * - 421614: Arbitrum Sepolia
     * - 8453: Base
     * - 84532: Base Sepolia
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

        // Arbitrum One - Uniswap V3 SwapRouter
        if (chainId == 42161) {
            return 0xE592427A0AEce92De3Edee1F18E0157C05861564;
        }

        // Arbitrum Sepolia - Uniswap V3 SwapRouter
        if (chainId == 421614) {
            return 0xE592427A0AEce92De3Edee1F18E0157C05861564;
        }

        // Base Mainnet - Uniswap V3 SwapRouter
        if (chainId == 8453) {
            return 0x2626664c2603336E57B271c5C0b26F421741e481;
        }

        // Base Sepolia - Uniswap V3 SwapRouter
        if (chainId == 84532) {
            return 0x2626664c2603336E57B271c5C0b26F421741e481;
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

        // Arbitrum One - Uniswap V3
        if (chainId == 42161) {
            return 0x1F98431c8aD98523631AE4a59f267346ea31F984;
        }

        // Arbitrum Sepolia - Uniswap V3
        if (chainId == 421614) {
            return 0x1F98431c8aD98523631AE4a59f267346ea31F984;
        }

        // Base Mainnet - Uniswap V3
        if (chainId == 8453) {
            return 0x33128a8fC17869897dcE68Ed026d694621f6FDfD;
        }

        // Base Sepolia - Uniswap V3
        if (chainId == 84532) {
            return 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
        }

        // Unsupported chain - revert
        revert("DexConfig: Unsupported chain");
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
            chainId == 421614 || // Arbitrum Sepolia
            chainId == 8453 ||  // Base
            chainId == 84532;   // Base Sepolia
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
