import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const PRECISION = 1_000_000_000_000_000_000n;       // 1e18
const TOTAL_SUPPLY = 1_000_000_000n * PRECISION;     // 1B tokens
const GRADUATION_THRESHOLD = 800_000_000n * PRECISION;

// V2 AMM constructor (post-PR 2 sigmoid replacement) takes 7 args. Curve
// shape, base price, slope, total supply, and graduation threshold are all
// protocol-wide constants now (see contracts/libraries/BondingCurveMath.sol).
async function deployFixture() {
  const [deployer, user, referrer] = await ethers.getSigners();

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
    TOTAL_SUPPLY,
    deployer.address
  );
  await token.waitForDeployment();

  const BondingCurveFactory = await ethers.getContractFactory("BondingCurveAMM");
  const amm = await BondingCurveFactory.deploy(
    await token.getAddress(),
    deployer.address,            // tokenCreator
    deployer.address,            // feeRecipient
    0,                           // BASIC tier
    await dexRouter.getAddress(),
    60,                          // sniper protection duration
    ethers.ZeroAddress           // no referrer
  );
  await amm.waitForDeployment();

  await token.transfer(await amm.getAddress(), TOTAL_SUPPLY);

  return { amm, token, deployer, user, referrer };
}

// V2 anti-bot guards (max-buy-per-tx, deviation guard) only fire inside the
// sniper window. Most legacy tests issue large buys at supply 0 and assume
// no per-tx cap, so we skip past the window before they run.
async function skipSniperWindow() {
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine", []);
}

describe("BondingCurveAMM precision", function () {
  it("returns tokens for tiny native deposits", async function () {
    const { amm } = await deployFixture();
    // 5 gwei is well inside the first anchor segment ([0, 12.78e15] wei).
    // Linear interpolation gives a small but strictly positive token-wei.
    const tinyDeposit = 5_000_000_000n;
    const tokensOut = await amm.calculateTokensOut(tinyDeposit, 0);
    expect(tokensOut).to.be.gt(0n);
  });

  it("allows buying and selling without leaving residual balances", async function () {
    const { amm, token, user } = await deployFixture();
    await skipSniperWindow();

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

    // Same-block guard: bypass by advancing one block before the sell.
    await ethers.provider.send("evm_mine", []);

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

    // AMM token balance returns to TOTAL_SUPPLY after a clean buy/sell round-trip.
    const ammTokenBalance = await token.balanceOf(await amm.getAddress());
    expect(ammTokenBalance).to.equal(TOTAL_SUPPLY);
  });
});

describe("BondingCurveAMM fee insolvency fix", function () {
  it("sellTokens excludes reserved fees from available liquidity", async function () {
    const { amm, token, user } = await deployFixture();
    await skipSniperWindow();

    // Buy 0.5 ETH worth — well below graduation (3 ETH at threshold).
    const deposit = ethers.parseEther("0.5");
    await amm.connect(user).buyTokens(0, { value: deposit });

    const creatorFees = await amm.creatorAccumulatedFees();
    expect(creatorFees).to.be.gt(0n);

    const contractBalance = await ethers.provider.getBalance(await amm.getAddress());
    expect(contractBalance).to.be.gt(creatorFees);

    await ethers.provider.send("evm_mine", []); // bypass same-block guard

    const userTokens = await token.balanceOf(user.address);
    await token.connect(user).approve(await amm.getAddress(), userTokens);
    await amm.connect(user).sellTokens(userTokens, 0);

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
    await skipSniperWindow();

    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.1") });

    await amm.connect(deployer).pause();

    await expect(
      amm.connect(deployer).emergencyWithdraw("critical bug found")
    ).to.emit(amm, "EmergencyWithdraw");
  });

  it("preserves reserved creator fees", async function () {
    const { amm, deployer, user } = await deployFixture();
    await skipSniperWindow();

    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.5") });

    const creatorFees = await amm.creatorAccumulatedFees();
    expect(creatorFees).to.be.gt(0n);

    await amm.connect(deployer).pause();
    await amm.connect(deployer).emergencyWithdraw("test withdrawal");

    const balanceAfter = await ethers.provider.getBalance(await amm.getAddress());
    expect(balanceAfter).to.equal(creatorFees);
  });
});

describe("BondingCurveAMM continuous fee decay", function () {
  it("yields MAX_FEE_BPS at supply 0 (outside the sniper window)", async function () {
    const { amm } = await deployFixture();
    await skipSniperWindow();
    const fee = await amm.getPlatformFee();
    expect(fee).to.equal(100n);
  });

  it("applies sniper surcharge during the protection window", async function () {
    const { amm } = await deployFixture();
    const feeInWindow = await amm.getPlatformFee();
    expect(feeInWindow).to.be.gt(100n);
  });

  it("standardized graduation threshold is 800M tokens", async function () {
    const { amm } = await deployFixture();
    expect(await amm.graduationThreshold()).to.equal(GRADUATION_THRESHOLD);
  });
});

describe("BondingCurveAMM anti-bot guards", function () {
  it("rejects oversized buys during the sniper window (MaxBuyExceeded)", async function () {
    const { amm, user } = await deployFixture();
    // Inside the sniper window the fee runs at ~99%, so only ~1% of
    // msg.value ends up as nativeAfterFee. The 2% max-buy cap is ~16M
    // tokens which costs ~6.4e15 wei net, i.e. ~0.64 ETH gross. Send
    // 1 ETH to clear the cap with comfortable margin without tripping
    // the PR 3 graduation overpayment clamp (estNet ≈ 0.01 ETH ≪
    // requiredNet ≈ 3 ETH).
    await expect(
      amm.connect(user).buyTokens(0, { value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(amm, "MaxBuyExceeded");
  });

  it("blocks same-block sells inside the sniper window", async function () {
    const { amm, token, user } = await deployFixture();
    // Tiny buy slips under MaxBuyExceeded (2% cap inside window).
    await amm.connect(user).buyTokens(0, { value: 1_000_000n });
    const balance = await token.balanceOf(user.address);
    await token.connect(user).approve(await amm.getAddress(), balance);
    await expect(
      amm.connect(user).sellTokens(balance, 0)
    ).to.be.revertedWithCustomError(amm, "SameBlockTrade");
  });

  it("permits same-block sells outside the sniper window for small trades", async function () {
    const { amm, token, user } = await deployFixture();
    await skipSniperWindow();
    // Tiny buy keeps the sell under SAME_BLOCK_LARGE_BPS (0.5%) of remaining curve.
    await amm.connect(user).buyTokens(0, { value: 1_000n });
    const balance = await token.balanceOf(user.address);
    await token.connect(user).approve(await amm.getAddress(), balance);
    await expect(amm.connect(user).sellTokens(balance, 0)).to.emit(amm, "Trade");
  });
});

describe("BondingCurveAMM soft-launch cap", function () {
  it("partial-fills and refunds the overflow when the cap would be breached", async function () {
    const { amm, deployer, user } = await deployFixture();
    await skipSniperWindow();

    const cap = ethers.parseEther("0.05");
    await amm.connect(deployer).setSoftLaunchCap(cap);

    const sendValue = ethers.parseEther("0.1");
    const balanceBefore = await ethers.provider.getBalance(user.address);

    const tx = await amm.connect(user).buyTokens(0, { value: sendValue });
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;

    const balanceAfter = await ethers.provider.getBalance(user.address);
    const netSpend = balanceBefore - balanceAfter - gasCost;
    expect(netSpend).to.equal(cap);

    expect(await amm.totalNativeRaised()).to.equal(cap);

    // SoftLaunchCapHit args: (token, buyer, requested, accepted, refunded).
    await expect(tx)
      .to.emit(amm, "SoftLaunchCapHit")
      .withArgs(await amm.token(), user.address, sendValue, cap, sendValue - cap);
  });

  it("reverts buys that arrive after the cap is fully consumed", async function () {
    const { amm, deployer, user } = await deployFixture();
    await skipSniperWindow();

    const cap = ethers.parseEther("0.01");
    await amm.connect(deployer).setSoftLaunchCap(cap);

    await amm.connect(user).buyTokens(0, { value: cap });
    await ethers.provider.send("evm_mine", []);

    await expect(
      amm.connect(user).buyTokens(0, { value: 1n })
    ).to.be.revertedWithCustomError(amm, "SoftLaunchCapReached");
  });

  it("setting the cap to zero disables it", async function () {
    const { amm, deployer, user } = await deployFixture();
    await skipSniperWindow();

    await amm.connect(deployer).setSoftLaunchCap(ethers.parseEther("0.01"));
    await amm.connect(deployer).setSoftLaunchCap(0n);

    await expect(
      amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.1") })
    ).to.emit(amm, "Trade");
  });
});

describe("BondingCurveAMM TradeExecuted event", function () {
  it("emits structured ops payload alongside legacy Trade", async function () {
    const { amm, user } = await deployFixture();
    await skipSniperWindow();

    const tx = await amm.connect(user).buyTokens(0, { value: 1_000_000_000n });
    await expect(tx).to.emit(amm, "TradeExecuted");
    await expect(tx).to.emit(amm, "Trade");
  });
});

describe("BondingCurveAMM PriceDeviation guard", function () {
  it("does not emit a PriceDeviationBlocked log when reverting", async function () {
    // The event was deliberately removed in the follow-up patch (reverted txs
    // discard logs); this guards against a regression that re-introduces the
    // false ops surface.
    const { amm } = await deployFixture();
    expect(() => amm.interface.getEvent("PriceDeviationBlocked")).to.throw();
  });
});

describe("BondingCurveAMM zero-output guard", function () {
  it("rejects buys whose post-cap nativeAmount mints 0 tokens", async function () {
    const { amm, deployer, user } = await deployFixture();
    await skipSniperWindow();

    // Set the cap to 1 wei. The first buyer sends 1 wei → after fees the curve
    // math returns 0 tokens (the smallest segment is 12.78e15 wei wide), which
    // must trip the InvalidAmount guard.
    await amm.connect(deployer).setSoftLaunchCap(1n);

    await expect(
      amm.connect(user).buyTokens(0, { value: 1n })
    ).to.be.revertedWithCustomError(amm, "InvalidAmount");
  });
});
