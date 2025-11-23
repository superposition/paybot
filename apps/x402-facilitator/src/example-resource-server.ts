/**
 * Example Resource Server with X402 Protection
 *
 * This demonstrates how to use the X402 middleware to require payment
 * before granting access to API endpoints.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { x402Middleware, x402CheckOnly } from "@paybot/x402";
import type { Hex } from "viem";

type Variables = {
  x402Payment?: {
    paymentId: Hex;
    txHash?: Hex;
    payer: string;
    amount: string;
  };
};

const app = new Hono<{ Variables: Variables }>();

// Configuration from environment
const PORT = parseInt(process.env.RESOURCE_SERVER_PORT || "8404");
const PAY_TO_ADDRESS = (process.env.VITE_ESCROW_CONTRACT_ADDRESS ||
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as `0x${string}`;
const ASSET_ADDRESS = (process.env.VITE_QUSD_TOKEN_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:8403";
const ACTUAL_ROBOT_URL = process.env.ACTUAL_ROBOT_URL; // Optional: forward to real robot

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    credentials: true,
    exposeHeaders: ["X-PAYMENT-RESPONSE"],
  })
);

// Health check (no payment required)
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "x402-resource-server",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Free endpoint (no payment required)
app.get("/free/info", (c) => {
  return c.json({
    message: "This endpoint is free - no payment required",
    timestamp: new Date().toISOString(),
  });
});

// Protected endpoint - requires payment
app.get(
  "/protected/data",
  x402Middleware({
    payTo: PAY_TO_ADDRESS,
    asset: ASSET_ADDRESS,
    maxAmountRequired: "100000000000000000000", // 100 QUSD
    network: "localhost",
    maxTimeoutSeconds: 3600,
    facilitatorUrl: FACILITATOR_URL,
    description: "Access to protected data endpoint",
  }),
  (c) => {
    const payment = c.get("x402Payment");

    return c.json({
      message: "Success! You have paid for this content.",
      data: {
        secret: "This is the protected data you paid for!",
        timestamp: new Date().toISOString(),
        yourPayment: payment,
      },
    });
  }
);

// Robot control endpoint - requires payment
app.post(
  "/robot/control",
  x402Middleware({
    payTo: PAY_TO_ADDRESS,
    asset: ASSET_ADDRESS,
    maxAmountRequired: "100000000000000000000", // 100 QUSD (matches VITE_ROBOT_FULL_ACCESS_PRICE)
    network: "localhost",
    maxTimeoutSeconds: 3600, // 1 hour (matches VITE_DEFAULT_PAYMENT_TIMEOUT)
    facilitatorUrl: FACILITATOR_URL,
    description: "Robot control access",
  }),
  async (c) => {
    const payment = c.get("x402Payment");
    const body = await c.req.json();
    const { command } = body;

    console.log(`🤖 Robot command received: ${command} (from ${payment?.payer})`);

    // Validate command
    const validCommands = ["forward", "backward", "left", "right", "stop"];
    if (!command || !validCommands.includes(command)) {
      return c.json({
        error: "Invalid command",
        validCommands,
        timestamp: new Date().toISOString(),
      }, 400);
    }

    console.log(`✅ Executing robot command: ${command.toUpperCase()}`);

    // If actual robot URL is configured, forward the command
    let robotResponse = null;
    if (ACTUAL_ROBOT_URL) {
      try {
        console.log(`🔄 Forwarding command to actual robot: ${ACTUAL_ROBOT_URL}`);
        const response = await fetch(ACTUAL_ROBOT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        });

        if (response.ok) {
          robotResponse = await response.json();
          console.log(`✅ Robot responded:`, robotResponse);
        } else {
          console.error(`❌ Robot error: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Failed to forward to robot:`, error);
      }
    }

    return c.json({
      success: true,
      message: `Robot command '${command}' executed successfully`,
      command,
      payment: {
        paymentId: payment?.paymentId,
        payer: payment?.payer,
      },
      robotResponse: robotResponse || "No physical robot configured",
      timestamp: new Date().toISOString(),
    });
  }
);

// Test endpoint - only checks for payment header (no verification)
app.get(
  "/test/payment-check",
  x402CheckOnly({
    payTo: PAY_TO_ADDRESS,
    asset: ASSET_ADDRESS,
    maxAmountRequired: "1000000000000000000", // 1 QUSD
    network: "localhost",
    maxTimeoutSeconds: 3600,
    description: "Test payment check",
  }),
  (c) => {
    const payment = c.get("x402Payment");

    return c.json({
      message: "Payment header detected (not verified)",
      payment,
      timestamp: new Date().toISOString(),
    });
  }
);

// List all protected endpoints
app.get("/endpoints", (c) => {
  return c.json({
    endpoints: [
      {
        path: "/free/info",
        method: "GET",
        requiresPayment: false,
        description: "Free information endpoint",
      },
      {
        path: "/protected/data",
        method: "GET",
        requiresPayment: true,
        amount: "100 QUSD",
        timeout: "1 hour",
        description: "Access to protected data",
      },
      {
        path: "/robot/control",
        method: "POST",
        requiresPayment: true,
        amount: "100 QUSD",
        timeout: "1 hour",
        description: "Robot control access - commands: forward, backward, left, right, stop",
      },
      {
        path: "/test/payment-check",
        method: "GET",
        requiresPayment: true,
        amount: "1 QUSD",
        timeout: "1 hour",
        description: "Test payment check (no verification)",
      },
    ],
  });
});

// Start server
console.log(`🚀 Example Resource Server starting on port ${PORT}`);
console.log(`💰 Payment Address: ${PAY_TO_ADDRESS}`);
console.log(`🪙 Asset Address: ${ASSET_ADDRESS}`);
console.log(`🔗 Facilitator URL: ${FACILITATOR_URL}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
