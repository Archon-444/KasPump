// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BadgeRegistry
 * @notice Manages verification badges for tokens and creators on KasPump
 * @dev Supports multiple badge types with different verification levels
 *
 * Badge Types:
 * - VERIFIED_CREATOR: Creator has completed KYC
 * - AUDITED: Token has been audited by third-party
 * - COMMUNITY_CHOICE: High community engagement
 * - GRADUATED: Token has graduated to DEX
 * - PARTNER: Official partnership
 */
contract BadgeRegistry is Ownable, Pausable {

    // ============ Enums ============

    enum BadgeType {
        NONE,
        VERIFIED_CREATOR,   // 1 - Blue checkmark
        AUDITED,            // 2 - Green shield
        COMMUNITY_CHOICE,   // 3 - Gold star
        GRADUATED,          // 4 - Purple rocket
        PARTNER             // 5 - Diamond
    }

    // ============ Structs ============

    struct Badge {
        BadgeType badgeType;
        uint256 grantedAt;
        uint256 expiresAt;      // 0 = never expires
        string metadata;         // IPFS hash for additional info
        address grantedBy;
    }

    struct TokenBadges {
        Badge[] badges;
        mapping(BadgeType => uint256) badgeIndex; // badgeType => index+1 (0 means not exists)
    }

    struct CreatorBadges {
        Badge[] badges;
        mapping(BadgeType => uint256) badgeIndex;
    }

    // ============ State Variables ============

    /// @notice Maps token address to its badges
    mapping(address => TokenBadges) private tokenBadges;

    /// @notice Maps creator address to their badges
    mapping(address => CreatorBadges) private creatorBadges;

    /// @notice Authorized badge grantors
    mapping(address => bool) public authorizedGrantors;

    /// @notice Badge requirements for automatic granting
    mapping(BadgeType => uint256) public badgeThresholds;

    // ============ Events ============

    event BadgeGranted(
        address indexed target,
        BadgeType badgeType,
        bool isToken,
        address grantedBy,
        uint256 expiresAt
    );

    event BadgeRevoked(
        address indexed target,
        BadgeType badgeType,
        bool isToken,
        address revokedBy
    );

    event GrantorUpdated(
        address indexed grantor,
        bool authorized
    );

    // ============ Errors ============

    error UnauthorizedGrantor();
    error BadgeAlreadyExists();
    error BadgeNotFound();
    error InvalidBadgeType();
    error ZeroAddress();

    // ============ Modifiers ============

    modifier onlyGrantor() {
        if (!authorizedGrantors[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedGrantor();
        }
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        // Set default thresholds for automatic badges
        badgeThresholds[BadgeType.COMMUNITY_CHOICE] = 100; // 100 holders
    }

    // ============ Token Badge Functions ============

    /**
     * @notice Grant a badge to a token
     * @param token The token address
     * @param badgeType The type of badge to grant
     * @param expiresAt Expiration timestamp (0 for permanent)
     * @param metadata IPFS hash with additional info
     */
    function grantTokenBadge(
        address token,
        BadgeType badgeType,
        uint256 expiresAt,
        string calldata metadata
    ) external onlyGrantor whenNotPaused {
        if (token == address(0)) revert ZeroAddress();
        if (badgeType == BadgeType.NONE) revert InvalidBadgeType();

        TokenBadges storage badges = tokenBadges[token];

        // Check if badge already exists
        if (badges.badgeIndex[badgeType] > 0) {
            revert BadgeAlreadyExists();
        }

        // Add badge
        badges.badges.push(Badge({
            badgeType: badgeType,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            metadata: metadata,
            grantedBy: msg.sender
        }));

        badges.badgeIndex[badgeType] = badges.badges.length;

        emit BadgeGranted(token, badgeType, true, msg.sender, expiresAt);
    }

    /**
     * @notice Revoke a badge from a token
     * @param token The token address
     * @param badgeType The type of badge to revoke
     */
    function revokeTokenBadge(
        address token,
        BadgeType badgeType
    ) external onlyGrantor {
        TokenBadges storage badges = tokenBadges[token];
        uint256 index = badges.badgeIndex[badgeType];

        if (index == 0) revert BadgeNotFound();

        // Remove badge (swap with last and pop)
        uint256 lastIndex = badges.badges.length - 1;
        if (index - 1 != lastIndex) {
            Badge storage lastBadge = badges.badges[lastIndex];
            badges.badges[index - 1] = lastBadge;
            badges.badgeIndex[lastBadge.badgeType] = index;
        }
        badges.badges.pop();
        badges.badgeIndex[badgeType] = 0;

        emit BadgeRevoked(token, badgeType, true, msg.sender);
    }

    /**
     * @notice Get all badges for a token
     * @param token The token address
     * @return Array of badge types that are active
     */
    function getTokenBadges(address token) external view returns (BadgeType[] memory) {
        TokenBadges storage badges = tokenBadges[token];
        uint256 activeCount = 0;

        // Count active badges
        for (uint256 i = 0; i < badges.badges.length; i++) {
            if (badges.badges[i].expiresAt == 0 ||
                badges.badges[i].expiresAt > block.timestamp) {
                activeCount++;
            }
        }

        // Build result array
        BadgeType[] memory result = new BadgeType[](activeCount);
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < badges.badges.length; i++) {
            if (badges.badges[i].expiresAt == 0 ||
                badges.badges[i].expiresAt > block.timestamp) {
                result[resultIndex] = badges.badges[i].badgeType;
                resultIndex++;
            }
        }

        return result;
    }

    /**
     * @notice Check if token has a specific badge
     * @param token The token address
     * @param badgeType The badge type to check
     * @return True if token has active badge
     */
    function hasTokenBadge(
        address token,
        BadgeType badgeType
    ) external view returns (bool) {
        TokenBadges storage badges = tokenBadges[token];
        uint256 index = badges.badgeIndex[badgeType];

        if (index == 0) return false;

        Badge storage badge = badges.badges[index - 1];
        return badge.expiresAt == 0 || badge.expiresAt > block.timestamp;
    }

    // ============ Creator Badge Functions ============

    /**
     * @notice Grant a badge to a creator
     * @param creator The creator address
     * @param badgeType The type of badge to grant
     * @param expiresAt Expiration timestamp (0 for permanent)
     * @param metadata IPFS hash with additional info
     */
    function grantCreatorBadge(
        address creator,
        BadgeType badgeType,
        uint256 expiresAt,
        string calldata metadata
    ) external onlyGrantor whenNotPaused {
        if (creator == address(0)) revert ZeroAddress();
        if (badgeType == BadgeType.NONE) revert InvalidBadgeType();

        CreatorBadges storage badges = creatorBadges[creator];

        if (badges.badgeIndex[badgeType] > 0) {
            revert BadgeAlreadyExists();
        }

        badges.badges.push(Badge({
            badgeType: badgeType,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            metadata: metadata,
            grantedBy: msg.sender
        }));

        badges.badgeIndex[badgeType] = badges.badges.length;

        emit BadgeGranted(creator, badgeType, false, msg.sender, expiresAt);
    }

    /**
     * @notice Get all badges for a creator
     * @param creator The creator address
     * @return Array of badge types that are active
     */
    function getCreatorBadges(address creator) external view returns (BadgeType[] memory) {
        CreatorBadges storage badges = creatorBadges[creator];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < badges.badges.length; i++) {
            if (badges.badges[i].expiresAt == 0 ||
                badges.badges[i].expiresAt > block.timestamp) {
                activeCount++;
            }
        }

        BadgeType[] memory result = new BadgeType[](activeCount);
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < badges.badges.length; i++) {
            if (badges.badges[i].expiresAt == 0 ||
                badges.badges[i].expiresAt > block.timestamp) {
                result[resultIndex] = badges.badges[i].badgeType;
                resultIndex++;
            }
        }

        return result;
    }

    /**
     * @notice Check if creator has a specific badge
     * @param creator The creator address
     * @param badgeType The badge type to check
     * @return True if creator has active badge
     */
    function hasCreatorBadge(
        address creator,
        BadgeType badgeType
    ) external view returns (bool) {
        CreatorBadges storage badges = creatorBadges[creator];
        uint256 index = badges.badgeIndex[badgeType];

        if (index == 0) return false;

        Badge storage badge = badges.badges[index - 1];
        return badge.expiresAt == 0 || badge.expiresAt > block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set authorized grantor status
     * @param grantor The grantor address
     * @param authorized Whether grantor is authorized
     */
    function setGrantor(address grantor, bool authorized) external onlyOwner {
        if (grantor == address(0)) revert ZeroAddress();
        authorizedGrantors[grantor] = authorized;
        emit GrantorUpdated(grantor, authorized);
    }

    /**
     * @notice Set badge threshold for automatic granting
     * @param badgeType The badge type
     * @param threshold The threshold value
     */
    function setBadgeThreshold(
        BadgeType badgeType,
        uint256 threshold
    ) external onlyOwner {
        badgeThresholds[badgeType] = threshold;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
