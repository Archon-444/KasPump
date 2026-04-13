import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const PRECISION = 1000000000000000000n; // 10^18

async function deployFixture() {
  const [deployer, user, referrer] = await ethers.getSigners();

  const totalSupply = 1_000_000n * PRECISION;
  const basePrice = 1_000_000_000_000n; // 1e12 wei (0.000001 ETH - minimum allowed)
  const slope = 1_000_000_000n; // 1 gwei
  const graduationThreshold = 800_000n * PRECISION;

  // Deploy mock WETH and DEX router for constructor requirement
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();

  const MockDEXFactory = await ethers.getContractFactory("MockDEXFactory");
  const dexFactory = await MockDEXFactory.deploy();
  await dexFactory.waitForDeployment();

  const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
  const dexRouter = await MockDEXRouter.deploy(
    await weth.getAddress(),
    await dexFactory.getAddress()
  );
  await dexRouter.waitForDeployment();

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
    deployer.address, // tokenCreator
    basePrice,
    slope,
    0, // LINEAR curve
    graduationThreshold,
    deployer.address, // feeRecipient
    0, // BASIC tier
    await dexRouter.getAddress(), // DEX router
    60, // sniper protection duration
    ethers.ZeroAddress // no referrer
  );
  await amm.waitForDeployment();

  await token.transfer(await amm.getAddress(), totalSupply);

  return { amm, token, deployer, user, referrer };
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
    // After selling, accumulated creator fees remain in the contract
    const accumulatedFees = await amm.creatorAccumulatedFees();
    expect(ammBalanceAfterSell).to.equal(accumulatedFees);

    const ammTokenBalance = await token.balanceOf(await amm.getAddress());
    expect(ammTokenBalance).to.equal(1_000_000n * PRECISION);
  });
});

describe("BondingCurveAMM fee insolvency fix", function () {
  it("sellTokens excludes reserved fees from available liquidity", async function () {
    const { amm, token, deployer, user } = await deployFixture();

    // Buy tokens to generate creator fee accumulation
    const deposit = ethers.parseEther("1");
    await amm.connect(user).buyTokens(0, { value: deposit });

    const creatorFees = await amm.creatorAccumulatedFees();
    expect(creatorFees).to.be.gt(0n);

    // Verify accumulated fees are protected from sell drainage
    const contractBalance = await ethers.provider.getBalance(await amm.getAddress());
    expect(contractBalance).to.be.gt(creatorFees);

    // Creator should be able to withdraw their fees after user sells
    const userTokens = await token.balanceOf(user.address);
    await token.connect(user).approve(await amm.getAddress(), userTokens);
    await amm.connect(user).sellTokens(userTokens, 0);

    // After sell, contract balance should still cover accumulated fees
    const balanceAfterSell = await ethers.provider.getBalance(await amm.getAddress());
    const totalAccumulatedFees = await amm.creatorAccumulatedFees();
    expect(balanceAfterSell).to.be.gte(totalAccumulatedFees);
  });
});

describe("BondingCurveAMM emergencyWithdraw", function () {
  it("reverts when contract is not paused", async function () {
    const { amm, deployer } = await deployFixture();

    await expect(
      amm.connect(deployer).emergencyWithdraw("test")
    ).to.be.revertedWithCustomError(amm, "EnforcedPause");
  });

  it("succeeds when contract is paused", async function () {
    const { amm, deployer, user } = await deployFixture();

    // Add some funds via buy
    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.1") });

    // Pause the contract
    await amm.connect(deployer).pause();

    // Emergency withdraw should succeed
    await expect(
      amm.connect(deployer).emergencyWithdraw("critical bug found")
    ).to.emit(amm, "EmergencyWithdraw");
  });

  it("preserves reserved creator fees", async function () {
    const { amm, deployer, user } = await deployFixture();

    // Buy tokens to generate creator fees
    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("1") });

    const creatorFees = await amm.creatorAccumulatedFees();
    expect(creatorFees).to.be.gt(0n);

    // Pause and emergency withdraw
    await amm.connect(deployer).pause();
    await amm.connect(deployer).emergencyWithdraw("test withdrawal");

    // Contract should still hold the reserved fees
    const balanceAfter = await ethers.provider.getBalance(await amm.getAddress());
    expect(balanceAfter).to.equal(creatorFees);
  });
});
