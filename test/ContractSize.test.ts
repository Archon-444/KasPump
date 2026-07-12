import { expect } from "chai";
import hre from "hardhat";

// EIP-170 caps deployed (runtime) contract code at 24576 bytes on all EVM
// chains. TokenFactory previously embedded the BondingCurveAMM creation
// bytecode and blew past this (~32KB, undeployable to mainnet); the AMMDeployer
// split fixed it. This guards against regressing any deployable contract.
const EIP170_LIMIT = 24576;

const DEPLOYABLE_CONTRACTS = [
  "TokenFactory",
  "AMMDeployer",
  "BondingCurveAMM",
  "DeterministicDeployer",
  "KRC20Token",
  "CreatorVesting",
  "DexRouterRegistry",
];

describe("Contract size (EIP-170 24576-byte limit)", function () {
  for (const name of DEPLOYABLE_CONTRACTS) {
    it(`${name} deployed bytecode fits under the mainnet limit`, async function () {
      const artifact = await hre.artifacts.readArtifact(name);
      // deployedBytecode is a 0x-prefixed hex string; 2 hex chars per byte.
      const byteLength = (artifact.deployedBytecode.length - 2) / 2;
      expect(
        byteLength,
        `${name} is ${byteLength} bytes (limit ${EIP170_LIMIT})`
      ).to.be.lte(EIP170_LIMIT);
    });
  }
});
