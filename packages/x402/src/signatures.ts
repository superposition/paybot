/**
 * X402 Signature Utilities
 *
 * Utilities for creating EIP-712 signatures for gasless payments
 */

import {
  type Address,
  type Hex,
  type WalletClient,
  type PublicClient,
} from "viem";
import type { EVMPermitPayload } from "./protocol";

/**
 * Sign EIP-2612 permit for token approval
 */
export async function signPermit(
  tokenAddress: Address,
  tokenName: string,
  chainId: number,
  owner: Address,
  spender: Address,
  value: bigint,
  nonce: bigint,
  deadline: bigint,
  walletClient: WalletClient
): Promise<{ v: number; r: Hex; s: Hex }> {
  const domain = {
    name: tokenName,
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const values = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  };

  const signature = await walletClient.signTypedData({
    account: owner,
    domain,
    types,
    primaryType: "Permit",
    message: values,
  });

  // Split signature
  const r = signature.slice(0, 66) as Hex;
  const s = ("0x" + signature.slice(66, 130)) as Hex;
  const v = parseInt(signature.slice(130, 132), 16);

  return { v, r, s };
}

/**
 * Sign PaymentIntent (EIP-712) for gasless payment
 */
export async function signPaymentIntent(
  escrowAddress: Address,
  chainId: number,
  payer: Address,
  paymentId: Hex,
  recipient: Address,
  amount: bigint,
  duration: bigint,
  nonce: bigint,
  deadline: bigint,
  walletClient: WalletClient
): Promise<{ v: number; r: Hex; s: Hex }> {
  const domain = {
    name: "X402 Escrow",
    version: "1",
    chainId,
    verifyingContract: escrowAddress,
  };

  const types = {
    PaymentIntent: [
      { name: "paymentId", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const values = {
    paymentId,
    payer,
    recipient,
    amount,
    duration,
    nonce,
    deadline,
  };

  const signature = await walletClient.signTypedData({
    account: payer,
    domain,
    types,
    primaryType: "PaymentIntent",
    message: values,
  });

  // Split signature
  const r = signature.slice(0, 66) as Hex;
  const s = ("0x" + signature.slice(66, 130)) as Hex;
  const v = parseInt(signature.slice(130, 132), 16);

  return { v, r, s };
}

/**
 * Create complete EVM permit payload with signatures
 */
export async function createEVMPermitPayload(
  config: {
    tokenAddress: Address;
    tokenName: string;
    escrowAddress: Address;
    chainId: number;
  },
  payment: {
    paymentId: Hex;
    payer: Address;
    recipient: Address;
    amount: bigint;
    duration: number;
  },
  nonces: {
    tokenNonce: bigint;
    escrowNonce: bigint;
  },
  deadline: bigint,
  walletClient: WalletClient,
  _publicClient: PublicClient
): Promise<EVMPermitPayload> {
  // Sign permit for token approval
  const permitSignature = await signPermit(
    config.tokenAddress,
    config.tokenName,
    config.chainId,
    payment.payer,
    config.escrowAddress,
    payment.amount,
    nonces.tokenNonce,
    deadline,
    walletClient
  );

  // Sign payment intent
  const paymentSignature = await signPaymentIntent(
    config.escrowAddress,
    config.chainId,
    payment.payer,
    payment.paymentId,
    payment.recipient,
    payment.amount,
    BigInt(payment.duration),
    nonces.escrowNonce,
    deadline,
    walletClient
  );

  return {
    paymentId: payment.paymentId,
    payer: payment.payer,
    recipient: payment.recipient,
    amount: payment.amount.toString(),
    duration: payment.duration,
    deadline: deadline.toString(),
    nonce: nonces.escrowNonce.toString(),
    permitSignature,
    paymentSignature,
  };
}

/**
 * Get nonces for permit and escrow
 */
export async function getNonces(
  tokenAddress: Address,
  escrowAddress: Address,
  tokenAbi: any,
  escrowAbi: any,
  payer: Address,
  publicClient: PublicClient
): Promise<{ tokenNonce: bigint; escrowNonce: bigint }> {
  const [tokenNonce, escrowNonce] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "nonces",
      args: [payer],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: escrowAddress,
      abi: escrowAbi,
      functionName: "nonces",
      args: [payer],
    }) as Promise<bigint>,
  ]);

  return { tokenNonce, escrowNonce };
}
