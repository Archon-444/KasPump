import { expect } from "chai";
import hre from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const { ethers } = hre;

describe("DEX Integration", function () {
  const PRECISION = ethers.parseEther("1");
  const SIX_MONTHS = 180 * 24 * 60 * 60; // 180 days in seconds

  async function deployDEXFixture() {
    const [deployer, creator, platform, trader1, trader2] = await ethers.getSigners();

    // Deploy mock WETH
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const weth = await MockWETH.deploy();
    await weth.waitForDeployment();

    // Deploy mock DEX factory
    const MockDEXFactory = await ethers.getContractFactory("MockDEXFactory");
    const dexFactory = await MockDEXFactory.deploy();
    await dexFactory.waitForDeployment();

    // Deploy mock DEX router
    const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
    const dexRouter = await MockDEXRouter.deploy(
      await weth.getAddress(),
      await dexFactory.getAddress()
    );
    await dexRouter.waitForDeployment();

    // Deploy KRC20 token
    const totalSupply = ethers.parseEther("1000000");
    const KRC20Token = await ethers.getContractFactory("KRC20Token");
    const token = await KRC20Token.deploy(
      "Test Token",
      "TEST",
      totalSupply,
      deployer.address
    );
    await token.waitForDeployment();

    // Deploy BondingCurveAMM with DEX integration
    const basePrice = ethers.parseUnits("0.000001", "ether"); // 1e12 wei
    const slope = ethers.parseUnits("1", "gwei"); // 1 gwei
    const graduationThreshold = ethers.parseEther("800000"); // 80% of supply
    const tier = 0; // Bronze tier

    const BondingCurveAMM = await ethers.getContractFactory("BondingCurveAMM");
    const amm = await BondingCurveAMM.deploy(
      await token.getAddress(),
      creator.address,
      basePrice,
      slope,
      0, // LINEAR curve
      graduationThreshold,
      platform.address,
      tier,
      await dexRouter.getAddress() // DEX router
    );
    await amm.waitForDeployment();

    // Transfer tokens to AMM
    await token.transfer(await amm.getAddress(), totalSupply);

    // Create DEX pair
    await dexFactory.createPair(await token.getAddress(), await weth.getAddress());
    const pairAddress = await dexFactory.getPair(
      await token.getAddress(),
      await weth.getAddress()
    );

    return {
      amm,
      token,
      weth,
      dexRouter,
      dexFactory,
      pairAddress,
      deployer,
      creator,
      platform,
      trader1,
      trader2,
      graduationThreshold,
    };
  }

  describe("Graduation with DEX Liquidity", function () {
    it("Should add liquidity to DEX on graduation", async function () {
      const { amm, token, trader1, graduationThreshold } = await loadFixture(deployDEXFixture);

      // Buy tokens to reach graduation threshold
      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Check if graduated
      expect(await amm.isGraduated()).to.be.true;

      // Check if DEX liquidity was added (via mock router)
      const dexRouter = await ethers.getContractAt("MockDEXRouter", await amm.dexRouter());
      const recordsCount = await dexRouter.getLiquidityRecordsCount();
      expect(recordsCount).to.equal(1);

      // Verify liquidity record
      const [recordToken, tokenAmount, nativeAmount, to] = await dexRouter.getLiquidityRecord(0);
      expect(recordToken).to.equal(await token.getAddress());
      expect(tokenAmount).to.be.gt(0);
      expect(nativeAmount).to.be.gt(0);
      expect(to).to.equal(await amm.getAddress()); // LP tokens sent to AMM
    });

    it("Should split funds 70/20/10 on graduation", async function () {
      const { amm, trader1, creator, platform, graduationThreshold } =
        await loadFixture(deployDEXFixture);

      const initialCreatorBalance = await ethers.provider.getBalance(creator.address);
      const initialPlatformBalance = await ethers.provider.getBalance(platform.address);

      // Buy tokens to reach graduation
      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Platform should receive 10% immediately
      const platformGain = (await ethers.provider.getBalance(platform.address)) - initialPlatformBalance;
      const expectedPlatformShare = (nativeNeeded * 10n) / 100n;

      // Allow for small rounding differences
      expect(platformGain).to.be.closeTo(expectedPlatformShare, ethers.parseEther("0.01"));

      // Creator should have 20% withdrawable
      const creatorWithdrawable = await amm.withdrawableGraduationFunds(creator.address);
      const expectedCreatorShare = (nativeNeeded * 20n) / 100n;
      expect(creatorWithdrawable).to.be.closeTo(expectedCreatorShare, ethers.parseEther("0.01"));

      // Withdraw creator funds
      await amm.connect(creator).withdrawGraduationFunds();

      const creatorGain = (await ethers.provider.getBalance(creator.address)) - initialCreatorBalance;
      expect(creatorGain).to.be.closeTo(expectedCreatorShare, ethers.parseEther("0.01"));
    });

    it("Should emit LiquidityAdded event on graduation", async function () {
      const { amm, token, trader1, graduationThreshold, pairAddress } =
        await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      // Buy tokens to trigger graduation
      const tx = await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });
      const receipt = await tx.wait();

      // Find LiquidityAdded event
      const liquidityEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = amm.interface.parseLog(log);
          return parsed?.name === "LiquidityAdded";
        } catch {
          return false;
        }
      });

      expect(liquidityEvent).to.not.be.undefined;

      const parsedEvent = amm.interface.parseLog(liquidityEvent!);
      expect(parsedEvent?.args.tokenAmount).to.be.gt(0);
      expect(parsedEvent?.args.nativeAmount).to.be.gt(0);
      expect(parsedEvent?.args.liquidity).to.be.gt(0);
      expect(parsedEvent?.args.dexPair).to.equal(pairAddress);
    });

    it("Should not revert graduation if DEX liquidity fails (DoS prevention)", async function () {
      const { amm, dexRouter, trader1, graduationThreshold } = await loadFixture(deployDEXFixture);

      // Make DEX router revert
      await dexRouter.setShouldRevert(true);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      // Should not revert even if DEX fails
      await expect(amm.connect(trader1).buyTokens(0, { value: nativeNeeded })).to.not.be.reverted;

      // Should still be graduated
      expect(await amm.isGraduated()).to.be.true;
    });
  });

  describe("LP Token Locking", function () {
    it("Should lock LP tokens for 6 months", async function () {
      const { amm, trader1, graduationThreshold } = await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      const graduationTime = await time.latest();
      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Check LP tokens are locked
      const lpTokensLocked = await amm.lpTokensLocked();
      expect(lpTokensLocked).to.be.gt(0);

      // Check unlock time is ~6 months from now
      const unlockTime = await amm.lpUnlockTime();
      const expectedUnlockTime = graduationTime + SIX_MONTHS;
      expect(unlockTime).to.be.closeTo(expectedUnlockTime, 5); // Within 5 seconds
    });

    it("Should emit LPTokensLocked event", async function () {
      const { amm, trader1, graduationThreshold } = await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      const tx = await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });
      const receipt = await tx.wait();

      // Find LPTokensLocked event
      const lockEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = amm.interface.parseLog(log);
          return parsed?.name === "LPTokensLocked";
        } catch {
          return false;
        }
      });

      expect(lockEvent).to.not.be.undefined;

      const parsedEvent = amm.interface.parseLog(lockEvent!);
      expect(parsedEvent?.args.amount).to.be.gt(0);
      expect(parsedEvent?.args.unlockTime).to.be.gt(await time.latest());
    });

    it("Should prevent LP withdrawal before lock period", async function () {
      const { amm, creator, trader1, graduationThreshold } = await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Try to withdraw immediately
      await expect(amm.connect(creator).withdrawLPTokens()).to.be.revertedWithCustomError(
        amm,
        "LPTokensStillLocked"
      );
    });

    it("Should allow LP withdrawal after lock period", async function () {
      const { amm, creator, trader1, graduationThreshold, pairAddress } =
        await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      const lpTokensBefore = await amm.lpTokensLocked();
      expect(lpTokensBefore).to.be.gt(0);

      // Fast forward 6 months
      await time.increase(SIX_MONTHS);

      // Get LP token contract
      const lpToken = await ethers.getContractAt("MockLPToken", pairAddress);
      const creatorBalanceBefore = await lpToken.balanceOf(creator.address);

      // Withdraw LP tokens
      await expect(amm.connect(creator).withdrawLPTokens())
        .to.emit(amm, "LPTokensWithdrawn")
        .withArgs(creator.address, lpTokensBefore, await amm.lpTokenAddress());

      // Check LP tokens transferred to creator
      const creatorBalanceAfter = await lpToken.balanceOf(creator.address);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(lpTokensBefore);

      // Check lpTokensLocked is now 0
      expect(await amm.lpTokensLocked()).to.equal(0);
    });

    it("Should only allow creator to withdraw LP tokens", async function () {
      const { amm, trader1, trader2, graduationThreshold } = await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Fast forward 6 months
      await time.increase(SIX_MONTHS);

      // Non-creator should not be able to withdraw
      await expect(amm.connect(trader2).withdrawLPTokens()).to.be.revertedWithCustomError(
        amm,
        "NoWithdrawableFunds"
      );
    });
  });

  describe("Post-Graduation Trading", function () {
    it("Should prevent trading after graduation", async function () {
      const { amm, trader1, trader2, graduationThreshold } = await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Should be graduated
      expect(await amm.isGraduated()).to.be.true;

      // Try to buy more tokens
      await expect(
        amm.connect(trader2).buyTokens(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(amm, "TradingClosed");

      // Try to sell tokens
      await expect(
        amm.connect(trader1).sellTokens(ethers.parseEther("100"), 0)
      ).to.be.revertedWithCustomError(amm, "TradingClosed");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle exact graduation threshold", async function () {
      const { amm, trader1, graduationThreshold } = await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      expect(await amm.isGraduated()).to.be.true;
      expect(await amm.currentSupply()).to.be.gte(graduationThreshold);
    });

    it("Should handle multiple small trades leading to graduation", async function () {
      const { amm, trader1, trader2, graduationThreshold } = await loadFixture(deployDEXFixture);

      const tokensPerTrade = graduationThreshold / 10n;
      const nativePerTrade = await amm.calculateNativeIn(tokensPerTrade, 0n);

      // Make 9 trades (not quite graduated)
      for (let i = 0; i < 9; i++) {
        const currentSupply = await amm.currentSupply();
        const tokensNeeded = tokensPerTrade;
        const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, currentSupply);
        await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });
      }

      expect(await amm.isGraduated()).to.be.false;

      // Final trade should trigger graduation
      const currentSupply = await amm.currentSupply();
      const remainingTokens = graduationThreshold - currentSupply;
      const finalNative = await amm.calculateNativeIn(remainingTokens, currentSupply);

      await amm.connect(trader2).buyTokens(0, { value: finalNative });

      expect(await amm.isGraduated()).to.be.true;
    });

    it("Should handle zero LP tokens case gracefully", async function () {
      const { amm, creator, trader1, graduationThreshold, dexRouter } =
        await loadFixture(deployDEXFixture);

      // Make DEX fail so no LP tokens are locked
      await dexRouter.setShouldRevert(true);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Should be graduated even though LP failed
      expect(await amm.isGraduated()).to.be.true;

      // Fast forward 6 months
      await time.increase(SIX_MONTHS);

      // Should revert when trying to withdraw 0 LP tokens
      await expect(amm.connect(creator).withdrawLPTokens()).to.be.revertedWithCustomError(
        amm,
        "NoLPTokensToWithdraw"
      );
    });
  });

  describe("DEX Router Configuration", function () {
    it("Should store correct DEX router address", async function () {
      const { amm, dexRouter } = await loadFixture(deployDEXFixture);

      expect(await amm.dexRouter()).to.equal(await dexRouter.getAddress());
    });

    it("Should approve tokens to DEX router before adding liquidity", async function () {
      const { amm, token, dexRouter, trader1, graduationThreshold } =
        await loadFixture(deployDEXFixture);

      const tokensNeeded = graduationThreshold;
      const nativeNeeded = await amm.calculateNativeIn(tokensNeeded, 0n);

      await amm.connect(trader1).buyTokens(0, { value: nativeNeeded });

      // Check that tokens were transferred to DEX
      const dexRouterAddress = await dexRouter.getAddress();
      const routerBalance = await token.balanceOf(dexRouterAddress);
      expect(routerBalance).to.be.gt(0);
    });
  });
});
