// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Test double for a fee recipient that reverts on any native transfer.
 * Used to prove the AMM never pushes native to feeRecipient on the hot path,
 * so a hostile/non-payable recipient cannot brick trading or graduation.
 */
contract RevertingReceiver {
    error NoNativeAccepted();

    receive() external payable {
        revert NoNativeAccepted();
    }

    fallback() external payable {
        revert NoNativeAccepted();
    }
}
