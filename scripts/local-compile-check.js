/* eslint-disable */
// Standalone solc-based compile sanity check for environments where Hardhat
// cannot reach binaries.soliditylang.org. Uses the solc version bundled in
// node_modules. Not a substitute for `npx hardhat compile`, but catches
// parse / type errors in our own contracts before they hit CI.

const solc = require('solc');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contractsDir = path.join(root, 'contracts');

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
  } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
    return { error: 'Relative imports must be resolved by the importer.' };
  } else {
    candidates.push(path.join(contractsDir, importPath));
    candidates.push(path.join(root, 'node_modules', importPath));
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

const input = {
  language: 'Solidity',
  sources,
  settings: {
    optimizer: { enabled: true, runs: 100 },
    outputSelection: { '*': { '*': ['abi'] } },
  },
};

const wrappedFindImports = (p) => {
  const tries = [p, p.replace(/^contracts\//, '')];
  for (const t of tries) {
    if (sources[t]) return { contents: sources[t].content };
    const r = findImports(t);
    if (r.contents) return r;
  }
  return findImports(p);
};

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: wrappedFindImports }));

let errorCount = 0;
let warnCount = 0;
if (out.errors) {
  for (const e of out.errors) {
    if (e.severity === 'error') errorCount += 1;
    else warnCount += 1;
    console.log(e.severity.toUpperCase() + ': ' + (e.formattedMessage || e.message));
  }
}

console.log('---');
console.log(`compiled ${Object.keys(sources).length} files: ${errorCount} errors, ${warnCount} warnings`);
process.exit(errorCount > 0 ? 1 : 0);
