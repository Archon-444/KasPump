// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TokenFactory.sol";

/**
 * @title EnhancedTokenFactory
 * @dev Extends the base TokenFactory with membership-aware fees and AMM bookkeeping.
 */
contract EnhancedTokenFactory is TokenFactory {
    enum MembershipTier {
        BASIC,      // 1.0% fee
        PREMIUM,    // 0.5% fee + premium features
        ENTERPRISE  // 0.25% fee + enterprise features
    }

    struct UserMembership {
        MembershipTier tier;
        uint256 expiresAt;
        uint256 tokensCreated;
        uint256 totalVolume;
        bool isActive;
    }

    mapping(address => UserMembership) public userMemberships;
    mapping(address => MembershipTier) public tokenTier;
    mapping(address => address) public tokenToAMM;

    // Partnership revenue sharing
    mapping(string => address) public partnerAddresses;
    mapping(string => uint256) public partnerShares; // Basis points

    uint256 public constant BASIC_FEE = 100;      // 1.0% in basis points
    uint256 public constant PREMIUM_FEE = 50;     // 0.5% in basis points
    uint256 public constant ENTERPRISE_FEE = 25;  // 0.25% in basis points

    uint256 public constant BASIC_CREATION_FEE = 0.01 ether;
    uint256 public constant PREMIUM_CREATION_FEE = 0.005 ether;
    uint256 public constant ENTERPRISE_CREATION_FEE = 0.0025 ether;

    uint256 public premiumMembershipFee = 1 ether;    // 1 KAS per year
    uint256 public enterpriseMembershipFee = 10 ether; // 10 KAS per year

    event EnhancedTokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        address ammAddress,
        MembershipTier tier,
        uint256 creationFee
    );

    event MembershipUpgraded(
        address indexed user,
        MembershipTier tier,
        uint256 expiresAt
    );

    event PartnershipRevenueShared(
        string partner,
        address partnerAddress,
        uint256 amount
    );

    constructor(address _feeRecipient) TokenFactory(_feeRecipient) {
        // Default partnership placeholders can be configured post-deployment.
        partnerShares["zealous_swap"] = 10; // 0.1% of trading fees
    }

    /**
     * @dev Creates a new KasPump token while charging membership-based fees.
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _imageUrl,
        uint256 _totalSupply,
        uint256 _basePrice,
        uint256 _slope,
        CurveType _curveType
    ) public payable override returns (address tokenAddress, address ammAddress) {
        MembershipTier tier = getUserTier(msg.sender);
        uint256 creationFee = getCreationFee(tier);
        require(msg.value >= creationFee, "Insufficient creation fee");

        (tokenAddress, ammAddress) = super.createToken(
            _name,
            _symbol,
            _description,
            _imageUrl,
            _totalSupply,
            _basePrice,
            _slope,
            _curveType
        );

        tokenTier[tokenAddress] = tier;
        tokenToAMM[tokenAddress] = ammAddress;
        userMemberships[msg.sender].tokensCreated += 1;

        _distributeFee(creationFee);

        if (msg.value > creationFee) {
            payable(msg.sender).transfer(msg.value - creationFee);
        }

        emit EnhancedTokenCreated(tokenAddress, msg.sender, ammAddress, tier, creationFee);
    }

    /**
     * @dev Upgrade user membership tier.
     */
    function upgradeMembership(MembershipTier _tier) external payable {
        require(_tier > MembershipTier.BASIC, "Cannot upgrade to basic tier");

        uint256 fee = _tier == MembershipTier.PREMIUM ? premiumMembershipFee : enterpriseMembershipFee;
        require(msg.value >= fee, "Insufficient membership fee");

        UserMembership storage membership = userMemberships[msg.sender];
        membership.tier = _tier;
        membership.expiresAt = block.timestamp + 365 days;
        membership.isActive = true;

        _forwardKas(payable(feeRecipient), fee);

        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }

        emit MembershipUpgraded(msg.sender, _tier, membership.expiresAt);
    }

    /**
     * @dev Get the current membership tier for a user.
     */
    function getUserTier(address user) public view returns (MembershipTier) {
        UserMembership memory membership = userMemberships[user];
        if (!membership.isActive || membership.expiresAt < block.timestamp) {
            return MembershipTier.BASIC;
        }

        return membership.tier;
    }

    /**
     * @dev Configure a partnership split.
     */
    function setPartner(string calldata partner, address account, uint256 shareBps) external onlyOwner {
        require(shareBps <= 1000, "Share too high");
        partnerAddresses[partner] = account;
        partnerShares[partner] = shareBps;
    }

    function _distributeFee(uint256 amount) internal {
        uint256 partnerCut;

        // Allow future dynamic partner routing by tier.
        address partnerAccount = partnerAddresses["zealous_swap"];
        uint256 partnerShare = partnerShares["zealous_swap"];

        if (partnerAccount != address(0) && partnerShare > 0) {
            partnerCut = (amount * partnerShare) / 10000;
            _forwardKas(payable(partnerAccount), partnerCut);
            emit PartnershipRevenueShared("zealous_swap", partnerAccount, partnerCut);
        }

        _forwardKas(payable(feeRecipient), amount - partnerCut);
    }

    function _forwardKas(address payable recipient, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "KAS transfer failed");
    }

    function getCreationFee(MembershipTier tier) public pure returns (uint256) {
        if (tier == MembershipTier.PREMIUM) {
            return PREMIUM_CREATION_FEE;
        }
        if (tier == MembershipTier.ENTERPRISE) {
            return ENTERPRISE_CREATION_FEE;
        }
        return BASIC_CREATION_FEE;
    }

    function getTokenAMM(address tokenAddress) external view returns (address) {
        return tokenToAMM[tokenAddress];
    }
}
