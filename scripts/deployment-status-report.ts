import { readFileSync, writeFileSync } from "fs";

interface DeploymentInfo {
  name: string;
  contracts: {
    TokenFactory?: string;
    FeeRecipient?: string;
    DeterministicDeployer?: string;
  };
  deployedAt: string | null;
  deployer?: string;
  blockNumber?: number;
  deterministicSalt?: string;
  isDeterministic?: boolean;
}

interface NetworkStatus {
  chainId: string;
  name: string;
  type: "mainnet" | "testnet";
  deployed: boolean;
  factoryAddress: string;
  feeRecipient: string;
  deployer: string;
  deployedAt: string;
  blockNumber: number;
  isDeterministic: boolean;
  explorerUrl: string;
}

const NETWORK_TYPES: Record<string, "mainnet" | "testnet"> = {
  "56": "mainnet",
  "97": "testnet",
  "8453": "mainnet",
  "84532": "testnet",
  "42161": "mainnet",
  "421614": "testnet",
};

const EXPLORER_BASE_URLS: Record<string, string> = {
  "97": "https://testnet.bscscan.com",
  "56": "https://bscscan.com",
  "421614": "https://sepolia.arbiscan.io",
  "42161": "https://arbiscan.io",
  "84532": "https://sepolia.basescan.org",
  "8453": "https://basescan.org",
};

function generateMarkdownReport(
  statuses: NetworkStatus[],
  timestamp: string
): string {
  let markdown = `# KasPump Deployment Status Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n\n`;

  // Summary
  const deployed = statuses.filter((s) => s.deployed);
  const mainnetDeployed = deployed.filter((s) => s.type === "mainnet");
  const testnetDeployed = deployed.filter((s) => s.type === "testnet");

  markdown += `## Summary\n\n`;
  markdown += `- **Total Networks:** ${statuses.length}\n`;
  markdown += `- **Deployed:** ${deployed.length}/${statuses.length}\n`;
  markdown += `- **Mainnets:** ${mainnetDeployed.length}/3\n`;
  markdown += `- **Testnets:** ${testnetDeployed.length}/3\n`;
  markdown += `- **Pending:** ${statuses.length - deployed.length}\n\n`;

  // Progress Bar
  const progressPercentage = Math.round(
    (deployed.length / statuses.length) * 100
  );
  const progressBar = "█".repeat(Math.floor(progressPercentage / 5)) + "░".repeat(20 - Math.floor(progressPercentage / 5));
  markdown += `### Deployment Progress\n\n`;
  markdown += `\`\`\`\n`;
  markdown += `${progressBar} ${progressPercentage}%\n`;
  markdown += `\`\`\`\n\n`;

  // Detailed Status Table
  markdown += `## Deployment Details\n\n`;
  markdown += `| Chain ID | Network | Type | Status | Factory Address | Explorer |\n`;
  markdown += `|----------|---------|------|--------|----------------|----------|\n`;

  statuses.forEach((status) => {
    const statusIcon = status.deployed ? "✅" : "⏸️";
    const factory = status.deployed
      ? `\`${status.factoryAddress.slice(0, 10)}...${status.factoryAddress.slice(-8)}\``
      : "Not deployed";
    const explorerLink = status.deployed
      ? `[View](${status.explorerUrl})`
      : "-";

    markdown += `| ${status.chainId} | ${status.name} | ${status.type} | ${statusIcon} | ${factory} | ${explorerLink} |\n`;
  });

  markdown += `\n`;

  // Deployed Networks Details
  if (deployed.length > 0) {
    markdown += `## Deployed Networks\n\n`;

    deployed.forEach((status) => {
      markdown += `### ${status.name} (Chain ID: ${status.chainId})\n\n`;
      markdown += `- **Type:** ${status.type.charAt(0).toUpperCase() + status.type.slice(1)}\n`;
      markdown += `- **Factory Address:** \`${status.factoryAddress}\`\n`;
      markdown += `- **Fee Recipient:** \`${status.feeRecipient}\`\n`;
      markdown += `- **Deployer:** \`${status.deployer}\`\n`;
      markdown += `- **Deployed At:** ${new Date(status.deployedAt).toLocaleString()}\n`;
      markdown += `- **Block Number:** ${status.blockNumber.toLocaleString()}\n`;
      markdown += `- **Deterministic:** ${status.isDeterministic ? "Yes" : "No"}\n`;
      markdown += `- **Explorer:** [View on Explorer](${status.explorerUrl})\n\n`;
    });
  }

  // Pending Deployments
  const pending = statuses.filter((s) => !s.deployed);
  if (pending.length > 0) {
    markdown += `## Pending Deployments\n\n`;

    pending.forEach((status) => {
      markdown += `- **${status.name}** (Chain ID: ${status.chainId}) - ${status.type}\n`;
    });

    markdown += `\n`;
  }

  // Environment Variables
  if (deployed.length > 0) {
    markdown += `## Environment Variables\n\n`;
    markdown += `Add these to your \`.env.local\` file:\n\n`;
    markdown += `\`\`\`bash\n`;

    deployed.forEach((status) => {
      const envPrefix = status.name.toUpperCase().replace(/\s+/g, "_");
      markdown += `# ${status.name}\n`;
      markdown += `NEXT_PUBLIC_${envPrefix}_TOKEN_FACTORY=${status.factoryAddress}\n`;
      markdown += `NEXT_PUBLIC_${envPrefix}_FEE_RECIPIENT=${status.feeRecipient}\n`;
      markdown += `\n`;
    });

    markdown += `\`\`\`\n\n`;
  }

  // Next Steps
  markdown += `## Next Steps\n\n`;

  if (deployed.length === 0) {
    markdown += `1. Deploy to testnet first:\n`;
    markdown += `   \`\`\`bash\n`;
    markdown += `   npm run deploy:deterministic:bsc-testnet\n`;
    markdown += `   \`\`\`\n\n`;
  } else if (pending.length > 0) {
    markdown += `1. Deploy to remaining networks:\n`;
    markdown += `   \`\`\`bash\n`;
    pending.forEach((status) => {
      const networkName = status.name
        .toLowerCase()
        .replace(/\s+/g, "-");
      markdown += `   npm run deploy:deterministic:${networkName}\n`;
    });
    markdown += `   \`\`\`\n\n`;
  } else {
    markdown += `1. ✅ All networks deployed!\n`;
    markdown += `2. Verify deployments work correctly\n`;
    markdown += `3. Update frontend configuration\n`;
    markdown += `4. Test token creation on each network\n\n`;
  }

  // Footer
  markdown += `---\n\n`;
  markdown += `*This report was automatically generated by KasPump deployment tools.*\n`;

  return markdown;
}

function main() {
  console.log("\n📊 Generating Deployment Status Report");
  console.log("=".repeat(60));

  // Read deployments
  let deployments: Record<string, DeploymentInfo> = {};
  try {
    const deploymentData = readFileSync("./deployments.json", "utf-8");
    deployments = JSON.parse(deploymentData);
  } catch (error) {
    console.error("❌ Could not read deployments.json");
    process.exit(1);
  }

  // Build status array
  const statuses: NetworkStatus[] = [];

  for (const [chainId, deployment] of Object.entries(deployments)) {
    const factoryAddress = deployment.contracts?.TokenFactory || "";
    const isDeployed = factoryAddress !== "";

    const status: NetworkStatus = {
      chainId,
      name: deployment.name,
      type: NETWORK_TYPES[chainId] || "testnet",
      deployed: isDeployed,
      factoryAddress,
      feeRecipient: deployment.contracts?.FeeRecipient || "",
      deployer: deployment.deployer || "",
      deployedAt: deployment.deployedAt || "",
      blockNumber: deployment.blockNumber || 0,
      isDeterministic: deployment.isDeterministic || false,
      explorerUrl: `${EXPLORER_BASE_URLS[chainId]}/address/${factoryAddress}`,
    };

    statuses.push(status);
  }

  // Sort by chain ID
  statuses.sort((a, b) => parseInt(a.chainId) - parseInt(b.chainId));

  // Generate timestamp
  const timestamp = new Date().toISOString();

  // Generate markdown report
  const markdown = generateMarkdownReport(statuses, timestamp);

  // Save to file
  const outputFile = "DEPLOYMENT_STATUS.md";
  writeFileSync(outputFile, markdown, "utf-8");

  console.log(`\n✅ Report generated: ${outputFile}`);

  // Print summary to console
  const deployed = statuses.filter((s) => s.deployed);
  const mainnetDeployed = deployed.filter((s) => s.type === "mainnet");
  const testnetDeployed = deployed.filter((s) => s.type === "testnet");

  console.log(`\n📈 Summary:`);
  console.log(`   Total Networks: ${statuses.length}`);
  console.log(`   Deployed: ${deployed.length}/${statuses.length}`);
  console.log(`   Mainnets: ${mainnetDeployed.length}/3`);
  console.log(`   Testnets: ${testnetDeployed.length}/3`);

  console.log(`\n📋 Deployed Networks:`);
  deployed.forEach((s) => {
    console.log(`   ✅ ${s.name} (${s.chainId})`);
  });

  const pending = statuses.filter((s) => !s.deployed);
  if (pending.length > 0) {
    console.log(`\n⏸️  Pending Deployments:`);
    pending.forEach((s) => {
      console.log(`   📝 ${s.name} (${s.chainId})`);
    });
  }

  console.log(`\n📄 Full report saved to: ${outputFile}`);
  console.log("=".repeat(60));
}

main();
