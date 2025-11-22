/**
 * Deploy contracts using viem (Bun-compatible)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardhat default test accounts
const DEPLOYER_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ACCOUNT1_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function deploy() {
  console.log("🚀 Starting deployment...\n");

  // Setup clients
  const deployer = privateKeyToAccount(DEPLOYER_KEY);
  const account1 = privateKeyToAccount(ACCOUNT1_KEY);

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  const walletClient = createWalletClient({
    account: deployer,
    chain: hardhat,
    transport: http("http://127.0.0.1:8545"),
  });

  // Load artifacts
  const artifactsPath = path.join(__dirname, "../artifacts/contracts");

  const qusdArtifact = JSON.parse(
    fs.readFileSync(
      path.join(artifactsPath, "QUSDToken.sol/QUSDToken.json"),
      "utf-8"
    )
  );

  const escrowArtifact = JSON.parse(
    fs.readFileSync(path.join(artifactsPath, "Escrow.sol/Escrow.json"), "utf-8")
  );

  // Deploy QUSDToken
  console.log("📝 Deploying QUSDToken...");
  const qusdHash = await walletClient.deployContract({
    abi: qusdArtifact.abi,
    bytecode: qusdArtifact.bytecode as `0x${string}`,
    args: [deployer.address],
  });

  const qusdReceipt = await publicClient.waitForTransactionReceipt({
    hash: qusdHash,
  });
  const qusdAddress = qusdReceipt.contractAddress!;
  console.log(`   ✅ QUSDToken deployed at: ${qusdAddress}\n`);

  // Deploy Escrow
  console.log("📝 Deploying Escrow...");
  const escrowHash = await walletClient.deployContract({
    abi: escrowArtifact.abi,
    bytecode: escrowArtifact.bytecode as `0x${string}`,
    args: [qusdAddress],
  });

  const escrowReceipt = await publicClient.waitForTransactionReceipt({
    hash: escrowHash,
  });
  const escrowAddress = escrowReceipt.contractAddress!;
  console.log(`   ✅ Escrow deployed at: ${escrowAddress}\n`);

  // Mint 10,000 QUSD to account1
  console.log("💰 Minting 10,000 QUSD to test account...");
  const mintHash = await walletClient.writeContract({
    address: qusdAddress,
    abi: qusdArtifact.abi,
    functionName: "mint",
    args: [account1.address, parseEther("10000")],
  });

  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log(`   ✅ Minted 10,000 QUSD to ${account1.address}\n`);

  // Save deployed addresses
  const deploymentData = {
    chainId: 31337,
    network: "localhost",
    deployedAt: new Date().toISOString(),
    contracts: {
      QUSDToken: qusdAddress,
      Escrow: escrowAddress,
    },
  };

  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentPath = path.join(
    deploymentDir,
    "localhost-deployment.json"
  );
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("📄 Deployment summary:");
  console.log(JSON.stringify(deploymentData, null, 2));
  console.log(`\n✅ Deployment complete! Saved to ${deploymentPath}`);
  console.log(`\nRun \`bun run export\` to export ABIs for the frontend.`);
}

deploy().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
