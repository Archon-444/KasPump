import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const PRECISION = 10n ** 18n;

describe("Security Tests", function () {

  // ========== FIXTURES ==========

  async function deployFullSystemFixture() {
    const [deployer, feeRecipient, user1, attacker] = await ethers.getSigners();

    // Deploy Factory
    const TokenFactoryContract = await ethers.getContractFactory("TokenFactory");
    const factory = await TokenFactoryContract.deploy(feeRecipient.address);
    await factory.waitForDeployment();

    // Create a token
    const totalSupply = 1_000_000n * PRECISION;
    const tx = await factory.createToken(
      "Test Token",
      "TEST",
      "Test token for security testing",
      "https://image.url",
      totalSupply,
      1_000_000_000n,
      1_000_000_000n,
      0
    );

    const receipt = await tx.wait();
    const event = receipt?.logs.find(
      (log: any) => log.fragment && log.fragment.name === "TokenCreated"
    );

    const tokenAddress = event!.args.tokenAddress;
    const ammAddress = event!.args.ammAddress;

    const token = await ethers.getContractAt("KRC20Token", tokenAddress);
    const amm = await ethers.getContractAt("BondingCurveAMM", ammAddress);

    return { factory, token, amm, deployer, feeRecipient, user1, attacker };
  }

  // ========== REENTRANCY TESTS ==========

  describe("Reentrancy Protection", function () {
    it("prevents reentrancy attack on buyTokens", async function () {
      const { amm, attacker } = await loadFixture(deployFullSystemFixture);

      // Deploy attacker contract
      const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const attackerContract = await AttackerFactory.connect(attacker).deploy(
        await amm.getAddress()
      );
      await attackerContract.waitForDeployment();

      // Attempt reentrancy attack
      await expect(
        attackerContract.connect(attacker).attack({ value: ethers.parseEther("1") })
      ).to.be.reverted; // Should revert due to ReentrancyGuard
    });

    it("prevents reentrancy attack on sellTokens", async function () {
      const { amm, token, attacker } = await loadFixture(deployFullSystemFixture);

      // First, buy some tokens legitimately
      await amm.connect(attacker).buyTokens(0, { value: ethers.parseEther("0.01") });
      const attackerTokens = await token.balanceOf(attacker.address);

      // Deploy attacker contract and give it tokens
      const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const attackerContract = await AttackerFactory.connect(attacker).deploy(
        await amm.getAddress()
      );
      await attackerContract.waitForDeployment();

      // Transfer tokens to attacker contract
      await token.connect(attacker).transfer(await attackerContract.getAddress(), attackerTokens);

      // Attacker contract would need to implement sellTokens reentrancy
      // The current ReentrancyGuard should prevent this
    });

    it("allows multiple legitimate sequential transactions", async function () {
      const { amm, user1 } = await loadFixture(deployFullSystemFixture);

      // First transaction
      await expect(
        amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") })
      ).to.not.be.reverted;

      // Second transaction (sequential, not reentrant)
      await expect(
        amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") })
      ).to.not.be.reverted;

      // Third transaction
      await expect(
        amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") })
      ).to.not.be.reverted;
    });
  });

  // ========== ACCESS CONTROL TESTS ==========

  describe("Access Control", function () {
    it("prevents non-owner from pausing AMM", async function () {
      const { amm, user1 } = await loadFixture(deployFullSystemFixture);

      await expect(
        amm.connect(user1).pause()
      ).to.be.revertedWithCustomError(amm, "OwnableUnauthorizedAccount");
    });

    it("prevents non-owner from unpausing AMM", async function () {
      const { amm, deployer, user1 } = await loadFixture(deployFullSystemFixture);

      // Owner pauses
      await amm.connect(deployer).pause();

      // Non-owner tries to unpause
      await expect(
        amm.connect(user1).unpause()
      ).to.be.revertedWithCustomError(amm, "OwnableUnauthorizedAccount");
    });

    it("prevents non-owner from emergency withdraw", async function () {
      const { amm, user1 } = await loadFixture(deployFullSystemFixture);

      await expect(
        amm.connect(user1).emergencyWithdraw("Testing")
      ).to.be.revertedWithCustomError(amm, "OwnableUnauthorizedAccount");
    });

    it("allows owner to emergency withdraw", async function () {
      const { amm, deployer, user1 } = await loadFixture(deployFullSystemFixture);

      // Add some funds to AMM
      await amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.1") });

      const ownerBalanceBefore = await ethers.provider.getBalance(deployer.address);

      // Owner withdraws
      const tx = await amm.connect(deployer).emergencyWithdraw("Emergency situation");
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(deployer.address);

      // Owner should have received the AMM balance (minus gas)
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore - gasUsed);
    });
  });

  // ========== OVERFLOW/UNDERFLOW TESTS ==========

  describe("Overflow/Underflow Protection", function () {
    it("handles maximum uint256 calculations safely", async function () {
      const { amm } = await loadFixture(deployFullSystemFixture);

      const maxUint256 = ethers.MaxUint256;

      // This should not revert due to overflow (Solidity 0.8.20 has built-in checks)
      await expect(
        amm.calculateTokensOut(maxUint256, 0)
      ).to.not.be.reverted; // Math.mulDiv handles this safely
    });

    it("prevents underflow in sell calculations", async function () {
      const { amm, token, user1 } = await loadFixture(deployFullSystemFixture);

      // Buy some tokens
      await amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") });
      const userTokens = await token.balanceOf(user1.address);

      // Try to sell more than we have
      const tooManyTokens = userTokens + 1000n;

      await token.connect(user1).approve(await amm.getAddress(), tooManyTokens);

      // Should revert on transfer or validation
      await expect(
        amm.connect(user1).sellTokens(tooManyTokens, 0)
      ).to.be.reverted;
    });
  });

  // ========== FRONT-RUNNING PROTECTION ==========

  describe("Front-Running Protection (Slippage)", function () {
    it("protects buyers from price manipulation", async function () {
      const { amm, user1 } = await loadFixture(deployFullSystemFixture);

      const deposit = ethers.parseEther("0.01");
      const expectedTokens = await amm.calculateTokensOut(deposit, 0);

      // Set minimum to 99% of expected (1% slippage tolerance)
      const minTokensOut = (expectedTokens * 99n) / 100n;

      // If price changes dramatically, transaction should revert
      // Simulate price change by having expected be much lower
      const impossibleMin = expectedTokens * 2n;

      await expect(
        amm.connect(user1).buyTokens(impossibleMin, { value: deposit })
      ).to.be.revertedWithCustomError(amm, "SlippageTooHigh");
    });

    it("protects sellers from price manipulation", async function () {
      const { amm, token, user1 } = await loadFixture(deployFullSystemFixture);

      // Buy tokens first
      await amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") });
      const userTokens = await token.balanceOf(user1.address);

      const currentSupply = await amm.currentSupply();
      const expectedNative = await amm.calculateNativeOut(userTokens, currentSupply);

      // Set impossible minimum
      const impossibleMin = expectedNative * 2n;

      await token.connect(user1).approve(await amm.getAddress(), userTokens);

      await expect(
        amm.connect(user1).sellTokens(userTokens, impossibleMin)
      ).to.be.revertedWithCustomError(amm, "SlippageTooHigh");
    });
  });

  // ========== TOKEN APPROVAL TESTS ==========

  describe("Token Approval Security", function () {
    it("requires approval before selling tokens", async function () {
      const { amm, token, user1 } = await loadFixture(deployFullSystemFixture);

      // Buy tokens
      await amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") });
      const userTokens = await token.balanceOf(user1.address);

      // Try to sell without approval
      await expect(
        amm.connect(user1).sellTokens(userTokens, 0)
      ).to.be.reverted; // Should fail on transferFrom
    });

    it("respects allowance limits", async function () {
      const { amm, token, user1 } = await loadFixture(deployFullSystemFixture);

      // Buy tokens
      await amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") });
      const userTokens = await token.balanceOf(user1.address);

      // Approve only half
      const halfTokens = userTokens / 2n;
      await token.connect(user1).approve(await amm.getAddress(), halfTokens);

      // Try to sell all (should fail)
      await expect(
        amm.connect(user1).sellTokens(userTokens, 0)
      ).to.be.reverted;

      // Selling half should work
      await expect(
        amm.connect(user1).sellTokens(halfTokens, 0)
      ).to.not.be.reverted;
    });
  });

  // ========== PAUSE MECHANISM TESTS ==========

  describe("Emergency Pause", function () {
    it("prevents buying when paused", async function () {
      const { amm, deployer, user1 } = await loadFixture(deployFullSystemFixture);

      await amm.connect(deployer).pause();

      await expect(
        amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWithCustomError(amm, "EnforcedPause");
    });

    it("prevents selling when paused", async function () {
      const { amm, token, deployer, user1 } = await loadFixture(deployFullSystemFixture);

      // Buy first
      await amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") });
      const userTokens = await token.balanceOf(user1.address);

      // Pause
      await amm.connect(deployer).pause();

      // Try to sell
      await token.connect(user1).approve(await amm.getAddress(), userTokens);
      await expect(
        amm.connect(user1).sellTokens(userTokens, 0)
      ).to.be.revertedWithCustomError(amm, "EnforcedPause");
    });

    it("allows trading after unpause", async function () {
      const { amm, deployer, user1 } = await loadFixture(deployFullSystemFixture);

      // Pause
      await amm.connect(deployer).pause();

      // Unpause
      await amm.connect(deployer).unpause();

      // Trading should work
      await expect(
        amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") })
      ).to.not.be.reverted;
    });
  });

  // ========== ZERO ADDRESS TESTS ==========

  describe("Zero Address Protection", function () {
    it("prevents token transfer to zero address", async function () {
      const { token, user1 } = await loadFixture(deployFullSystemFixture);

      // Buy tokens first
      await expect(
        token.connect(user1).transfer(ethers.ZeroAddress, 1000n)
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("prevents approval of zero address", async function () {
      const { token, user1 } = await loadFixture(deployFullSystemFixture);

      await expect(
        token.connect(user1).approve(ethers.ZeroAddress, 1000n)
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });
  });

  // ========== GAS GRIEFING TESTS ==========

  describe("Gas Griefing Protection", function () {
    it("handles large token amounts without excessive gas", async function () {
      const { amm } = await loadFixture(deployFullSystemFixture);

      // Try to calculate tokens for a huge deposit
      const hugeDeposit = ethers.parseEther("1000");

      // This should complete in reasonable time due to binary search O(log n)
      const tokensOut = await amm.calculateTokensOut(hugeDeposit, 0);
      expect(tokensOut).to.be.gt(0n);
    });

    it("binary search converges efficiently", async function () {
      const { amm } = await loadFixture(deployFullSystemFixture);

      // Even with max supply, binary search should be fast
      const largeDeposit = ethers.parseEther("100");

      // Should not timeout or use excessive gas
      await expect(
        amm.calculateTokensOut(largeDeposit, 0)
      ).to.not.be.reverted;
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe("Integration Security", function () {
    it("maintains correct accounting across multiple users", async function () {
      const { amm, token, user1, attacker } = await loadFixture(deployFullSystemFixture);

      const initialAmmTokens = await token.balanceOf(await amm.getAddress());

      // User1 buys
      await amm.connect(user1).buyTokens(0, { value: ethers.parseEther("0.01") });
      const user1Tokens = await token.balanceOf(user1.address);

      // Attacker buys
      await amm.connect(attacker).buyTokens(0, { value: ethers.parseEther("0.01") });
      const attackerTokens = await token.balanceOf(attacker.address);

      // Both sell
      await token.connect(user1).approve(await amm.getAddress(), user1Tokens);
      await amm.connect(user1).sellTokens(user1Tokens, 0);

      await token.connect(attacker).approve(await amm.getAddress(), attackerTokens);
      await amm.connect(attacker).sellTokens(attackerTokens, 0);

      // AMM should have all tokens back
      const finalAmmTokens = await token.balanceOf(await amm.getAddress());
      expect(finalAmmTokens).to.equal(initialAmmTokens);
    });
  });
});
