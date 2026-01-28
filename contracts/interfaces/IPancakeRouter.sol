// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPancakeRouter
 * @dev Interface for PancakeSwap V2 Router (compatible with Uniswap V2, Sushi, BaseSwap)
 * Used for automated liquidity provision on token graduation
 */
interface IPancakeRouter {
    /**
     * @dev Add liquidity to a token-ETH pair
     * @param token Address of the token
     * @param amountTokenDesired Amount of tokens to add
     * @param amountTokenMin Minimum tokens (slippage protection)
     * @param amountETHMin Minimum ETH (slippage protection)
     * @param to Address to receive LP tokens
     * @param deadline Transaction deadline (unix timestamp)
     * @return amountToken Actual amount of tokens added
     * @return amountETH Actual amount of ETH added
     * @return liquidity Amount of LP tokens minted
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
        );

    /**
     * @dev Get the WETH address used by the router
     * @return Address of WETH contract
     */
    function WETH() external pure returns (address);

    /**
     * @dev Get the factory address
     * @return Address of the factory contract
     */
    function factory() external pure returns (address);
}

/**
 * @title IPancakeFactory
 * @dev Interface for PancakeSwap V2 Factory (compatible with Uniswap V2)
 */
interface IPancakeFactory {
    /**
     * @dev Get the pair address for two tokens
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Address of the pair contract (or zero if doesn't exist)
     */
    function getPair(address tokenA, address tokenB) external view returns (address pair);

    /**
     * @dev Create a new token pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Address of the created pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

/**
 * @title IERC20Minimal
 * @dev Minimal ERC20 interface for LP tokens
 */
interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}
