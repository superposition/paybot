/**
 * Export contract ABIs and deployed addresses for use in frontend
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DeployedAddresses {
  [chainId: string]: {
    [contractName: string]: string;
  };
}

interface ContractExport {
  address: string;
  abi: any[];
}

interface ExportedContracts {
  [contractName: string]: ContractExport;
}

async function exportContracts() {
  const contractsDir = path.join(__dirname, "../artifacts/contracts");
  const deployedAddressesPath = path.join(
    __dirname,
    "../ignition/deployments/chain-31337/deployed_addresses.json"
  );
  const outputDir = path.join(__dirname, "../../../apps/web/src/contracts");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read deployed addresses
  const localDeploymentPath = path.join(
    __dirname,
    "../deployments/localhost-deployment.json"
  );

  if (!fs.existsSync(localDeploymentPath)) {
    console.error(
      "❌ No deployed addresses found. Run deployment first with:"
    );
    console.error("   bun run deploy:local");
    process.exit(1);
  }

  const deployment = JSON.parse(
    fs.readFileSync(localDeploymentPath, "utf-8")
  );

  const exported: ExportedContracts = {};

  // Export QUSDToken
  const qusdArtifact = JSON.parse(
    fs.readFileSync(
      path.join(contractsDir, "QUSDToken.sol/QUSDToken.json"),
      "utf-8"
    )
  );
  exported.QUSDToken = {
    address: deployment.contracts.QUSDToken,
    abi: qusdArtifact.abi,
  };

  // Export Escrow
  const escrowArtifact = JSON.parse(
    fs.readFileSync(path.join(contractsDir, "Escrow.sol/Escrow.json"), "utf-8")
  );
  exported.Escrow = {
    address: deployment.contracts.Escrow,
    abi: escrowArtifact.abi,
  };

  // Write to output file
  const outputPath = path.join(outputDir, "index.ts");
  const content = `/**
 * Auto-generated contract exports
 * Generated at: ${new Date().toISOString()}
 */

export const contracts = ${JSON.stringify(exported, null, 2)} as const;

export const QUSDToken = contracts.QUSDToken;
export const Escrow = contracts.Escrow;
`;

  fs.writeFileSync(outputPath, content);

  console.log("✅ Contract ABIs and addresses exported successfully!");
  console.log(`   Output: ${outputPath}`);
  console.log(`\nDeployed addresses:`);
  console.log(`   QUSDToken: ${deployment.contracts.QUSDToken}`);
  console.log(`   Escrow:    ${deployment.contracts.Escrow}`);
}

exportContracts().catch((error) => {
  console.error("❌ Export failed:", error);
  process.exit(1);
});
