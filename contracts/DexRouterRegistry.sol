// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IDexRouterRegistry.sol";
import "./libraries/DexConfig.sol";

/**
 * @title DexRouterRegistry
 * @dev Governance-controlled registry for chain-specific DEX router configs
 * @notice Enables long-term router upgrades without redeploying core contracts
 */
contract DexRouterRegistry is Ownable, IDexRouterRegistry {
    mapping(uint256 => RouterConfig) private routerConfigs;

    event RouterConfigUpdated(
        uint256 indexed chainId,
        RouterType routerType,
        address router,
        address positionManager,
        address wrappedNative,
        uint24 fee,
        bool enabled
    );

    error InvalidRouterConfig();

    constructor() Ownable(msg.sender) {
        _setDefaults();
    }

    function setRouterConfig(
        uint256 chainId,
        RouterType routerType,
        address router,
        address positionManager,
        address wrappedNative,
        uint24 fee,
        bool enabled
    ) external onlyOwner {
        if (enabled) {
            if (wrappedNative == address(0)) revert InvalidRouterConfig();
            if (routerType == RouterType.V2) {
                if (router == address(0)) revert InvalidRouterConfig();
            } else if (routerType == RouterType.V3) {
                if (positionManager == address(0) || fee == 0) {
                    revert InvalidRouterConfig();
                }
            } else {
                revert InvalidRouterConfig();
            }
        }

        RouterConfig memory config = RouterConfig({
            routerType: routerType,
            router: router,
            positionManager: positionManager,
            wrappedNative: wrappedNative,
            fee: fee,
            enabled: enabled
        });

        routerConfigs[chainId] = config;

        emit RouterConfigUpdated(chainId, routerType, router, positionManager, wrappedNative, fee, enabled);
    }

    function getRouterConfig(uint256 chainId) external view returns (RouterConfig memory) {
        return routerConfigs[chainId];
    }

    function isChainSupported(uint256 chainId) external view returns (bool) {
        RouterConfig memory config = routerConfigs[chainId];
        if (!config.enabled) return false;

        if (config.routerType == RouterType.V2) {
            return config.router != address(0) && config.wrappedNative != address(0);
        }

        if (config.routerType == RouterType.V3) {
            return config.positionManager != address(0) && config.wrappedNative != address(0) && config.fee != 0;
        }

        return false;
    }

    function _setDefaults() internal {
        uint256[6] memory chainIds = [
            uint256(56),
            97,
            42161,
            421614,
            8453,
            84532
        ];

        for (uint256 i = 0; i < chainIds.length; i++) {
            IDexRouterRegistry.RouterConfig memory config = DexConfig.getDefaultRouterConfig(chainIds[i]);
            if (
                config.enabled &&
                config.wrappedNative != address(0) &&
                (config.router != address(0) || config.positionManager != address(0))
            ) {
                routerConfigs[chainIds[i]] = config;
                emit RouterConfigUpdated(
                    chainIds[i],
                    config.routerType,
                    config.router,
                    config.positionManager,
                    config.wrappedNative,
                    config.fee,
                    config.enabled
                );
            }
        }
    }
}
