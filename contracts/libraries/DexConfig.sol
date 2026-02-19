// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDexRouterRegistry.sol";

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

    /**
     * @dev Get default RouterConfig for a given chain
     * @param chainId The blockchain chain ID
     * @return config RouterConfig with V2 router, WBNB/WETH, and enabled flag
     *
     * Wrapped native tokens:
     * - BSC: WBNB 0xbb4CdB9CBd36B01bD1cbaebF2De08d9173bc095c
     * - BSC Testnet: WBNB 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd
     * - Arbitrum: WETH 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
     * - Arbitrum Sepolia: WETH 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73
     * - Base: WETH 0x4200000000000000000000000000000000000006
     * - Base Sepolia: WETH 0x4200000000000000000000000000000000000006
     */
    function getDefaultRouterConfig(uint256 chainId)
        internal
        pure
        returns (IDexRouterRegistry.RouterConfig memory config)
    {
        // BSC Mainnet - PancakeSwap V2
        if (chainId == 56) {
            return IDexRouterRegistry.RouterConfig({
                routerType: IDexRouterRegistry.RouterType.V2,
                router: 0x10ED43C718714eb63d5aA57B78B54704E256024E,
                positionManager: address(0),
                wrappedNative: 0xbb4CdB9CBd36B01bD1cbaebF2De08d9173bc095c,
                fee: 0,
                enabled: true
            });
        }

        // BSC Testnet - PancakeSwap V2
        if (chainId == 97) {
            return IDexRouterRegistry.RouterConfig({
                routerType: IDexRouterRegistry.RouterType.V2,
                router: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1,
                positionManager: address(0),
                wrappedNative: 0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd,
                fee: 0,
                enabled: true
            });
        }

        // Arbitrum One - Uniswap V2 (Camelot-compatible)
        if (chainId == 42161) {
            return IDexRouterRegistry.RouterConfig({
                routerType: IDexRouterRegistry.RouterType.V2,
                router: 0x4752ba5dBc23f44D87826276BF6Fd6b1C372aD24,
                positionManager: address(0),
                wrappedNative: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
                fee: 0,
                enabled: true
            });
        }

        // Arbitrum Sepolia - no established V2 router, disabled by default
        if (chainId == 421614) {
            return IDexRouterRegistry.RouterConfig({
                routerType: IDexRouterRegistry.RouterType.V2,
                router: address(0),
                positionManager: address(0),
                wrappedNative: 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73,
                fee: 0,
                enabled: false
            });
        }

        // Base Mainnet - BaseSwap V2
        if (chainId == 8453) {
            return IDexRouterRegistry.RouterConfig({
                routerType: IDexRouterRegistry.RouterType.V2,
                router: 0x327Df1E6de05895d2ab08513aaDD9313Fe505d86,
                positionManager: address(0),
                wrappedNative: 0x4200000000000000000000000000000000000006,
                fee: 0,
                enabled: true
            });
        }

        // Base Sepolia - no established V2 router, disabled by default
        if (chainId == 84532) {
            return IDexRouterRegistry.RouterConfig({
                routerType: IDexRouterRegistry.RouterType.V2,
                router: address(0),
                positionManager: address(0),
                wrappedNative: 0x4200000000000000000000000000000000000006,
                fee: 0,
                enabled: false
            });
        }

        // Unsupported chain - return disabled config
        return IDexRouterRegistry.RouterConfig({
            routerType: IDexRouterRegistry.RouterType.V2,
            router: address(0),
            positionManager: address(0),
            wrappedNative: address(0),
            fee: 0,
            enabled: false
        });
    }
}
