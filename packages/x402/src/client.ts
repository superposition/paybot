/**
 * X402Client - Config-driven payment protocol client
 *
 * All configuration is provided via constructor - NO hardcoded values.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type PublicClient,
  type WalletClient,
  type Transport,
} from "viem";
import type {
  X402Config,
  PaymentRequest,
  PaymentResponse,
  PaymentRecord,
  X402Payment,
  ClaimResponse,
  RefundResponse,
  PaymentId,
} from "./types";
import { PaymentStatus } from "./types";
import { ESCROW_ABI, TOKEN_ABI } from "./abis";

/**
 * X402Client for managing payments
 */
export class X402Client {
  private config: X402Config;
  private publicClient: PublicClient<Transport, Chain>;
  private walletClient: WalletClient<Transport, Chain, Account> | null = null;

  /**
   * Create X402Client
   * @param config - X402 configuration (all required, no defaults)
   */
  constructor(config: X402Config) {
    this.config = config;

    // Create public client for reading blockchain state
    this.publicClient = createPublicClient({
      transport: http(config.rpcUrl),
      chain: {
        id: config.chainId,
        name: "Custom Chain",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: [config.rpcUrl] },
        },
      },
    });
  }

  /**
   * Connect wallet for transaction signing
   * @param account - Viem account for signing transactions
   */
  connect(account: Account): void {
    this.walletClient = createWalletClient({
      account,
      transport: http(this.config.rpcUrl),
      chain: {
        id: this.config.chainId,
        name: "Custom Chain",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: [this.config.rpcUrl] },
        },
      },
    });
  }

  /**
   * Create a new payment
   * @param request - Payment request parameters
   * @returns Payment response with transaction hash
   * @throws Error if wallet not connected or transaction fails
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.walletClient) {
      throw new Error("Wallet not connected. Call connect() first.");
    }

    const { paymentId, recipient, amount, duration } = request;

    // First approve tokens
    const approveHash = await this.walletClient.writeContract({
      address: this.config.tokenAddress,
      abi: TOKEN_ABI,
      functionName: "approve",
      args: [this.config.escrowAddress, amount],
    });

    await this.publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Create payment
    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "createPayment",
      args: [paymentId, recipient, amount, BigInt(duration)],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    // Fetch payment details
    const payment = await this.getPayment(paymentId);

    return {
      paymentId,
      transactionHash: hash,
      payment,
    };
  }

  /**
   * Check payment status
   * @param paymentId - Payment identifier
   * @returns Payment details with current status
   */
  async checkPaymentStatus(paymentId: PaymentId): Promise<X402Payment> {
    return this.getPayment(paymentId);
  }

  /**
   * Claim a payment (recipient only)
   * @param paymentId - Payment identifier
   * @returns Claim response with transaction hash
   * @throws Error if wallet not connected or claim fails
   */
  async claimPayment(paymentId: PaymentId): Promise<ClaimResponse> {
    if (!this.walletClient) {
      throw new Error("Wallet not connected. Call connect() first.");
    }

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "claimPayment",
      args: [paymentId],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    // Fetch updated payment details
    const payment = await this.getPayment(paymentId);

    return {
      paymentId,
      transactionHash: hash,
      payment,
    };
  }

  /**
   * Refund a payment (payer only, after expiry)
   * @param paymentId - Payment identifier
   * @returns Refund response with transaction hash
   * @throws Error if wallet not connected or refund fails
   */
  async refundPayment(paymentId: PaymentId): Promise<RefundResponse> {
    if (!this.walletClient) {
      throw new Error("Wallet not connected. Call connect() first.");
    }

    const hash = await this.walletClient.writeContract({
      address: this.config.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "refundPayment",
      args: [paymentId],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    // Fetch updated payment details
    const payment = await this.getPayment(paymentId);

    return {
      paymentId,
      transactionHash: hash,
      payment,
    };
  }

  /**
   * Get payment from blockchain
   * @param paymentId - Payment identifier
   * @returns Payment with computed status
   * @private
   */
  private async getPayment(paymentId: PaymentId): Promise<X402Payment> {
    const record = (await this.publicClient.readContract({
      address: this.config.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "getPayment",
      args: [paymentId],
    })) as unknown as PaymentRecord;

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const status = this.computeStatus(record, currentTime);

    return {
      id: paymentId,
      ...record,
      status,
    };
  }

  /**
   * Compute payment status based on state and time
   * @param record - Payment record from blockchain
   * @param currentTime - Current timestamp
   * @returns Computed payment status
   * @private
   */
  private computeStatus(
    record: PaymentRecord,
    currentTime: bigint
  ): PaymentStatus {
    if (record.claimed) return PaymentStatus.CLAIMED;
    if (record.refunded) return PaymentStatus.REFUNDED;
    if (currentTime > record.expiresAt) return PaymentStatus.EXPIRED;
    return PaymentStatus.PENDING;
  }

  /**
   * Get current configuration
   * @returns X402 configuration
   */
  getConfig(): Readonly<X402Config> {
    return { ...this.config };
  }
}
