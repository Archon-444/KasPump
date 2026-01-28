// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDexRouterRegistry
 * @dev Registry interface for chain-specific DEX router configuration
 * @notice Supports both V2-style routers and Uniswap V3 position managers
 */
interface IDexRouterRegistry {
    enum RouterType {
        V2,
        V3
    }

    struct RouterConfig {
        RouterType routerType;
        address router; // V2 router or V3 swap router (optional)
        address positionManager; // V3 NonfungiblePositionManager
        address wrappedNative; // WETH/WBNB for the chain
        uint24 fee; // V3 fee tier (e.g., 500, 3000, 10000)
        bool enabled;
    }

    function getRouterConfig(uint256 chainId) external view returns (RouterConfig memory);

    function isChainSupported(uint256 chainId) external view returns (bool);
}
