// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAMMDeployer
 * @dev Interface for the external contract that deploys BondingCurveAMM
 * instances on behalf of TokenFactory. Extracting the `new BondingCurveAMM`
 * out of the factory keeps the factory's own runtime bytecode under the
 * EIP-170 24576-byte limit (the AMM's creation bytecode is large and would
 * otherwise be embedded in the factory).
 */
interface IAMMDeployer {
    function deployAMM(
        address token,
        address payable creator,
        address payable feeRecipient,
        uint8 tier,
        address router,
        uint256 sniperProtectionDuration,
        address payable referrer,
        address ammAdmin
    ) external returns (address amm);
}
