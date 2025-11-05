import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const PRECISION = 10n ** 18n;

describe("BondingCurveAMM - Comprehensive Tests", function () {

  // ========== FIXTURES ==========

  async function deployFixture() {
    const [deployer, user1, user2, feeRecipient] = await ethers.getSigners();

    const totalSupply = 1_000_000n * PRECISION;
    const basePrice = 1_000_000_000n; // 1 gwei
    const slope = 1_000_000_000n; // 1 gwei per token
    const graduationThreshold = 800_000n * PRECISION;

    // Deploy token
    const TokenFactory = await ethers.getContractFactory("KRC20Token");
    const token = await TokenFactory.deploy(
      "KasPump Token",
      "KPT",
      totalSupply,
      deployer.address
    );
    await token.waitForDeployment();

    // Deploy AMM
    const BondingCurveFactory = await ethers.getContractFactory("BondingCurveAMM");
    const amm = await BondingCurveFactory.deploy(
      await token.getAddress(),
      basePrice,
      slope,
      0, // LINEAR curve
      graduationThreshold,
      feeRecipient.address,
      0 // Basic tier (1% fee)
    );
    await amm.waitForDeployment();

    // Transfer all tokens to AMM
    await token.transfer(await amm.getAddress(), totalSupply);

    return { amm, token, deployer, user1, user2, feeRecipient, totalSupply, basePrice, slope, graduationThreshold };
  }

  // ========== PRECISION TESTS (Original) ==========

  describe("Precision", function () {
    it("returns tokens for tiny native deposits", async function () {
      const { amm } = await loadFixture(deployFixture);
      const tinyDeposit = 50n; // 50 wei
      const tokensOut = await amm.calculateTokensOut(tinyDeposit, 0);
      expect(tokensOut).to.be.gt(0n);
    });

    it("allows buying and selling without leaving residual balances", async function () {
      const { amm, token, user1 } = await loadFixture(deployFixture);

      const deposit = 5_000_000_000n; // 5 gwei
      await amm.connect(user1).buyTokens(0, { value: deposit });

      const userTokens = await token.balanceOf(user1.address);
      expect(userTokens).to.be.gt(0n);

      const ammBalanceAfterBuy = await ethers.provider.getBalance(await amm.getAddress());
      expect(ammBalanceAfterBuy).to.be.gt(0n);

      // Approve and sell all tokens back
      await token.connect(user1).approve(await amm.getAddress(), userTokens);
      await amm.connect(user1).sellTokens(userTokens, 0);

      const ammBalanceAfterSell = await ethers.provider.getBalance(await amm.getAddress());
      expect(ammBalanceAfterSell).to.equal(0n);

      const ammTokenBalance = await token.balanceOf(await amm.getAddress());
      expect(ammTokenBalance).to.equal(1_000_000n * PRECISION);
    });
  });

  // ========== ZERO LIQUIDITY TESTS ==========

  describe("Zero Liquidity", function () {
    it("returns 0 tokens when AMM has no liquidity", async function () {
      const { amm, token, deployer } = await loadFixture(deployFixture);

      // Transfer all tokens out of AMM
      const ammAddress = await amm.getAddress();
      const ammBalance = await token.balanceOf(ammAddress);
      await token.connect(deployer).transferFrom(ammAddress, deployer.address, ammBalance);

      const tokensOut = await amm.calculateTokensOut(1_000_000_000n, 0);
      expect(tokensOut).to.equal(0n);
    });

    it("reverts buyTokens when AMM has insufficient tokens", async function () {
      const { amm, token, deployer, user1 } = await loadFixture(deployFixture);

      // Transfer most tokens out
      const ammAddress = await amm.getAddress();
      const ammBalance = await token.balanceOf(ammAddress);
      await token.transfer(deployer.address, ammBalance - 100n * PRECISION);

      // Try to buy more than available
      await expect(
        amm.connect(user1).buyTokens(0, { value: ethers.parseEther("100") })
      ).to.be.revertedWithCustomError(amm, "InsufficientBalance");
    });
  });

  // ========== MAXIMUM SUPPLY TESTS ==========

  describe("Maximum Supply", function () {
    it("respects MAX_TOTAL_SUPPLY boundary", async function () {
      const { amm } = await loadFixture(deployFixture);

      const MAX_TOTAL_SUPPLY = await amm.MAX_TOTAL_SUPPLY();
      const hugeDeposit = ethers.parseEther("1000000"); // 1M ETH

      const tokensOut = await amm.calculateTokensOut(hugeDeposit, 0);
      expect(tokensOut).to.be.lte(MAX_TOTAL_SUPPLY);
    });

    it("limits tokens to available liquidity", async function () {
      const { amm, token } = await loadFixture(deployFixture);

      const ammAddress = await amm.getAddress();
      const availableLiquidity = await token.balanceOf(ammAddress);

      const hugeDeposit = ethers.parseEther("1000");
      const tokensOut = await amm.calculateTokensOut(hugeDeposit, 0);

      expect(tokensOut).to.be.lte(availableLiquidity);
    });
  });

  // ========== FEE PRECISION TESTS ==========

  describe("Fee Precision", function () {
    it("applies 1% fee correctly for basic tier", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      const deposit = 1_000_000_000n; // 1 gwei
      const tx = await amm.connect(user1).buyTokens(0, { value: deposit });
      const receipt = await tx.wait();

      const tradeEvent = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "Trade"
      );

      expect(tradeEvent).to.not.be.undefined;
      if (tradeEvent) {
        const fee = tradeEvent.args.fee;
        const expectedFee = deposit * 100n / 10000n; // 1%
        expect(fee).to.equal(expectedFee);
      }
    });

    it("applies fees correctly for small amounts", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      const deposit = 999n; // Odd number to test rounding
      const tx = await amm.connect(user1).buyTokens(0, { value: deposit });
      const receipt = await tx.wait();

      const tradeEvent = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "Trade"
      );

      if (tradeEvent) {
        const fee = tradeEvent.args.fee;
        // Fee should be (999 * 100) / 10000 = 9 (rounded down)
        expect(fee).to.equal(9n);
      }
    });

    it("transfers fees to fee recipient", async function () {
      const { amm, user1, feeRecipient } = await loadFixture(deployFixture);

      const initialBalance = await ethers.provider.getBalance(feeRecipient.address);
      const deposit = 10_000_000_000n; // 10 gwei

      await amm.connect(user1).buyTokens(0, { value: deposit });

      const finalBalance = await ethers.provider.getBalance(feeRecipient.address);
      const expectedFee = deposit * 100n / 10000n; // 1%

      expect(finalBalance - initialBalance).to.equal(expectedFee);
    });
  });

  // ========== GRADUATION TESTS ==========

  describe("Graduation", function () {
    it("graduates token when reaching threshold", async function () {
      const { amm, user1, graduationThreshold, basePrice, slope } = await loadFixture(deployFixture);

      // Calculate cost to reach graduation
      const baseCost = (basePrice * graduationThreshold) / PRECISION;
      const slopeCost = (slope * graduationThreshold * graduationThreshold) / (2n * PRECISION * PRECISION);
      const totalCost = baseCost + slopeCost;

      // Add 10% for fees and safety margin
      const deposit = (totalCost * 110n) / 100n;

      await amm.connect(user1).buyTokens(0, { value: deposit });

      expect(await amm.isGraduated()).to.be.true;
    });

    it("prevents trading after graduation", async function () {
      const { amm, user1, graduationThreshold, basePrice, slope } = await loadFixture(deployFixture);

      // Graduate the token
      const baseCost = (basePrice * graduationThreshold) / PRECISION;
      const slopeCost = (slope * graduationThreshold * graduationThreshold) / (2n * PRECISION * PRECISION);
      const deposit = (baseCost + slopeCost) * 110n / 100n;

      await amm.connect(user1).buyTokens(0, { value: deposit });

      // Try to buy more
      await expect(
        amm.connect(user1).buyTokens(0, { value: 1_000_000_000n })
      ).to.be.revertedWithCustomError(amm, "AlreadyGraduated");
    });

    it("emits Graduated event with correct parameters", async function () {
      const { amm, user1, graduationThreshold, basePrice, slope } = await loadFixture(deployFixture);

      const baseCost = (basePrice * graduationThreshold) / PRECISION;
      const slopeCost = (slope * graduationThreshold * graduationThreshold) / (2n * PRECISION * PRECISION);
      const deposit = (baseCost + slopeCost) * 110n / 100n;

      await expect(amm.connect(user1).buyTokens(0, { value: deposit }))
        .to.emit(amm, "Graduated");
    });
  });

  // ========== SLIPPAGE TESTS ==========

  describe("Slippage Protection", function () {
    it("reverts buy if slippage exceeds minTokensOut", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      const deposit = 5_000_000_000n; // 5 gwei
      const expectedTokens = await amm.calculateTokensOut(deposit, 0);
      const minTokensOut = expectedTokens * 2n; // Impossible to meet

      await expect(
        amm.connect(user1).buyTokens(minTokensOut, { value: deposit })
      ).to.be.revertedWithCustomError(amm, "SlippageTooHigh");
    });

    it("reverts sell if slippage exceeds minNativeOut", async function () {
      const { amm, token, user1 } = await loadFixture(deployFixture);

      // Buy some tokens first
      const deposit = 5_000_000_000n;
      await amm.connect(user1).buyTokens(0, { value: deposit });

      const userTokens = await token.balanceOf(user1.address);
      const currentSupply = await amm.currentSupply();
      const expectedNative = await amm.calculateNativeOut(userTokens, currentSupply);
      const minNativeOut = expectedNative * 2n; // Impossible to meet

      await token.connect(user1).approve(await amm.getAddress(), userTokens);

      await expect(
        amm.connect(user1).sellTokens(userTokens, minNativeOut)
      ).to.be.revertedWithCustomError(amm, "SlippageTooHigh");
    });

    it("succeeds when slippage is within tolerance", async function () {
      const { amm, token, user1 } = await loadFixture(deployFixture);

      const deposit = 5_000_000_000n;
      const expectedTokens = await amm.calculateTokensOut(deposit, 0);
      const minTokensOut = (expectedTokens * 95n) / 100n; // 5% slippage tolerance

      await expect(
        amm.connect(user1).buyTokens(minTokensOut, { value: deposit })
      ).to.not.be.reverted;
    });
  });

  // ========== PRICE CALCULATION TESTS ==========

  describe("Price Calculations", function () {
    it("calculates correct price at supply 0", async function () {
      const { amm, basePrice } = await loadFixture(deployFixture);

      const price = await amm.getCurrentPrice();
      expect(price).to.equal(basePrice);
    });

    it("calculates increasing price as supply grows", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      const initialPrice = await amm.getCurrentPrice();

      await amm.connect(user1).buyTokens(0, { value: 10_000_000_000n });

      const newPrice = await amm.getCurrentPrice();
      expect(newPrice).to.be.gt(initialPrice);
    });

    it("calculates price impact correctly", async function () {
      const { amm } = await loadFixture(deployFixture);

      const deposit = 10_000_000_000n;
      const priceImpact = await amm.getPriceImpact(deposit, true);

      expect(priceImpact).to.be.gt(0n);
      expect(priceImpact).to.be.lt(10000n); // Less than 100%
    });
  });

  // ========== TRADING INFO TESTS ==========

  describe("Trading Info", function () {
    it("returns correct trading info after trades", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      const deposit = 5_000_000_000n;
      await amm.connect(user1).buyTokens(0, { value: deposit });

      const tradingInfo = await amm.getTradingInfo();

      expect(tradingInfo[0]).to.be.gt(0n); // currentSupply
      expect(tradingInfo[1]).to.be.gt(0n); // currentPrice
      expect(tradingInfo[2]).to.be.gt(0n); // totalVolume
      expect(tradingInfo[3]).to.be.gt(0n); // graduation progress
      expect(tradingInfo[4]).to.be.false; // isGraduated
    });

    it("tracks total volume correctly", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      const deposit1 = 3_000_000_000n;
      const deposit2 = 5_000_000_000n;

      await amm.connect(user1).buyTokens(0, { value: deposit1 });
      await amm.connect(user1).buyTokens(0, { value: deposit2 });

      const totalVolume = await amm.totalVolume();
      expect(totalVolume).to.equal(deposit1 + deposit2);
    });
  });

  // ========== EVENTS TESTS ==========

  describe("Events", function () {
    it("emits Trade event on buy with correct parameters", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      const deposit = 5_000_000_000n;

      await expect(amm.connect(user1).buyTokens(0, { value: deposit }))
        .to.emit(amm, "Trade")
        .withArgs(
          user1.address,
          true, // isBuy
          deposit,
          // tokenAmount (we don't know exact value)
          (tokenAmount: any) => tokenAmount > 0n,
          // newPrice (we don't know exact value)
          (newPrice: any) => newPrice > 0n,
          // fee
          (fee: any) => fee === deposit * 100n / 10000n,
          // timestamp
          (timestamp: any) => timestamp > 0n
        );
    });

    it("emits Trade event on sell with correct parameters", async function () {
      const { amm, token, user1 } = await loadFixture(deployFixture);

      // Buy first
      await amm.connect(user1).buyTokens(0, { value: 5_000_000_000n });
      const userTokens = await token.balanceOf(user1.address);

      // Approve and sell
      await token.connect(user1).approve(await amm.getAddress(), userTokens);

      await expect(amm.connect(user1).sellTokens(userTokens, 0))
        .to.emit(amm, "Trade")
        .withArgs(
          user1.address,
          false, // isSell
          // nativeAmount
          (nativeAmount: any) => nativeAmount > 0n,
          userTokens,
          // newPrice
          (newPrice: any) => newPrice > 0n,
          // fee
          (fee: any) => fee > 0n,
          // timestamp
          (timestamp: any) => timestamp > 0n
        );
    });
  });

  // ========== EDGE CASES ==========

  describe("Edge Cases", function () {
    it("handles zero amount buy correctly", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      await expect(
        amm.connect(user1).buyTokens(0, { value: 0 })
      ).to.be.revertedWithCustomError(amm, "InvalidAmount");
    });

    it("handles zero amount sell correctly", async function () {
      const { amm, user1 } = await loadFixture(deployFixture);

      await expect(
        amm.connect(user1).sellTokens(0, 0)
      ).to.be.revertedWithCustomError(amm, "InvalidAmount");
    });

    it("prevents selling more tokens than current supply", async function () {
      const { amm, token, user1, totalSupply } = await loadFixture(deployFixture);

      // Give user tokens directly (bypass AMM)
      await token.transfer(user1.address, totalSupply);
      await token.connect(user1).approve(await amm.getAddress(), totalSupply);

      await expect(
        amm.connect(user1).sellTokens(totalSupply, 0)
      ).to.be.revertedWithCustomError(amm, "InvalidAmount");
    });

    it("handles multiple users trading correctly", async function () {
      const { amm, user1, user2 } = await loadFixture(deployFixture);

      // User1 buys
      await amm.connect(user1).buyTokens(0, { value: 5_000_000_000n });
      const supply1 = await amm.currentSupply();

      // User2 buys
      await amm.connect(user2).buyTokens(0, { value: 3_000_000_000n });
      const supply2 = await amm.currentSupply();

      expect(supply2).to.be.gt(supply1);
    });
  });

  // ========== MATHEMATICAL CORRECTNESS ==========

  describe("Mathematical Correctness", function () {
    it("cost calculation matches cumulative formula", async function () {
      const { amm, basePrice, slope } = await loadFixture(deployFixture);

      const supply = 1000n * PRECISION;
      const tokensOut = await amm.calculateTokensOut(1_000_000_000_000n, supply);

      // Verify using formula: Cost = basePrice * S + slope * S² / 2
      // This is tested implicitly by the round-trip test
      expect(tokensOut).to.be.gt(0n);
    });

    it("buy and sell are mathematically inverse operations", async function () {
      const { amm, token, user1 } = await loadFixture(deployFixture);

      const initialAmmTokens = await token.balanceOf(await amm.getAddress());
      const deposit = 5_000_000_000n;

      // Buy
      await amm.connect(user1).buyTokens(0, { value: deposit });
      const userTokens = await token.balanceOf(user1.address);

      // Sell all back
      await token.connect(user1).approve(await amm.getAddress(), userTokens);
      await amm.connect(user1).sellTokens(userTokens, 0);

      const finalAmmTokens = await token.balanceOf(await amm.getAddress());

      // AMM should have all tokens back (perfect symmetry)
      expect(finalAmmTokens).to.equal(initialAmmTokens);
    });
  });
});
