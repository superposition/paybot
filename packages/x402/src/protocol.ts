/**
 * X402 Protocol Types and Utilities
 *
 * Implements the HTTP 402 Payment Required protocol specification
 * https://github.com/coinbase/x402
 */

import type { Address, Hex } from "viem";

/**
 * X402 Protocol Version
 */
export const X402_VERSION = 1;

/**
 * Payment scheme types
 */
export type PaymentScheme = "evm-permit" | "evm-legacy";

/**
 * Network identifiers
 */
export type Network = "base" | "ethereum" | "polygon" | "localhost";

/**
 * Payment Requirements - sent in 402 response
 */
export interface PaymentRequirements {
  scheme: PaymentScheme;
  network: Network;
  maxAmountRequired: string; // BigInt as string
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: Address;
  asset: Address; // Token contract address
  maxTimeoutSeconds: number;
  outputSchema?: string;
  extra?: Record<string, unknown>;
}

/**
 * 402 Payment Required Response
 */
export interface Payment402Response {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}

/**
 * EVM Permit Payload (for gasless transactions)
 */
export interface EVMPermitPayload {
  paymentId: Hex;
  payer: Address;
  recipient: Address;
  amount: string; // BigInt as string
  duration: number;
  deadline: string; // BigInt as string
  nonce: string; // BigInt as string
  permitSignature: {
    v: number;
    r: Hex;
    s: Hex;
  };
  paymentSignature: {
    v: number;
    r: Hex;
    s: Hex;
  };
}

/**
 * Payment Payload - sent in X-PAYMENT header
 */
export interface PaymentPayload {
  x402Version: number;
  scheme: PaymentScheme;
  network: Network;
  payload: EVMPermitPayload;
}

/**
 * Payment Response Header - sent in X-PAYMENT-RESPONSE header
 */
export interface PaymentResponseHeader {
  txHash: Hex;
  paymentId: Hex;
  settled: boolean;
  blockNumber?: string;
  timestamp?: number;
}

/**
 * Verification Request
 */
export interface VerifyRequest {
  payment: string; // Base64-encoded PaymentPayload
}

/**
 * Verification Response
 */
export interface VerifyResponse {
  valid: boolean;
  paymentId?: Hex;
  payer?: Address;
  amount?: string;
  error?: string;
}

/**
 * Settlement Request
 */
export interface SettleRequest {
  paymentId: Hex;
  payment: string; // Base64-encoded PaymentPayload
}

/**
 * Settlement Response
 */
export interface SettleResponse {
  txHash: Hex;
  paymentId: Hex;
  settled: boolean;
  blockNumber?: string;
  error?: string;
}

/**
 * Encode payment payload to base64 (browser-compatible)
 */
export function encodePaymentPayload(payload: PaymentPayload): string {
  const json = JSON.stringify(payload);
  // Use browser-compatible base64 encoding
  if (typeof globalThis.btoa !== 'undefined') {
    return globalThis.btoa(json);
  } else {
    // Node.js environment
    return Buffer.from(json).toString("base64");
  }
}

/**
 * Decode payment payload from base64 (browser-compatible)
 */
export function decodePaymentPayload(encoded: string): PaymentPayload {
  // Use browser-compatible base64 decoding
  if (typeof globalThis.atob !== 'undefined') {
    const json = globalThis.atob(encoded);
    return JSON.parse(json);
  } else {
    // Node.js environment
    const json = Buffer.from(encoded, "base64").toString("utf8");
    return JSON.parse(json);
  }
}

/**
 * Create 402 Payment Required response
 */
export function create402Response(
  requirements: PaymentRequirements | PaymentRequirements[],
  error?: string
): Payment402Response {
  return {
    x402Version: X402_VERSION,
    accepts: Array.isArray(requirements) ? requirements : [requirements],
    error,
  };
}

/**
 * Create payment response header
 */
export function createPaymentResponse(
  txHash: Hex,
  paymentId: Hex,
  settled: boolean,
  blockNumber?: bigint
): PaymentResponseHeader {
  return {
    txHash,
    paymentId,
    settled,
    blockNumber: blockNumber?.toString(),
    timestamp: Date.now(),
  };
}

/**
 * Parse X-PAYMENT header
 */
export function parsePaymentHeader(header: string): PaymentPayload {
  return decodePaymentPayload(header);
}

/**
 * Create X-PAYMENT header
 */
export function createPaymentHeader(payload: PaymentPayload): string {
  return encodePaymentPayload(payload);
}

/**
 * Validate payment payload structure
 */
export function validatePaymentPayload(payload: PaymentPayload): {
  valid: boolean;
  error?: string;
} {
  // Check version
  if (payload.x402Version !== X402_VERSION) {
    return { valid: false, error: `Unsupported version: ${payload.x402Version}` };
  }

  // Check scheme
  if (payload.scheme !== "evm-permit" && payload.scheme !== "evm-legacy") {
    return { valid: false, error: `Unsupported scheme: ${payload.scheme}` };
  }

  // Validate EVM permit payload
  const evmPayload = payload.payload;
  if (!evmPayload.paymentId || !evmPayload.payer || !evmPayload.recipient) {
    return { valid: false, error: "Missing required fields in payload" };
  }

  if (!evmPayload.permitSignature || !evmPayload.paymentSignature) {
    return { valid: false, error: "Missing signatures" };
  }

  return { valid: true };
}
