// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../../contracts/interfaces/INonfungiblePositionManager.sol";

contract MockNonfungiblePositionManager is ERC721, INonfungiblePositionManager {
    address public immutable WETH9;
    uint256 public nextTokenId = 1;
    address public lastPool;

    constructor(address _weth) ERC721("Mock V3 LP", "MV3LP") {
        WETH9 = _weth;
    }

    function createAndInitializePoolIfNecessary(
        address token0,
        address token1,
        uint24 fee,
        uint160
    ) external payable returns (address pool) {
        lastPool = address(uint160(uint256(keccak256(abi.encode(token0, token1, fee)))));
        return lastPool;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        tokenId = nextTokenId++;
        _mint(params.recipient, tokenId);

        amount0 = params.amount0Desired;
        amount1 = params.amount1Desired;
        liquidity = uint128((amount0 + amount1) / 2);
    }

    function refundETH() external payable {}
}
