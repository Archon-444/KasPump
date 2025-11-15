// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockDEXRouter
 * @dev Mock implementation of PancakeSwap/Uniswap V2 router for testing
 */
contract MockDEXRouter {
    address public immutable WETH;
    address public immutable factory;

    // Track added liquidity for testing
    struct LiquidityRecord {
        address token;
        uint256 tokenAmount;
        uint256 nativeAmount;
        address to;
    }

    LiquidityRecord[] public liquidityRecords;
    bool public shouldRevert = false;

    constructor(address _weth, address _factory) {
        WETH = _weth;
        factory = _factory;
    }

    /**
     * @dev Mock addLiquidityETH function
     */
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        require(!shouldRevert, "MockDEXRouter: Simulated failure");
        require(block.timestamp <= deadline, "MockDEXRouter: EXPIRED");
        require(msg.value >= amountETHMin, "MockDEXRouter: INSUFFICIENT_ETH");

        // Transfer tokens from sender
        IERC20(token).transferFrom(msg.sender, address(this), amountTokenDesired);

        // Return values
        amountToken = amountTokenDesired;
        amountETH = msg.value;
        liquidity = (amountToken * amountETH) / 1e18; // Simple formula for testing

        // Record the liquidity addition
        liquidityRecords.push(LiquidityRecord({
            token: token,
            tokenAmount: amountToken,
            nativeAmount: amountETH,
            to: to
        }));

        return (amountToken, amountETH, liquidity);
    }

    /**
     * @dev Set whether addLiquidityETH should revert
     */
    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    /**
     * @dev Get number of liquidity records
     */
    function getLiquidityRecordsCount() external view returns (uint256) {
        return liquidityRecords.length;
    }

    /**
     * @dev Get liquidity record by index
     */
    function getLiquidityRecord(uint256 index)
        external
        view
        returns (
            address token,
            uint256 tokenAmount,
            uint256 nativeAmount,
            address to
        )
    {
        LiquidityRecord memory record = liquidityRecords[index];
        return (record.token, record.tokenAmount, record.nativeAmount, record.to);
    }
}

/**
 * @title MockDEXFactory
 * @dev Mock implementation of PancakeSwap/Uniswap V2 factory for testing
 */
contract MockDEXFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    /**
     * @dev Create a mock pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "MockDEXFactory: IDENTICAL_ADDRESSES");
        require(getPair[tokenA][tokenB] == address(0), "MockDEXFactory: PAIR_EXISTS");

        // Deploy mock pair (just use a simple contract)
        pair = address(new MockLPToken(tokenA, tokenB));

        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair;
        allPairs.push(pair);

        return pair;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}

/**
 * @title MockLPToken
 * @dev Mock LP token contract
 */
contract MockLPToken {
    string public name = "Mock LP Token";
    string public symbol = "MOCK-LP";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public token0;
    address public token1;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/**
 * @title MockWETH
 * @dev Mock WETH contract for testing
 */
contract MockWETH {
    string public name = "Wrapped ETH";
    string public symbol = "WETH";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;

    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) public {
        require(balanceOf[msg.sender] >= wad, "WETH: Insufficient balance");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }
}
