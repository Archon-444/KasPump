import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

// Regression tests for the three contract security fixes:
//   1. Factory hands each deployed AMM's ownership to `ammAdmin` (not the
//      factory), so pause/unpause/setSoftLaunchCap/emergencyWithdraw are
//      actually callable in production.
//   2. emergencyWithdraw reserves every owed bucket (curve liquidity, fees,
//      graduation funds) and can only sweep genuinely stray native.
//   3. Platform fees + treasury native accrue to a pull-payment bucket, so a
//      reverting/non-payable feeRecipient cannot brick a trade or graduation.

const PRECISION = 1_000_000_000_000_000_000n; // 1e18
const TOTAL_SUPPLY = 1_000_000_000n * PRECISION;
const GRADUATION_THRESHOLD = 800_000_000n * PRECISION;
const CREATION_FEE = 5_000_000_000_000_000n; // 0.005 ether

async function deployDex() {
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

  return { weth, dexFactory, dexRouter };
}

// Direct AMM deploy (deployer = Ownable owner), matching the existing suites.
async function deployAMMFixture(feeRecipientAddr?: string) {
  const [deployer, user, referrer] = await ethers.getSigners();
  const { dexRouter } = await deployDex();

  const KRC20Token = await ethers.getContractFactory("KRC20Token");
  const token = await KRC20Token.deploy("Sec Test", "SEC", TOTAL_SUPPLY, deployer.address);
  await token.waitForDeployment();

  const BondingCurveAMM = await ethers.getContractFactory("BondingCurveAMM");
  const amm = await BondingCurveAMM.deploy(
    await token.getAddress(),
    deployer.address, // tokenCreator
    feeRecipientAddr ?? deployer.address, // feeRecipient
    0,
    await dexRouter.getAddress(),
    60,
    ethers.ZeroAddress
  );
  await amm.waitForDeployment();
  await token.transfer(await amm.getAddress(), TOTAL_SUPPLY);

  return { amm, token, dexRouter, deployer, user, referrer };
}

async function skipSniperWindow() {
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine", []);
}

describe("Security fix #1 — factory transfers AMM ownership to ammAdmin", function () {
  async function deployFactoryFixture() {
    const [deployer, admin, creator] = await ethers.getSigners();
    const { weth, dexRouter } = await deployDex();

    const MockDexRouterRegistry = await ethers.getContractFactory("MockDexRouterRegistry");
    const registry = await MockDexRouterRegistry.deploy();
    await registry.waitForDeployment();

    const { chainId } = await ethers.provider.getNetwork();
    await registry.setConfig(
      Number(chainId),
      0, // V2
      await dexRouter.getAddress(),
      ethers.ZeroAddress,
      await weth.getAddress(),
      0,
      true
    );

    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    const factory = await TokenFactory.deploy(deployer.address);
    await factory.waitForDeployment();
    await factory.updateDexRouterRegistry(await registry.getAddress());

    return { factory, deployer, admin, creator };
  }

  const tokenParams = {
    name: "Owned Token",
    symbol: "OWN",
    description: "",
    imageUrl: "",
    twitterUrl: "",
    telegramUrl: "",
    websiteUrl: "",
    referrer: ethers.ZeroAddress,
  };

  it("defaults ammAdmin to the deployer", async function () {
    const { factory, deployer } = await deployFactoryFixture();
    expect(await factory.ammAdmin()).to.equal(deployer.address);
  });

  it("a factory-deployed AMM is owned by ammAdmin, not the factory", async function () {
    const { factory, admin, creator } = await deployFactoryFixture();
    await factory.setAmmAdmin(admin.address);

    await factory.connect(creator).createToken(tokenParams, { value: CREATION_FEE });

    const tokens = await factory.getAllTokens();
    const ammAddr = await factory.getTokenAMM(tokens[tokens.length - 1]);
    const amm = await ethers.getContractAt("BondingCurveAMM", ammAddr);

    expect(await amm.owner()).to.equal(admin.address);
    expect(await amm.owner()).to.not.equal(await factory.getAddress());
  });

  it("the ammAdmin can drive the AMM's emergency controls; others cannot", async function () {
    const { factory, admin, creator } = await deployFactoryFixture();
    await factory.setAmmAdmin(admin.address);
    await factory.connect(creator).createToken(tokenParams, { value: CREATION_FEE });

    const tokens = await factory.getAllTokens();
    const ammAddr = await factory.getTokenAMM(tokens[tokens.length - 1]);
    const amm = await ethers.getContractAt("BondingCurveAMM", ammAddr);

    // These were the dead-on-arrival functions before the fix.
    await expect(amm.connect(admin).setSoftLaunchCap(ethers.parseEther("1"))).to.not.be.reverted;
    expect(await amm.softLaunchCapNative()).to.equal(ethers.parseEther("1"));
    await expect(amm.connect(admin).pause()).to.not.be.reverted;
    expect(await amm.paused()).to.equal(true);

    await expect(amm.connect(creator).pause()).to.be.reverted;
  });

  it("setAmmAdmin is owner-only and rejects the zero address", async function () {
    const { factory, deployer, admin, creator } = await deployFactoryFixture();
    await expect(factory.connect(creator).setAmmAdmin(admin.address)).to.be.reverted;
    await expect(factory.setAmmAdmin(ethers.ZeroAddress)).to.be.reverted;
    await expect(factory.setAmmAdmin(admin.address))
      .to.emit(factory, "AmmAdminUpdated")
      .withArgs(deployer.address, admin.address);
    expect(await factory.ammAdmin()).to.equal(admin.address);
  });
});

describe("Security fix #2 — emergencyWithdraw only sweeps stray native", function () {
  it("withdraws stray native but reserves curve liquidity + fees", async function () {
    const { amm, deployer, user } = await deployAMMFixture();
    await skipSniperWindow();

    // Buy so curveNativeBalance, creatorAccumulatedFees, platformAccumulatedFees > 0.
    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.5") });

    const curve = await amm.curveNativeBalance();
    const creatorFees = await amm.creatorAccumulatedFees();
    const referrerFees = await amm.referrerAccumulatedFees();
    const platformFees = await amm.platformAccumulatedFees();
    const gradFunds = await amm.totalGraduationFunds();
    const reserved = curve + creatorFees + referrerFees + platformFees + gradFunds;
    expect(curve).to.be.gt(0n);
    expect(creatorFees).to.be.gt(0n);
    expect(platformFees).to.be.gt(0n);

    // Force stray native into the AMM via receive().
    const stray = ethers.parseEther("0.3");
    await deployer.sendTransaction({ to: await amm.getAddress(), value: stray });

    const ammAddr = await amm.getAddress();
    const balBefore = await ethers.provider.getBalance(ammAddr);
    expect(balBefore).to.equal(reserved + stray);

    await amm.pause();
    await expect(amm.emergencyWithdraw("test"))
      .to.emit(amm, "EmergencyWithdraw")
      .withArgs(deployer.address, stray, "test");

    // Only the stray amount left; every owed bucket is intact.
    expect(await ethers.provider.getBalance(ammAddr)).to.equal(reserved);
    expect(await amm.curveNativeBalance()).to.equal(curve);
    expect(await amm.creatorAccumulatedFees()).to.equal(creatorFees);
    expect(await amm.platformAccumulatedFees()).to.equal(platformFees);
  });

  it("withdraws nothing when there is no stray native", async function () {
    const { amm, user } = await deployAMMFixture();
    await skipSniperWindow();
    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.5") });

    await amm.pause();
    await expect(amm.emergencyWithdraw("nothing-stray"))
      .to.emit(amm, "EmergencyWithdraw")
      .withArgs((await ethers.getSigners())[0].address, 0n, "nothing-stray");
  });
});

describe("Security fix #3 — a reverting feeRecipient cannot brick the AMM", function () {
  async function deployWithRevertingFeeRecipient() {
    const Reverting = await ethers.getContractFactory("RevertingReceiver");
    const badRecipient = await Reverting.deploy();
    await badRecipient.waitForDeployment();
    const fixture = await deployAMMFixture(await badRecipient.getAddress());
    return { ...fixture, badRecipient };
  }

  it("buys and sells succeed and accrue platform fees instead of pushing them", async function () {
    const { amm, token, user } = await deployWithRevertingFeeRecipient();
    await skipSniperWindow();

    await expect(amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.2") })).to.not.be
      .reverted;
    expect(await amm.platformAccumulatedFees()).to.be.gt(0n);

    // Sell part of the position back.
    const bal = await token.balanceOf(user.address);
    await token.connect(user).approve(await amm.getAddress(), bal);
    await expect(amm.connect(user).sellTokens(bal / 2n, 0)).to.not.be.reverted;
  });

  it("graduation succeeds even though the treasury recipient rejects native", async function () {
    const { amm, user } = await deployWithRevertingFeeRecipient();
    await skipSniperWindow();

    const platformBefore = await amm.platformAccumulatedFees();
    await expect(amm.connect(user).buyTokens(0, { value: ethers.parseEther("100") })).to.not.be
      .reverted;

    expect(await amm.isGraduated()).to.equal(true);
    // Treasury native rolled into the pull-payment bucket, not pushed.
    expect(await amm.platformAccumulatedFees()).to.be.gt(platformBefore);
  });

  it("withdrawPlatformFees pays a well-behaved recipient and zeroes the bucket", async function () {
    const { amm, user, deployer } = await deployAMMFixture(); // feeRecipient = deployer (EOA)
    await skipSniperWindow();
    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.5") });

    const owed = await amm.platformAccumulatedFees();
    expect(owed).to.be.gt(0n);

    const balBefore = await ethers.provider.getBalance(deployer.address);
    // Call from a non-recipient signer so gas doesn't muddy the recipient balance.
    await amm.connect(user).withdrawPlatformFees();

    expect(await amm.platformAccumulatedFees()).to.equal(0n);
    expect(await ethers.provider.getBalance(deployer.address)).to.equal(balBefore + owed);
  });

  it("withdrawPlatformFees reverts (funds retained) when the recipient rejects native", async function () {
    const { amm, user } = await deployWithRevertingFeeRecipient();
    await skipSniperWindow();
    await amm.connect(user).buyTokens(0, { value: ethers.parseEther("0.2") });

    const owed = await amm.platformAccumulatedFees();
    expect(owed).to.be.gt(0n);
    await expect(amm.connect(user).withdrawPlatformFees()).to.be.reverted;
    // Funds are preserved for a later withdrawal to a fixed recipient.
    expect(await amm.platformAccumulatedFees()).to.equal(owed);
  });
});
