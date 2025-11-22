/**
 * PaymentFacilitator - Manages X402 payment lifecycle
 *
 * Responsibilities:
 * - Generate unique payment IDs
 * - Create payment requests without requiring user wallets
 * - Monitor payment status
 * - Provide payment verification
 * - Send webhooks for payment status changes
 */

import { X402Client, type X402Config, type PaymentId, type X402Payment, PaymentStatus } from "@paybot/x402";
import type { Address } from "viem";
import { keccak256, toBytes } from "viem";

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
   * Get client configuration
   */
  getConfig(): Readonly<X402Config> {
    return this.client.getConfig();
  }
}
