// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/interfaces/IDexRouterRegistry.sol";

contract MockDexRouterRegistry is IDexRouterRegistry {
    mapping(uint256 => RouterConfig) private configs;

    function setConfig(
        uint256 chainId,
        RouterType routerType,
        address router,
        address positionManager,
        address wrappedNative,
        uint24 fee,
        bool enabled
    ) external {
        configs[chainId] = RouterConfig({
            routerType: routerType,
            router: router,
            positionManager: positionManager,
            wrappedNative: wrappedNative,
            fee: fee,
            enabled: enabled
        });
    }

    function getRouterConfig(uint256 chainId) external view returns (RouterConfig memory) {
        return configs[chainId];
    }

    function isChainSupported(uint256 chainId) external view returns (bool) {
        RouterConfig memory config = configs[chainId];
        if (!config.enabled) return false;

        if (config.routerType == RouterType.V2) {
            return config.router != address(0) && config.wrappedNative != address(0);
        }

        if (config.routerType == RouterType.V3) {
            return config.positionManager != address(0) && config.wrappedNative != address(0) && config.fee != 0;
        }

        return false;
    }
}
