/**
 * X402 Client Helpers
 *
 * High-level utilities for creating X402 payment requests
 */

import type { Address, Hex, WalletClient, PublicClient } from "viem";
import { keccak256, toHex, parseEther } from "viem";
import {
  createEVMPermitPayload,
  getNonces,
} from "./signatures";
import {
  createPaymentHeader,
  type PaymentPayload,
} from "./protocol";
import { ESCROW_ABI, TOKEN_ABI } from "./abis";

export interface CreatePaymentHeaderParams {
  tokenAddress: Address;
  tokenName: string;
  escrowAddress: Address;
  chainId: number;
  recipient: Address;
  amountUSD: number; // Amount in whole QUSD (e.g., 100 for 100 QUSD)
  durationSeconds: number;
  network?: "localhost" | "base" | "ethereum" | "polygon";
  walletClient: WalletClient;
  publicClient: PublicClient;
  paymentId?: Hex; // Optional, will generate if not provided
}

export interface PaymentHeaderResult {
  paymentHeader: string; // Base64 encoded for X-PAYMENT header
  paymentId: Hex;
  payload: PaymentPayload;
}

/**
 * Create a complete X402 payment header ready to send in HTTP request
 *
 * This is the main helper that users will call to create payments
 */
export async function createX402PaymentHeader(
  params: CreatePaymentHeaderParams
): Promise<PaymentHeaderResult> {
  const {
    tokenAddress,
    tokenName,
    escrowAddress,
    chainId,
    recipient,
    amountUSD,
    durationSeconds,
    network = "localhost",
    walletClient,
    publicClient,
  } = params;

  // Generate payment ID if not provided
  const paymentId =
    params.paymentId ||
    keccak256(
      toHex(`payment-${recipient}-${amountUSD}-${Date.now()}-${Math.random()}`)
    );

  // Convert USD amount to wei (18 decimals)
  const amount = parseEther(amountUSD.toString());

  // Calculate deadline (1 hour from now)
  const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
  const deadline = latestBlock.timestamp + 3600n;

  // Get payer address
  const payer = walletClient.account!.address;

  // Get nonces
  const nonces = await getNonces(
    tokenAddress,
    escrowAddress,
    TOKEN_ABI,
    ESCROW_ABI,
    payer,
    publicClient
  );

  // Create signed EVM permit payload
  const evmPayload = await createEVMPermitPayload(
    {
      tokenAddress,
      tokenName,
      escrowAddress,
      chainId,
    },
    {
      paymentId,
      payer,
      recipient,
      amount,
      duration: durationSeconds,
    },
    nonces,
    deadline,
    walletClient,
    publicClient
  );

  // Create full payment payload
  const payload: PaymentPayload = {
    x402Version: 1,
    scheme: "evm-permit",
    network,
    payload: evmPayload,
  };

  // Encode to base64 for HTTP header
  const paymentHeader = createPaymentHeader(payload);

  return {
    paymentHeader,
    paymentId,
    payload,
  };
}

/**
 * Fetch with automatic 402 payment handling
 *
 * If server returns 402, this will create payment and retry
 */
export async function fetchWithX402(
  url: string,
  options: RequestInit,
  paymentParams: Omit<CreatePaymentHeaderParams, "recipient" | "amountUSD" | "durationSeconds">
): Promise<Response> {
  // First attempt - no payment
  let response = await fetch(url, options);

  // If 402, create payment and retry
  if (response.status === 402) {
    const paymentRequired = (await response.json()) as { accepts?: Array<{ payTo: string; maxAmountRequired: string; maxTimeoutSeconds: number; network: string }> };

    // Get payment requirements from first accept option
    const requirements = paymentRequired.accepts?.[0];
    if (!requirements) {
      throw new Error("No payment requirements in 402 response");
    }

    // Create payment header
    const { paymentHeader } = await createX402PaymentHeader({
      ...paymentParams,
      recipient: requirements.payTo as Address,
      amountUSD: parseInt(requirements.maxAmountRequired) / 1e18, // Convert wei to USD
      durationSeconds: requirements.maxTimeoutSeconds,
      network: requirements.network as "localhost" | "base" | "ethereum" | "polygon",
    });

    // Retry with payment
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "X-PAYMENT": paymentHeader,
      },
    });
  }

  return response;
}

/**
 * Simple helper to create payment for a specific amount
 */
export async function createPayment(
  config: {
    tokenAddress: Address;
    tokenName: string;
    escrowAddress: Address;
    chainId: number;
  },
  payment: {
    recipient: Address;
    amountUSD: number;
    durationSeconds: number;
  },
  clients: {
    walletClient: WalletClient;
    publicClient: PublicClient;
  }
): Promise<PaymentHeaderResult> {
  return createX402PaymentHeader({
    ...config,
    ...payment,
    ...clients,
  });
}
