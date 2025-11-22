/**
 * X402 Facilitator Server
 *
 * Provides payment facilitation services for the X402 protocol.
 * This server manages payment requests, monitors payment status, and coordinates
 * between payers and service providers.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { PaymentFacilitator } from "./facilitator";

const app = new Hono();

// Configuration from environment
const PORT = parseInt(process.env.X402_FACILITATOR_PORT || "8403");
const RPC_URL = process.env.VITE_RPC_URL || "http://localhost:8545";
const CHAIN_ID = parseInt(process.env.VITE_CHAIN_ID || "31337");
const TOKEN_ADDRESS = (process.env.VITE_QUSD_TOKEN_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;
const ESCROW_ADDRESS = (process.env.VITE_ESCROW_CONTRACT_ADDRESS ||
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as `0x${string}`;

// Initialize facilitator
const facilitator = new PaymentFacilitator({
  rpcUrl: RPC_URL,
  chainId: CHAIN_ID,
  tokenAddress: TOKEN_ADDRESS,
  escrowAddress: ESCROW_ADDRESS,
});

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*", // Configure appropriately for production
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "x402-facilitator",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Get configuration
app.get("/config", (c) => {
  return c.json({
    chainId: CHAIN_ID,
    escrowAddress: ESCROW_ADDRESS,
    tokenAddress: TOKEN_ADDRESS,
  });
});

// Create payment request
app.post("/payments/create", async (c) => {
  try {
    const body = await c.req.json();
    const { recipient, amount, duration, serviceType, metadata } = body;

    if (!recipient || !amount || !duration) {
      return c.json(
        { error: "Missing required fields: recipient, amount, duration" },
        400
      );
    }

    const payment = await facilitator.createPaymentRequest({
      recipient,
      amount: BigInt(amount),
      duration: parseInt(duration),
      serviceType,
      metadata,
    });

    return c.json(payment);
  } catch (error) {
    console.error("Payment creation error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Check payment status
app.get("/payments/:paymentId", async (c) => {
  try {
    const paymentId = c.req.param("paymentId") as `0x${string}`;
    const status = await facilitator.checkPaymentStatus(paymentId);
    return c.json(status);
  } catch (error) {
    console.error("Payment status check error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Monitor payment (webhook endpoint for status updates)
app.post("/payments/:paymentId/monitor", async (c) => {
  try {
    const paymentId = c.req.param("paymentId") as `0x${string}`;
    const body = await c.req.json();
    const { callbackUrl } = body;

    if (!callbackUrl) {
      return c.json({ error: "Missing required field: callbackUrl" }, 400);
    }

    await facilitator.monitorPayment(paymentId, callbackUrl);

    return c.json({
      paymentId,
      monitoring: true,
      callbackUrl,
    });
  } catch (error) {
    console.error("Payment monitoring error:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Start server
console.log(`🚀 X402 Facilitator Server starting on port ${PORT}`);
console.log(`📡 RPC URL: ${RPC_URL}`);
console.log(`🔗 Chain ID: ${CHAIN_ID}`);
console.log(`💎 Escrow: ${ESCROW_ADDRESS}`);
console.log(`🪙 Token: ${TOKEN_ADDRESS}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
