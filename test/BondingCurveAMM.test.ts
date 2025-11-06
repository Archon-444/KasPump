import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const PRECISION = 1000000000000000000n; // 10^18

async function deployFixture() {
  const [deployer, user] = await ethers.getSigners();

  const totalSupply = 1_000_000n * PRECISION;
  const basePrice = 1_000_000_000_000n; // 1e12 wei (0.000001 ETH - minimum allowed)
  const slope = 1_000_000_000n; // 1 gwei
  const graduationThreshold = 800_000n * PRECISION;

  const TokenFactory = await ethers.getContractFactory("KRC20Token");
  const token = await TokenFactory.deploy(
    "KasPump Token",
    "KPT",
    totalSupply,
    deployer.address
  );
  await token.waitForDeployment();

  const BondingCurveFactory = await ethers.getContractFactory("BondingCurveAMM");
  const amm = await BondingCurveFactory.deploy(
    await token.getAddress(),
    basePrice,
    slope,
    0,
    graduationThreshold,
    deployer.address,
    0
  );
  await amm.waitForDeployment();

  await token.transfer(await amm.getAddress(), totalSupply);

  return { amm, token, deployer, user };
}

describe("BondingCurveAMM precision", function () {
  it("returns tokens for tiny native deposits", async function () {
    const { amm } = await deployFixture();
    const tinyDeposit = 50n; // wei
    const tokensOut = await amm.calculateTokensOut(tinyDeposit, 0);
    expect(tokensOut).to.be.gt(0n);
  });

  it("allows buying and selling without leaving residual balances", async function () {
    const { amm, token, user } = await deployFixture();

    const deposit = 5_000_000_000n; // 5 gwei
    await expect(amm.connect(user).buyTokens(0, { value: deposit })).to.emit(
      amm,
      "Trade"
    );

    const userTokens = await token.balanceOf(user.address);
    expect(userTokens).to.be.gt(0n);

    const ammBalanceAfterBuy = await ethers.provider.getBalance(
      await amm.getAddress()
    );
    expect(ammBalanceAfterBuy).to.be.gt(0n);

    await token.connect(user).approve(await amm.getAddress(), userTokens);
    await expect(amm.connect(user).sellTokens(userTokens, 0)).to.emit(
      amm,
      "Trade"
    );

    const ammBalanceAfterSell = await ethers.provider.getBalance(
      await amm.getAddress()
    );
    expect(ammBalanceAfterSell).to.equal(0n);

    const ammTokenBalance = await token.balanceOf(await amm.getAddress());
    expect(ammTokenBalance).to.equal(1_000_000n * PRECISION);
  });
});
