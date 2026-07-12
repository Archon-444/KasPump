// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDexRouterRegistry.sol";

contract MockDexRouterRegistry is IDexRouterRegistry {
    mapping(uint256 => RouterConfig) private configs;

    function setConfig(
        uint256 chainId,
        address router,
        address wrappedNative,
        bool enabled
    ) external {
        configs[chainId] = RouterConfig({
            router: router,
            wrappedNative: wrappedNative,
            enabled: enabled
        });
    }

    function getRouterConfig(uint256 chainId) external view returns (RouterConfig memory) {
        return configs[chainId];
    }

    function isChainSupported(uint256 chainId) external view returns (bool) {
        RouterConfig memory config = configs[chainId];
        if (!config.enabled) return false;
        return config.router != address(0) && config.wrappedNative != address(0);
    }
}
