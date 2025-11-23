/**
 * Test Client - Demonstrates X402 payment flow
 *
 * This script shows how to use the X402 client helpers to:
 * 1. Create a payment request
 * 2. Sign payment off-chain (gasless)
 * 3. Send payment to resource server
 * 4. Resource server verifies and settles via facilitator
 * 5. User receives protected content
 */

import { createX402PaymentHeader } from "@paybot/x402";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Configuration from environment
const RPC_URL = process.env.VITE_RPC_URL || "http://localhost:8545";
const CHAIN_ID = parseInt(process.env.VITE_CHAIN_ID || "31337");
const TOKEN_ADDRESS = (process.env.VITE_QUSD_TOKEN_ADDRESS ||
  "0x01c1def3b91672704716159c9041aeca392ddffb") as Address;
const ESCROW_ADDRESS = (process.env.VITE_ESCROW_CONTRACT_ADDRESS ||
  "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4") as Address;
const RESOURCE_SERVER_URL =
  process.env.RESOURCE_SERVER_URL || "http://localhost:8404";

// Hardhat test account #1 (has 10,000 QUSD minted)
const PAYER_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as `0x${string}`;

async function main() {
  console.log("🧪 X402 Payment Flow Test\n");

  // Setup payer wallet
  const payerAccount = privateKeyToAccount(PAYER_PRIVATE_KEY);
  console.log(`👤 Payer: ${payerAccount.address}\n`);

  const walletClient = createWalletClient({
    account: payerAccount,
    transport: http(RPC_URL),
    chain: {
      id: CHAIN_ID,
      name: "Localhost",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [RPC_URL] },
      },
    },
  });

  const publicClient = createPublicClient({
    transport: http(RPC_URL),
    chain: {
      id: CHAIN_ID,
      name: "Localhost",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [RPC_URL] },
      },
    },
  });

  // Test 1: Try accessing protected endpoint without payment (should get 402)
  console.log("📡 Test 1: Access protected endpoint without payment");
  const unauthorizedResponse = await fetch(
    `${RESOURCE_SERVER_URL}/protected/data`
  );
  console.log(`   Status: ${unauthorizedResponse.status}`);
  if (unauthorizedResponse.status === 402) {
    const paymentRequired = await unauthorizedResponse.json();
    console.log(
      `   ✅ Got 402 Payment Required as expected`
    );
    console.log(`   Payment details:`, JSON.stringify(paymentRequired, null, 2));
  }
  console.log();

  // Test 2: Create payment and access protected endpoint
  console.log("📡 Test 2: Create payment and access protected endpoint");

  // Get payment requirements from 402 response
  const paymentRequiredResponse = await fetch(
    `${RESOURCE_SERVER_URL}/protected/data`
  );
  const paymentRequired = (await paymentRequiredResponse.json()) as {
    accepts: Array<{ payTo: Address; maxAmountRequired: string; maxTimeoutSeconds: number }>;
  };
  const requirements = paymentRequired.accepts[0];
  if (!requirements) {
    throw new Error("No payment requirements in 402 response");
  }

  console.log(`   Creating payment:`);
  console.log(`   - Amount: ${parseInt(requirements.maxAmountRequired) / 1e18} QUSD`);
  console.log(`   - Recipient: ${requirements.payTo}`);
  console.log(`   - Duration: ${requirements.maxTimeoutSeconds}s`);

  // Create payment header
  const { paymentHeader, paymentId } = await createX402PaymentHeader({
    tokenAddress: TOKEN_ADDRESS,
    tokenName: "Qualia USD",
    escrowAddress: ESCROW_ADDRESS,
    chainId: CHAIN_ID,
    recipient: requirements.payTo,
    amountUSD: parseInt(requirements.maxAmountRequired) / 1e18,
    durationSeconds: requirements.maxTimeoutSeconds,
    network: "localhost",
    walletClient,
    publicClient,
  });

  console.log(`   ✅ Payment created: ${paymentId}\n`);

  // Send request with payment
  console.log("   Sending request with payment header...");
  const authorizedResponse = await fetch(
    `${RESOURCE_SERVER_URL}/protected/data`,
    {
      headers: {
        "X-PAYMENT": paymentHeader,
      },
    }
  );

  console.log(`   Status: ${authorizedResponse.status}`);

  if (authorizedResponse.ok) {
    const data = await authorizedResponse.json();
    console.log(`   ✅ Success! Got protected content:`);
    console.log(`   ${JSON.stringify(data, null, 2)}`);

    // Check payment response header
    const paymentResponse = authorizedResponse.headers.get("X-PAYMENT-RESPONSE");
    if (paymentResponse) {
      console.log(`\n   💰 Payment Response:`);
      console.log(`   ${paymentResponse}`);
    }
  } else {
    const error = await authorizedResponse.text();
    console.log(`   ❌ Failed: ${error}`);
  }

  console.log("\n✅ Test complete!");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
