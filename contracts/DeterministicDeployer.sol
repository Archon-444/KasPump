// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenFactory.sol";

/**
 * @title DeterministicDeployer
 * @dev Deploys contracts to the same address across all EVM chains using CREATE2
 * @notice This is the FIRST contract to deploy on each chain
 *
 * STRATEGY IMPLEMENTATION:
 * - Same address for TokenFactory on BSC, Arbitrum, Base
 * - User trust through address consistency
 * - Cross-chain contract recognition
 * - Simplified multi-chain UX
 */
contract DeterministicDeployer {

    // ========== EVENTS ==========

    event ContractDeployed(
        address indexed contractAddress,
        bytes32 indexed salt,
        string contractType,
        uint256 chainId
    );

    // ========== ERRORS ==========

    error DeploymentFailed();
    error ContractAlreadyDeployed();

    // ========== STATE ==========

    // Track deployed contracts
    mapping(bytes32 => address) public deployedContracts;

    // Nonce for unique salts
    uint256 public deploymentNonce;

    // ========== DEPLOYMENT FUNCTIONS ==========

    /**
     * @dev Deploy TokenFactory to the SAME address on all chains
     * @param _feeRecipient Fee recipient address (can be different per chain)
     * @param _baseSalt Base salt for determinism (MUST be same on all chains)
     * @return factoryAddress The deployed factory address (will be same on all chains)
     *
     * CRITICAL: Deploy this with the EXACT SAME _baseSalt on BSC, Arbitrum, and Base
     * to get the same factory address everywhere.
     */
    function deployTokenFactory(
        address payable _feeRecipient,
        bytes32 _baseSalt
    ) external returns (address factoryAddress) {

        // Calculate deterministic salt
        bytes32 salt = keccak256(abi.encodePacked(
            _baseSalt,
            "TokenFactory",
            "v1.0.0" // Version control for upgrades
        ));

        // Check if already deployed
        if (deployedContracts[salt] != address(0)) {
            revert ContractAlreadyDeployed();
        }

        // Get creation bytecode
        bytes memory bytecode = abi.encodePacked(
            type(TokenFactory).creationCode,
            abi.encode(_feeRecipient)
        );

        // Deploy using CREATE2
        assembly {
            factoryAddress := create2(
                0, // no ETH sent
                add(bytecode, 0x20), // skip length prefix
                mload(bytecode), // bytecode length
                salt // deterministic salt
            )
        }

        // Check deployment success
        if (factoryAddress == address(0)) {
            revert DeploymentFailed();
        }

        // Store deployment
        deployedContracts[salt] = factoryAddress;

        emit ContractDeployed(
            factoryAddress,
            salt,
            "TokenFactory",
            block.chainid
        );

        return factoryAddress;
    }

    /**
     * @dev Compute the address where a contract will be deployed
     * @param _baseSalt Base salt (must match deployment)
     * @param _feeRecipient Constructor parameter
     * @return The predicted address
     *
     * USE THIS to verify addresses will match across chains BEFORE deployment
     */
    function computeTokenFactoryAddress(
        bytes32 _baseSalt,
        address payable _feeRecipient
    ) external view returns (address) {

        bytes32 salt = keccak256(abi.encodePacked(
            _baseSalt,
            "TokenFactory",
            "v1.0.0"
        ));

        bytes memory bytecode = abi.encodePacked(
            type(TokenFactory).creationCode,
            abi.encode(_feeRecipient)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }

    /**
     * @dev Get deployment info
     */
    function getDeployment(bytes32 salt) external view returns (address) {
        return deployedContracts[salt];
    }

    /**
     * @dev Check if a contract is deployed at predicted address
     */
    function isDeployed(bytes32 salt) external view returns (bool) {
        return deployedContracts[salt] != address(0);
    }
}

/**
 * @title MultiChainDeploymentHelper
 * @dev Helper contract to coordinate multi-chain deployments
 * @notice Deploy this AFTER DeterministicDeployer on each chain
 */
contract MultiChainDeploymentHelper {

    struct ChainDeployment {
        uint256 chainId;
        address tokenFactoryAddress;
        address deployerAddress;
        uint256 deployedAt;
        bool isActive;
    }

    // Chain ID => Deployment info
    mapping(uint256 => ChainDeployment) public chainDeployments;

    // Supported chains
    uint256[] public supportedChainIds;

    // Events
    event ChainDeploymentRegistered(
        uint256 indexed chainId,
        address indexed factoryAddress,
        uint256 timestamp
    );

    /**
     * @dev Register a deployment on a specific chain
     * @notice Call this after deploying on each chain for tracking
     */
    function registerDeployment(
        uint256 _chainId,
        address _factoryAddress,
        address _deployerAddress
    ) external {
        require(_factoryAddress != address(0), "Invalid factory address");

        chainDeployments[_chainId] = ChainDeployment({
            chainId: _chainId,
            tokenFactoryAddress: _factoryAddress,
            deployerAddress: _deployerAddress,
            deployedAt: block.timestamp,
            isActive: true
        });

        // Add to supported chains if not already there
        bool exists = false;
        for (uint i = 0; i < supportedChainIds.length; i++) {
            if (supportedChainIds[i] == _chainId) {
                exists = true;
                break;
            }
        }

        if (!exists) {
            supportedChainIds.push(_chainId);
        }

        emit ChainDeploymentRegistered(_chainId, _factoryAddress, block.timestamp);
    }

    /**
     * @dev Get all supported chains
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChainIds;
    }

    /**
     * @dev Get deployment for specific chain
     */
    function getChainDeployment(uint256 _chainId) external view returns (ChainDeployment memory) {
        return chainDeployments[_chainId];
    }

    /**
     * @dev Verify factory address is consistent across chains
     */
    function verifyConsistentAddresses() external view returns (bool isConsistent, address expectedAddress) {
        if (supportedChainIds.length == 0) return (true, address(0));

        expectedAddress = chainDeployments[supportedChainIds[0]].tokenFactoryAddress;

        for (uint i = 1; i < supportedChainIds.length; i++) {
            if (chainDeployments[supportedChainIds[i]].tokenFactoryAddress != expectedAddress) {
                return (false, expectedAddress);
            }
        }

        return (true, expectedAddress);
    }
}
