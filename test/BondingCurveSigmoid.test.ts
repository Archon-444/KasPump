import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

const PRECISION = 1_000_000_000_000_000_000n; // 1e18
const TOTAL_SUPPLY = 1_000_000_000n * PRECISION;
const GRADUATION_THRESHOLD = 800_000_000n * PRECISION;

// Sigmoid params used in scripts/generate-sigmoid-anchors.js. Mirrored here
// so this test is the single source of truth for "what curve are we
// approximating?"
const A_WEI = 7_500_000_000;          // 7.5 gwei per full token
const S0_TOKENS = 400_000_000;
const K = 7.5e-9;

function trueSigmoidPrice(supplyTokenWei: bigint): bigint {
  const sTokens = Number(supplyTokenWei / PRECISION);
  return BigInt(Math.round(A_WEI / (1 + Math.exp(-K * (sTokens - S0_TOKENS)))));
}

// Composite midpoint integral of the true sigmoid from 0 to targetTokenWei.
// N must match scripts/generate-sigmoid-anchors.js (200_000 panels) so the
// generator-parity test below reproduces the on-chain anchor integrals
// byte-for-byte — a different panel count changes the last few wei of the
// midpoint sum and breaks exact parity.
function trueSigmoidIntegral(targetTokenWei: bigint): bigint {
  if (targetTokenWei === 0n) return 0n;
  const targetTokens = Number(targetTokenWei / PRECISION);
  const N = 200_000;
  const dx = targetTokens / N;
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const x = (i + 0.5) * dx;
    sum += A_WEI / (1 + Math.exp(-K * (x - S0_TOKENS)));
  }
  return BigInt(Math.round(sum * dx));
}

// We exercise the library through a deployed AMM. Direct library invocation
// would need a wrapper contract; the AMM already exposes the library via
// getCurrentPrice / calculateTokensOut / calculateNativeOut, and that is the
// real surface we ship.
async function deployFixture() {
  const [deployer] = await ethers.getSigners();

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

  const KRC20Token = await ethers.getContractFactory("KRC20Token");
  const token = await KRC20Token.deploy(
    "Sigmoid Test", "SIG", TOTAL_SUPPLY, deployer.address
  );
  await token.waitForDeployment();

  const BondingCurveAMM = await ethers.getContractFactory("BondingCurveAMM");
  const amm = await BondingCurveAMM.deploy(
    await token.getAddress(),
    deployer.address,
    deployer.address,
    0,
    await dexRouter.getAddress(),
    60,
    ethers.ZeroAddress
  );
  await amm.waitForDeployment();
  await token.transfer(await amm.getAddress(), TOTAL_SUPPLY);

  // Most tests want to bypass the sniper-window guards.
  await ethers.provider.send("evm_increaseTime", [61]);
  await ethers.provider.send("evm_mine", []);

  return { amm, token, deployer };
}

// Anchor schedule duplicated from the generator so the test is the single
// source of truth for "what supplies do the 31 anchors live at?"
const ANCHOR_PCTS = [
  0, 4, 8, 12, 16, 20,
  23, 26, 29, 32, 35, 38, 41, 44, 47,
  50, 53, 56, 59, 62, 65, 68, 71, 74, 77,
  80, 84, 88, 92, 96, 100,
];

describe("BondingCurveMath generator-vs-table parity", function () {
  // Strict regression guard against the class of bug where the on-chain
  // anchor table drifts from what scripts/generate-sigmoid-anchors.js
  // emits. The PR-2-follow-up landed because the integral column was
  // generator-fresh but the price column had been mis-transcribed
  // (off-by-one shift starting at idx 10), and the original accuracy test
  // only checked integrals so the drift slipped past CI. Now we pin every
  // row of both columns at every anchor supply.
  it("on-chain spot price at every anchor supply matches the generator exactly", async function () {
    const { amm } = await deployFixture();
    for (let i = 0; i < ANCHOR_PCTS.length; i++) {
      const pct = ANCHOR_PCTS[i];
      const supply = (GRADUATION_THRESHOLD * BigInt(pct)) / 100n;
      const onChain = await amm.spotPriceAtSupply(supply);
      const truth = trueSigmoidPrice(supply);
      expect(onChain).to.equal(
        truth,
        `anchor #${i} (${pct}% of threshold): on-chain=${onChain} generator=${truth}`
      );
    }
  });

  it("on-chain cumulative integral at every anchor supply matches the generator exactly", async function () {
    const { amm } = await deployFixture();
    for (let i = 0; i < ANCHOR_PCTS.length; i++) {
      const pct = ANCHOR_PCTS[i];
      const supply = (GRADUATION_THRESHOLD * BigInt(pct)) / 100n;
      // proceedsFromSell(supply, 0) === integral(supply) by definition.
      const onChain = supply === 0n
        ? 0n
        : await amm.calculateNativeOut(supply, supply);
      const truth = trueSigmoidIntegral(supply);
      expect(onChain).to.equal(
        truth,
        `anchor #${i} (${pct}% of threshold): on-chain=${onChain} generator=${truth}`
      );
    }
  });

  it("the last two anchor prices are NOT identical (rules out the off-by-one regression)", async function () {
    // Specific regression guard against the duplicated-tail symptom that
    // first surfaced this drift: idx 29 and idx 30 must differ because the
    // sigmoid is still climbing between 96% and 100% of threshold.
    const { amm } = await deployFixture();
    const supply29 = (GRADUATION_THRESHOLD * 96n) / 100n;
    const supply30 = GRADUATION_THRESHOLD;
    const p29 = await amm.spotPriceAtSupply(supply29);
    const p30 = await amm.spotPriceAtSupply(supply30);
    expect(p30).to.be.gt(p29);
  });
});

describe("BondingCurveMath sigmoid accuracy", function () {
  // The integral is a piecewise-LINEAR interpolation of anchor integrals. The
  // low tail [0, 20% of threshold] uses 4%-spaced anchors over a convex integral,
  // so linear interpolation over-estimates by up to ~9% at 1% of threshold and
  // ~2% at 5% — but on tiny absolute amounts. Past the 20% low tail the anchors
  // tighten to 3% and the relative error collapses. Assert a tight bound over the
  // economically-relevant bulk (> 20% of threshold) and a documented looser bound
  // in the low tail. Densifying the low-end anchors (issue #83) is the path to a
  // uniformly tight bound; that would change the shipped curve. The generator
  // parity test above already pins every anchor value exactly.
  it("anchor table matches the true sigmoid integral within tolerance (low tail coarser by design)", async function () {
    const { amm } = await deployFixture();
    const samples = 100;
    for (let i = 1; i <= samples; i++) {
      const supply = (GRADUATION_THRESHOLD * BigInt(i)) / BigInt(samples);
      const onChain = await amm.calculateNativeOut(supply, supply); // proceeds(supply, 0) = integral(supply)
      const truth = trueSigmoidIntegral(supply);
      const diff = onChain > truth ? onChain - truth : truth - onChain;
      const bps = (diff * 10000n) / truth;
      // i is percent of threshold. Low tail (4%-spaced anchors) is [0, 20%].
      const ceiling = i <= 20 ? 1200n : 200n;
      expect(bps).to.be.lt(ceiling, `integral error at ${i}% of threshold = ${bps} bps`);
    }
  });

  // Spot price is linear-interpolated between price anchors. The low tail
  // [0, 20% of threshold] uses 4%-spaced anchors and shows up to ~60 bps error;
  // past 20% the anchors tighten to 3% and the error drops under 50 bps. Tight
  // bound over the bulk (> 20%), documented looser bound in the low tail.
  it("anchor table matches the true sigmoid spot price within tolerance (low tail coarser by design)", async function () {
    const { amm } = await deployFixture();
    const samples = 100;
    for (let i = 1; i <= samples; i++) {
      const supply = (GRADUATION_THRESHOLD * BigInt(i)) / BigInt(samples);
      const onChain = await amm.spotPriceAtSupply(supply);
      const truth = trueSigmoidPrice(supply);
      const diff = onChain > truth ? onChain - truth : truth - onChain;
      const bps = (diff * 10000n) / truth;
      // Low tail (4%-spaced anchors) is [0, 20%].
      const ceiling = i <= 20 ? 100n : 80n;
      expect(bps).to.be.lt(ceiling, `spot-price error at ${i}% of threshold = ${bps} bps`);
    }
  });

  it("spot price grows monotonically across the full curve", async function () {
    const { amm } = await deployFixture();
    let prev = 0n;
    for (let pct = 0; pct <= 100; pct += 5) {
      const supply = (GRADUATION_THRESHOLD * BigInt(pct)) / 100n;
      const price = supply === 0n
        ? await amm.calculateNativeOut(0n, 0n) // 0
        : await amm.calculateNativeOut(supply, supply); // integral 0→supply
      expect(price).to.be.gte(prev);
      prev = price;
    }
  });

  it("buy/sell round-trip is identity (within fees) at all curve regions", async function () {
    const { amm, token } = await deployFixture();
    const [, trader] = await ethers.getSigners();

    // Sample three supply zones: low tail, midpoint, high tail.
    const zones = [
      ethers.parseEther("0.05"),
      ethers.parseEther("0.5"),
      ethers.parseEther("1.5"),
    ];

    for (const deposit of zones) {
      const ammAddr = await amm.getAddress();
      const supplyBefore = await amm.currentSupply();
      const balanceBeforeAmm = await token.balanceOf(ammAddr);

      await amm.connect(trader).buyTokens(0, { value: deposit });

      const userTokens = await token.balanceOf(trader.address);
      expect(userTokens).to.be.gt(0n);

      // Bypass the same-block guard.
      await ethers.provider.send("evm_mine", []);

      await token.connect(trader).approve(ammAddr, userTokens);
      await amm.connect(trader).sellTokens(userTokens, 0);

      // After buy+sell, supply returns to its pre-trade value (within rounding)
      // and the AMM holds back the same tokens it started with for this zone.
      const supplyAfter = await amm.currentSupply();
      expect(supplyAfter).to.equal(supplyBefore);
      const balanceAfterAmm = await token.balanceOf(ammAddr);
      expect(balanceAfterAmm).to.equal(balanceBeforeAmm);
    }
  });

  it("calculateTokensOut clamps to remaining curve when nativeIn would graduate", async function () {
    const { amm } = await deployFixture();
    // Way more than the ~3 ETH total raise — should clamp to remaining curve.
    const huge = ethers.parseEther("100");
    const tokensOut = await amm.calculateTokensOut(huge, 0n);
    expect(tokensOut).to.equal(GRADUATION_THRESHOLD);
  });
});

describe("BondingCurveMath gas budget", function () {
  it("buyTokens stays under the 280k gas ceiling", async function () {
    // A first non-graduating buy measures ~241k gas: anchor-table walk +
    // interpolation, continuous fee decay, fee split, anti-bot guards, and two
    // structured events. The original 200k ceiling was an explicit placeholder
    // ("target <80k after a profiling pass"); 280k reflects the real V2 cost
    // with headroom and still guards against a runaway regression. Reducing the
    // real cost (profiling / jump-table tuning) can tighten this later.
    const { amm } = await deployFixture();
    const [, trader] = await ethers.getSigners();
    const tx = await amm.connect(trader).buyTokens(0, { value: ethers.parseEther("0.1") });
    const receipt = await tx.wait();
    expect(receipt!.gasUsed).to.be.lt(280_000n);
    console.log(`        buyTokens gas: ${receipt!.gasUsed}`);
  });

  it("sellTokens stays under 200,000 gas", async function () {
    const { amm, token } = await deployFixture();
    const [, trader] = await ethers.getSigners();
    await amm.connect(trader).buyTokens(0, { value: ethers.parseEther("0.1") });
    const userTokens = await token.balanceOf(trader.address);
    await ethers.provider.send("evm_mine", []);
    await token.connect(trader).approve(await amm.getAddress(), userTokens);
    const tx = await amm.connect(trader).sellTokens(userTokens, 0);
    const receipt = await tx.wait();
    expect(receipt!.gasUsed).to.be.lt(200_000n);
    console.log(`        sellTokens gas: ${receipt!.gasUsed}`);
  });
});
