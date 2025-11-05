import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const PRECISION = 10n ** 18n;

describe("TokenFactory - Comprehensive Tests", function () {

  // ========== FIXTURES ==========

  async function deployFactoryFixture() {
    const [owner, feeRecipient, user1, user2] = await ethers.getSigners();

    const TokenFactoryContract = await ethers.getContractFactory("TokenFactory");
    const factory = await TokenFactoryContract.deploy(feeRecipient.address);
    await factory.waitForDeployment();

    return { factory, owner, feeRecipient, user1, user2 };
  }

  // ========== TOKEN CREATION TESTS ==========

  describe("Token Creation", function () {
    it("creates token and transfers entire supply to AMM", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const totalSupply = 1_000_000n * PRECISION;
      const tx = await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "A test token",
        "https://image.url",
        totalSupply,
        1_000_000_000n, // basePrice
        1_000_000_000n, // slope
        0 // LINEAR
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "TokenCreated"
      );

      expect(event).to.not.be.undefined;

      if (event) {
        const tokenAddress = event.args.tokenAddress;
        const ammAddress = event.args.ammAddress;

        const token = await ethers.getContractAt("KRC20Token", tokenAddress);

        // Factory should have 0 tokens
        expect(await token.balanceOf(await factory.getAddress())).to.equal(0n);

        // AMM should have all tokens
        expect(await token.balanceOf(ammAddress)).to.equal(totalSupply);
      }
    });

    it("emits TokenCreated event with correct parameters", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.emit(factory, "TokenCreated");
    });

    it("stores token configuration correctly", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const totalSupply = 1_000_000n * PRECISION;
      const basePrice = 1_000_000_000n;
      const slope = 1_000_000_000n;

      const tx = await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "Description",
        "https://image.url",
        totalSupply,
        basePrice,
        slope,
        0
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "TokenCreated"
      );

      if (event) {
        const tokenAddress = event.args.tokenAddress;
        const config = await factory.getTokenConfig(tokenAddress);

        expect(config.name).to.equal("Test Token");
        expect(config.symbol).to.equal("TEST");
        expect(config.description).to.equal("Description");
        expect(config.totalSupply).to.equal(totalSupply);
        expect(config.basePrice).to.equal(basePrice);
        expect(config.slope).to.equal(slope);
        expect(config.creator).to.equal(user1.address);
      }
    });

    it("maps token to AMM address correctly", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "TokenCreated"
      );

      if (event) {
        const tokenAddress = event.args.tokenAddress;
        const ammAddress = event.args.ammAddress;

        const storedAmmAddress = await factory.getTokenAMM(tokenAddress);
        expect(storedAmmAddress).to.equal(ammAddress);
      }
    });

    it("marks token as KasPump token", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tx = await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment && log.fragment.name === "TokenCreated"
      );

      if (event) {
        const tokenAddress = event.args.tokenAddress;
        expect(await factory.isKasPumpToken(tokenAddress)).to.be.true;
      }
    });

    it("adds token to allTokens array", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const initialCount = await factory.getTotalTokens();

      await factory.connect(user1).createToken(
        "Test Token",
        "TEST",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      const finalCount = await factory.getTotalTokens();
      expect(finalCount).to.equal(initialCount + 1n);

      const allTokens = await factory.getAllTokens();
      expect(allTokens.length).to.be.gt(0);
    });
  });

  // ========== INPUT VALIDATION TESTS ==========

  describe("Input Validation", function () {
    it("reverts with empty name", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createToken(
          "",
          "TEST",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });

    it("reverts with name too long", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const longName = "a".repeat(51); // MAX_NAME_LENGTH is 50

      await expect(
        factory.connect(user1).createToken(
          longName,
          "TEST",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });

    it("reverts with empty symbol", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });

    it("reverts with symbol too long", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const longSymbol = "a".repeat(11); // MAX_SYMBOL_LENGTH is 10

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          longSymbol,
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });

    it("reverts with description too long", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const longDescription = "a".repeat(501); // MAX_DESCRIPTION_LENGTH is 500

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          longDescription,
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });

    it("reverts with totalSupply too small", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          "Description",
          "https://image.url",
          1000n, // Less than MIN_TOTAL_SUPPLY (1e18)
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });

    it("reverts with totalSupply too large", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const tooLarge = 1e12 * PRECISION + 1n; // Greater than MAX_TOTAL_SUPPLY

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          "Description",
          "https://image.url",
          tooLarge,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });

    it("reverts with zero basePrice", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          0, // Zero basePrice
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "InvalidInput");
    });
  });

  // ========== RATE LIMITING TESTS ==========

  describe("Rate Limiting", function () {
    it("allows token creation after cooldown period", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      // Create first token
      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      // Advance time by 60 seconds (CREATION_COOLDOWN)
      await time.increase(60);

      // Should succeed
      await expect(
        factory.connect(user1).createToken(
          "Token 2",
          "TK2",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.not.be.reverted;
    });

    it("reverts if creating token before cooldown", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      // Create first token
      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      // Try to create second token immediately
      await expect(
        factory.connect(user1).createToken(
          "Token 2",
          "TK2",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "RateLimitExceeded");
    });

    it("allows different users to create simultaneously", async function () {
      const { factory, user1, user2 } = await loadFixture(deployFactoryFixture);

      // User1 creates
      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      // User2 can create immediately (different address)
      await expect(
        factory.connect(user2).createToken(
          "Token 2",
          "TK2",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.not.be.reverted;
    });
  });

  // ========== ACCESS CONTROL TESTS ==========

  describe("Access Control", function () {
    it("allows owner to update fee recipient", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(owner).updateFeeRecipient(user1.address)
      ).to.not.be.reverted;

      expect(await factory.feeRecipient()).to.equal(user1.address);
    });

    it("reverts when non-owner tries to update fee recipient", async function () {
      const { factory, user1, user2 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).updateFeeRecipient(user2.address)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("reverts when setting fee recipient to zero address", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(owner).updateFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("allows owner to pause", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await expect(factory.connect(owner).pause()).to.not.be.reverted;
      expect(await factory.paused()).to.be.true;
    });

    it("reverts when non-owner tries to pause", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(user1).pause()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("prevents token creation when paused", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).pause();

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.be.revertedWithCustomError(factory, "EnforcedPause");
    });

    it("allows owner to unpause", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).pause();
      await expect(factory.connect(owner).unpause()).to.not.be.reverted;
      expect(await factory.paused()).to.be.false;
    });

    it("allows token creation after unpause", async function () {
      const { factory, owner, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(owner).pause();
      await factory.connect(owner).unpause();

      await expect(
        factory.connect(user1).createToken(
          "Test Token",
          "TEST",
          "Description",
          "https://image.url",
          1_000_000n * PRECISION,
          1_000_000_000n,
          1_000_000_000n,
          0
        )
      ).to.not.be.reverted;
    });
  });

  // ========== VIEW FUNCTIONS TESTS ==========

  describe("View Functions", function () {
    it("getAllTokens returns correct array", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      await time.increase(60);

      await factory.connect(user1).createToken(
        "Token 2",
        "TK2",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      const tokens = await factory.getAllTokens();
      expect(tokens.length).to.equal(2);
    });

    it("getTotalTokens returns correct count", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      const initialCount = await factory.getTotalTokens();

      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        "Description",
        "https://image.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      const newCount = await factory.getTotalTokens();
      expect(newCount).to.equal(initialCount + 1n);
    });

    it("isValidToken returns false for non-KasPump token", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      const randomAddress = ethers.Wallet.createRandom().address;
      expect(await factory.isValidToken(randomAddress)).to.be.false;
    });
  });

  // ========== MULTIPLE TOKENS TESTS ==========

  describe("Multiple Tokens", function () {
    it("creates multiple tokens with different parameters", async function () {
      const { factory, user1 } = await loadFixture(deployFactoryFixture);

      // Token 1
      await factory.connect(user1).createToken(
        "Token 1",
        "TK1",
        "First token",
        "https://image1.url",
        1_000_000n * PRECISION,
        1_000_000_000n,
        1_000_000_000n,
        0
      );

      await time.increase(60);

      // Token 2 with different parameters
      await factory.connect(user1).createToken(
        "Token 2",
        "TK2",
        "Second token",
        "https://image2.url",
        2_000_000n * PRECISION,
        2_000_000_000n,
        2_000_000_000n,
        1 // EXPONENTIAL
      );

      const allTokens = await factory.getAllTokens();
      expect(allTokens.length).to.equal(2);

      // Verify different configurations
      const config1 = await factory.getTokenConfig(allTokens[0]);
      const config2 = await factory.getTokenConfig(allTokens[1]);

      expect(config1.totalSupply).to.not.equal(config2.totalSupply);
      expect(config1.curveType).to.not.equal(config2.curveType);
    });
  });
});
