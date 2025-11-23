/**
 * X402 Configuration
 *
 * All configuration values from environment variables (NO hardcoded values)
 */

import type { Address } from "viem";

// Contract addresses
export const X402_CONTRACTS = {
  escrow: import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS as Address,
  qusdToken: import.meta.env.VITE_QUSD_TOKEN_ADDRESS as Address,
} as const;

// API endpoints
export const X402_ENDPOINTS = {
  facilitator: import.meta.env.VITE_FACILITATOR_URL as string,
  botServer: import.meta.env.VITE_BOT_SERVER_URL as string,
  backend: import.meta.env.VITE_BACKEND_URL as string,
  provider: import.meta.env.VITE_RPC_URL as string,
} as const;

// Service pricing (in QUSD wei - 1 QUSD = 10^18 wei)
export const SERVICE_PRICES = {
  chat: "1000000000000000000", // 1 QUSD
  video: "5000000000000000000", // 5 QUSD
  data: "10000000000000000000", // 10 QUSD
  robotControl: "50000000000000000000", // 50 QUSD
  robotFullAccess: "100000000000000000000", // 100 QUSD
} as const;

// X402 protocol configuration
export const X402_CONFIG = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID),
  defaultTimeout: Number(import.meta.env.VITE_DEFAULT_PAYMENT_TIMEOUT || "3600"), // 1 hour default
  tokenName: "Qualia USD",
  requestTimeout: 60000, // 60 seconds for RPC requests
} as const;

// Helper functions
export function calculateTimeout(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

export function formatQusd(wei: string): string {
  const qusd = BigInt(wei) / BigInt(10 ** 18);
  return `${qusd} QUSD`;
}

// Robot configuration
export const ROBOT_CONFIG = {
  providerAddress: import.meta.env.VITE_ROBOT_PROVIDER_ADDRESS as Address,
  controlUrl: import.meta.env.VITE_ROBOT_CONTROL_URL as string,
  botId: import.meta.env.VITE_ROBOT_BOT_ID as string,
  botName: import.meta.env.VITE_ROBOT_BOT_NAME || "Robot",
} as const;

// Validation
function validateConfig() {
  const errors: string[] = [];

  if (!X402_CONTRACTS.escrow) {
    errors.push("VITE_ESCROW_CONTRACT_ADDRESS not set");
  }
  if (!X402_CONTRACTS.qusdToken) {
    errors.push("VITE_QUSD_TOKEN_ADDRESS not set");
  }
  if (!X402_ENDPOINTS.facilitator) {
    errors.push("VITE_FACILITATOR_URL not set");
  }
  if (!X402_ENDPOINTS.provider) {
    errors.push("VITE_RPC_URL not set");
  }
  if (!X402_CONFIG.chainId) {
    errors.push("VITE_CHAIN_ID not set");
  }

  if (errors.length > 0) {
    console.error("X402 Configuration Errors:", errors);
    throw new Error(
      `Missing required environment variables:\n${errors.join("\n")}`
    );
  }
}

// Validate on import
validateConfig();
