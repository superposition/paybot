/**
 * Core X402 type definitions
 *
 * All types are designed to be config-driven with NO defaults.
 */

import type { Address, Hex } from "viem";

/**
 * X402 Payment identifier
 */
export type PaymentId = Hex;

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = "PENDING",
  CLAIMED = "CLAIMED",
  REFUNDED = "REFUNDED",
  EXPIRED = "EXPIRED",
}

/**
 * X402 Payment structure
 */
export interface X402Payment {
  id: PaymentId;
  payer: Address;
  recipient: Address;
  amount: bigint;
  expiresAt: bigint;
  claimed: boolean;
  refunded: boolean;
  status: PaymentStatus;
}

/**
 * X402 Configuration (all values must be provided - NO defaults)
 */
export interface X402Config {
  /** RPC URL for blockchain connection */
  rpcUrl: string;
  /** Chain ID */
  chainId: number;
  /** QUSD Token contract address */
  tokenAddress: Address;
  /** Escrow contract address */
  escrowAddress: Address;
}
