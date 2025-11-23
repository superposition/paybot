/**
 * PaymentFacilitator - Manages X402 payment lifecycle
 *
 * Responsibilities:
 * - Generate unique payment IDs
 * - Create payment requests without requiring user wallets
 * - Monitor payment status
 * - Provide payment verification (X402 /verify endpoint)
 * - Settle payments on blockchain (X402 /settle endpoint)
 * - Send webhooks for payment status changes
 */

import {
  X402Client,
  type X402Config,
  type PaymentId,
  type X402Payment,
  PaymentStatus,
  type PaymentPayload,
  type VerifyResponse,
  type SettleResponse,
  decodePaymentPayload,
  validatePaymentPayload,
  ESCROW_ABI,
} from "@paybot/x402";
import type { Address, Hex } from "viem";
import {
  keccak256,
  toBytes,
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

interface PaymentRequestParams {
  recipient: Address;
  amount: bigint;
  duration: number;
  serviceType?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentRequestResponse {
  paymentId: PaymentId;
  recipient: Address;
  amount: string;
  duration: number;
  expiresAt: number;
  status: string;
  qrCodeData: string;
  deepLink: string;
}

interface MonitoredPayment {
  paymentId: PaymentId;
  callbackUrl: string;
  lastStatus: PaymentStatus;
  pollInterval?: NodeJS.Timeout;
}

export class PaymentFacilitator {
  private client: X402Client;
  private monitoredPayments: Map<PaymentId, MonitoredPayment>;

  constructor(config: X402Config) {
    this.client = new X402Client(config);
    this.monitoredPayments = new Map();
  }

  /**
   * Generate unique payment ID from request parameters
   */
  private generatePaymentId(params: PaymentRequestParams): PaymentId {
    const data = `${params.recipient}-${params.amount}-${Date.now()}-${Math.random()}`;
    return keccak256(toBytes(data));
  }

  /**
   * Create a payment request
   * Returns payment details that can be encoded in QR code or deep link
   */
  async createPaymentRequest(
    params: PaymentRequestParams
  ): Promise<PaymentRequestResponse> {
    const paymentId = this.generatePaymentId(params);
    const expiresAt = Math.floor(Date.now() / 1000) + params.duration;

    // Create payment request data for QR code / deep link
    const qrCodeData = JSON.stringify({
      paymentId,
      recipient: params.recipient,
      amount: params.amount.toString(),
      duration: params.duration,
      serviceType: params.serviceType,
      metadata: params.metadata,
    });

    // Create deep link for mobile wallets
    const deepLink = `x402://pay?id=${paymentId}&recipient=${params.recipient}&amount=${params.amount}&duration=${params.duration}`;

    return {
      paymentId,
      recipient: params.recipient,
      amount: params.amount.toString(),
      duration: params.duration,
      expiresAt,
      status: "PENDING_CREATION",
      qrCodeData,
      deepLink,
    };
  }

  /**
   * Check payment status on blockchain
   */
  async checkPaymentStatus(paymentId: PaymentId): Promise<X402Payment> {
    return await this.client.checkPaymentStatus(paymentId);
  }

  /**
   * Monitor payment and send webhook on status change
   */
  async monitorPayment(
    paymentId: PaymentId,
    callbackUrl: string,
    pollIntervalMs: number = 5000
  ): Promise<void> {
    // Stop existing monitoring if any
    const existing = this.monitoredPayments.get(paymentId);
    if (existing?.pollInterval) {
      clearInterval(existing.pollInterval);
    }

    // Get initial status
    let lastStatus: PaymentStatus;
    try {
      const payment = await this.checkPaymentStatus(paymentId);
      lastStatus = payment.status;
    } catch (error) {
      // Payment not yet created on blockchain
      lastStatus = PaymentStatus.PENDING;
    }

    // Set up polling
    const pollInterval = setInterval(async () => {
      try {
        const payment = await this.checkPaymentStatus(paymentId);

        // Check if status changed
        if (payment.status !== lastStatus) {
          lastStatus = payment.status;

          // Send webhook notification
          await this.sendWebhook(callbackUrl, {
            paymentId,
            status: payment.status,
            payment,
            timestamp: new Date().toISOString(),
          });

          // Stop monitoring if payment is in final state
          if (
            payment.status === PaymentStatus.CLAIMED ||
            payment.status === PaymentStatus.REFUNDED
          ) {
            const monitored = this.monitoredPayments.get(paymentId);
            if (monitored?.pollInterval) {
              clearInterval(monitored.pollInterval);
            }
            this.monitoredPayments.delete(paymentId);
          }
        }
      } catch (error) {
        console.error(`Error monitoring payment ${paymentId}:`, error);
      }
    }, pollIntervalMs);

    // Store monitored payment
    this.monitoredPayments.set(paymentId, {
      paymentId,
      callbackUrl,
      lastStatus,
      pollInterval,
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    url: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error(`Failed to send webhook to ${url}:`, error);
    }
  }

  /**
   * Stop monitoring a payment
   */
  stopMonitoring(paymentId: PaymentId): void {
    const monitored = this.monitoredPayments.get(paymentId);
    if (monitored?.pollInterval) {
      clearInterval(monitored.pollInterval);
    }
    this.monitoredPayments.delete(paymentId);
  }

  /**
   * Stop all monitoring
   */
  stopAllMonitoring(): void {
    for (const monitored of this.monitoredPayments.values()) {
      if (monitored.pollInterval) {
        clearInterval(monitored.pollInterval);
      }
    }
    this.monitoredPayments.clear();
  }

  /**
   * Verify payment payload (X402 /verify endpoint)
   * Validates signatures and payment structure without settling on-chain
   */
  async verifyPayment(encodedPayment: string): Promise<VerifyResponse> {
    try {
      // Decode payment payload
      const payload: PaymentPayload = decodePaymentPayload(encodedPayment);

      // Validate payload structure
      const validation = validatePaymentPayload(payload);
      if (!validation.valid) {
        return {
          valid: false,
          error: validation.error,
        };
      }

      // Extract EVM permit payload
      const evmPayload = payload.payload;

      // TODO: Verify permit signature
      // TODO: Verify payment intent signature
      // For now, basic validation passes

      return {
        valid: true,
        paymentId: evmPayload.paymentId,
        payer: evmPayload.payer,
        amount: evmPayload.amount,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Settle payment on blockchain (X402 /settle endpoint)
   * Submits the gasless transaction and pays gas fees
   *
   * @param facilitatorPrivateKey - Private key of facilitator account that will pay gas
   */
  async settlePayment(
    encodedPayment: string,
    facilitatorPrivateKey: Hex
  ): Promise<SettleResponse> {
    try {
      console.log("🔍 [FACILITATOR] Verifying payment payload...");
      // First verify the payment
      const verification = await this.verifyPayment(encodedPayment);
      if (!verification.valid) {
        console.error("❌ [FACILITATOR] Payment verification failed:", verification.error);
        return {
          txHash: "0x0" as Hex,
          paymentId: "0x0" as Hex,
          settled: false,
          error: verification.error,
        };
      }

      console.log("✅ [FACILITATOR] Payment verified successfully");
      console.log("   Payer:", verification.payer);
      console.log("   Amount:", verification.amount);

      // Decode payment payload
      const payload: PaymentPayload = decodePaymentPayload(encodedPayment);
      const evmPayload = payload.payload;
      const config = this.client.getConfig();

      console.log("📝 [FACILITATOR] Payment details:");
      console.log("   Payment ID:", evmPayload.paymentId);
      console.log("   Recipient:", evmPayload.recipient);
      console.log("   Duration:", evmPayload.duration, "seconds");

      // Create facilitator account
      const facilitatorAccount = privateKeyToAccount(facilitatorPrivateKey);

      // Create wallet client for facilitator
      const walletClient = createWalletClient({
        account: facilitatorAccount,
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

      // Create public client
      const publicClient = createPublicClient({
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

      console.log("🔗 [FACILITATOR] Calling escrow contract...");
      console.log("   Escrow address:", config.escrowAddress);
      console.log("   Facilitator address:", facilitatorAccount.address);

      // Call createPaymentWithPermit on the escrow contract
      const txHash = await walletClient.writeContract({
        address: config.escrowAddress,
        abi: ESCROW_ABI,
        functionName: "createPaymentWithPermit",
        args: [
          evmPayload.paymentId,
          evmPayload.payer,
          evmPayload.recipient,
          BigInt(evmPayload.amount),
          BigInt(evmPayload.duration),
          BigInt(evmPayload.deadline),
          evmPayload.paymentSignature.v,
          evmPayload.paymentSignature.r,
          evmPayload.paymentSignature.s,
          evmPayload.permitSignature.v,
          evmPayload.permitSignature.r,
          evmPayload.permitSignature.s,
        ],
      });

      console.log("📤 [FACILITATOR] Transaction submitted:", txHash);
      console.log("⏳ [FACILITATOR] Waiting for transaction confirmation...");

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      console.log("✅ [FACILITATOR] Transaction confirmed!");
      console.log("   Status:", receipt.status);
      console.log("   Block number:", receipt.blockNumber);
      console.log("   Gas used:", receipt.gasUsed);

      return {
        txHash,
        paymentId: evmPayload.paymentId,
        settled: receipt.status === "success",
        blockNumber: receipt.blockNumber.toString(),
      };
    } catch (error) {
      console.error("Settlement error:", error);
      return {
        txHash: "0x0" as Hex,
        paymentId: "0x0" as Hex,
        settled: false,
        error: error instanceof Error ? error.message : "Unknown settlement error",
      };
    }
  }

  /**
   * Get client configuration
   */
  getConfig(): Readonly<X402Config> {
    return this.client.getConfig();
  }
}
