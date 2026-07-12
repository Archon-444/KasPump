// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDexRouterRegistry
 * @dev Registry interface for chain-specific DEX router configuration
 * @notice Configures the V2-style router used for graduation liquidity on each chain
 */
interface IDexRouterRegistry {
    struct RouterConfig {
        address router; // V2 router used for addLiquidityETH
        address wrappedNative; // WETH/WBNB for the chain
        bool enabled;
    }

    function getRouterConfig(uint256 chainId) external view returns (RouterConfig memory);

    function isChainSupported(uint256 chainId) external view returns (bool);
}
