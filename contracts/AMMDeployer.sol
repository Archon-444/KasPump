// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BondingCurveAMM.sol";
import "./interfaces/IAMMDeployer.sol";

/**
 * @title AMMDeployer
 * @dev Deploys BondingCurveAMM instances so that the AMM's (large) creation
 * bytecode lives here instead of being embedded in TokenFactory. This is what
 * keeps TokenFactory under the EIP-170 24576-byte deployed-code limit.
 *
 * Permissionless by design: any AMM deployed through here that is NOT
 * registered by the TokenFactory is just an ownerless-to-caller standalone
 * contract with no token supply and no platform integration, so there is no
 * value to grief. TokenFactory is the only intended caller.
 */
contract AMMDeployer is IAMMDeployer {
    /**
     * @dev Deploy a BondingCurveAMM and hand its ownership to `ammAdmin`.
     * The AMM is `Ownable(msg.sender) == this AMMDeployer` at construction;
     * ownership is transferred to the platform admin so the AMM's emergency
     * controls (pause / unpause / setSoftLaunchCap / emergencyWithdraw) are
     * callable in production rather than stranded on this deployer.
     */
    function deployAMM(
        address token,
        address payable creator,
        address payable feeRecipient,
        uint8 tier,
        address router,
        uint256 sniperProtectionDuration,
        address payable referrer,
        address ammAdmin
    ) external returns (address) {
        BondingCurveAMM amm = new BondingCurveAMM(
            token,
            creator,
            feeRecipient,
            tier,
            router,
            sniperProtectionDuration,
            referrer
        );
        amm.transferOwnership(ammAdmin);
        return address(amm);
    }
}
