/* eslint-disable */
// Standalone ABI builder using the bundled solcjs. Used in environments where
// Hardhat cannot reach binaries.soliditylang.org. Writes BondingCurveAMM.json
// and TokenFactory.json into src/abis/ and server/src/abis/ — same shape as
// hardhat artifacts, so the frontend continues to consume them unchanged.

const solc = require('solc');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contractsDir = path.join(root, 'contracts');

const TARGETS = ['BondingCurveAMM', 'TokenFactory'];
const OUT_DIRS = ['src/abis', 'server/src/abis'].map((d) => path.join(root, d));

function listSolFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSolFiles(full));
    else if (entry.name.endsWith('.sol')) out.push(full);
  }
  return out;
}

function findImports(importPath) {
  const candidates = [];
  if (importPath.startsWith('@openzeppelin')) {
    candidates.push(path.join(root, 'node_modules', importPath));
  } else {
    candidates.push(path.join(contractsDir, importPath));
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return { contents: fs.readFileSync(c, 'utf8') };
  }
  return { error: 'File not found: ' + importPath };
}

const sources = {};
for (const f of listSolFiles(contractsDir)) {
  const rel = path.relative(contractsDir, f).replace(/\\/g, '/');
  sources[rel] = { content: fs.readFileSync(f, 'utf8') };
}

const wrapped = (p) => {
  if (sources[p]) return { contents: sources[p].content };
  if (sources[p.replace(/^contracts\//, '')]) {
    return { contents: sources[p.replace(/^contracts\//, '')].content };
  }
  return findImports(p);
};

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 100 },
    outputSelection: { '*': { '*': ['abi'] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: wrapped }));
if (out.errors && out.errors.some((e) => e.severity === 'error')) {
  for (const e of out.errors) {
    if (e.severity === 'error') console.error(e.formattedMessage);
  }
  process.exit(1);
}

for (const target of TARGETS) {
  // Find the contract output across all source files.
  let abi = null;
  for (const sourceFile of Object.keys(out.contracts || {})) {
    const contracts = out.contracts[sourceFile];
    if (contracts && contracts[target] && contracts[target].abi) {
      abi = contracts[target].abi;
      break;
    }
  }
  if (!abi) {
    console.error(`ABI for ${target} not found in compiler output.`);
    process.exit(1);
  }
  for (const dir of OUT_DIRS) {
    const dest = path.join(dir, `${target}.json`);
    fs.writeFileSync(dest, JSON.stringify({ abi }, null, 2) + '\n');
    console.log(`wrote ${path.relative(root, dest)} (${abi.length} entries)`);
  }
}
