/**
 * X402 Middleware for Resource Servers
 *
 * Provides middleware to add HTTP 402 payment requirements to endpoints
 */

import type { Context, Next } from "hono";
import type { Address } from "viem";
import {
  type PaymentRequirements,
  type PaymentPayload,
  type VerifyResponse,
  type SettleResponse,
  create402Response,
  parsePaymentHeader,
  createPaymentResponse,
  validatePaymentPayload,
} from "./protocol";

/**
 * Configuration for X402 middleware
 */
export interface X402MiddlewareConfig {
  /** Address to receive payments */
  payTo: Address;
  /** Token contract address */
  asset: Address;
  /** Maximum amount required (in token wei) */
  maxAmountRequired: string;
  /** Network identifier */
  network: "base" | "ethereum" | "polygon" | "localhost";
  /** Payment timeout in seconds */
  maxTimeoutSeconds: number;
  /** Facilitator URL for verification */
  facilitatorUrl: string;
  /** Optional description */
  description?: string;
}

/**
 * Create X402 middleware for Hono
 *
 * This middleware intercepts requests and requires payment via HTTP 402
 */
export function x402Middleware(config: X402MiddlewareConfig) {
  return async (c: Context, next: Next) => {
    const paymentHeader = c.req.header("X-PAYMENT");

    // No payment provided - return 402
    if (!paymentHeader) {
      const requirements: PaymentRequirements = {
        scheme: "evm-permit",
        network: config.network,
        maxAmountRequired: config.maxAmountRequired,
        resource: c.req.path,
        description: config.description || `Payment required for ${c.req.path}`,
        mimeType: "application/json",
        payTo: config.payTo,
        asset: config.asset,
        maxTimeoutSeconds: config.maxTimeoutSeconds,
      };

      const response = create402Response(requirements, "Payment required");

      return c.json(response, 402);
    }

    // Payment provided - verify it
    try {
      const payload: PaymentPayload = parsePaymentHeader(paymentHeader);

      // Validate payload structure
      const validation = validatePaymentPayload(payload);
      if (!validation.valid) {
        return c.json(
          create402Response(
            {
              scheme: "evm-permit",
              network: config.network,
              maxAmountRequired: config.maxAmountRequired,
              resource: c.req.path,
              payTo: config.payTo,
              asset: config.asset,
              maxTimeoutSeconds: config.maxTimeoutSeconds,
            },
            `Invalid payment: ${validation.error}`
          ),
          402
        );
      }

      // Verify with facilitator
      const verifyResponse = await fetch(`${config.facilitatorUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: paymentHeader,
        }),
      });

      if (!verifyResponse.ok) {
        return c.json(
          create402Response(
            {
              scheme: "evm-permit",
              network: config.network,
              maxAmountRequired: config.maxAmountRequired,
              resource: c.req.path,
              payTo: config.payTo,
              asset: config.asset,
              maxTimeoutSeconds: config.maxTimeoutSeconds,
            },
            "Payment verification failed"
          ),
          402
        );
      }

      const verifyResult = (await verifyResponse.json()) as VerifyResponse;
      if (!verifyResult.valid) {
        return c.json(
          create402Response(
            {
              scheme: "evm-permit",
              network: config.network,
              maxAmountRequired: config.maxAmountRequired,
              resource: c.req.path,
              payTo: config.payTo,
              asset: config.asset,
              maxTimeoutSeconds: config.maxTimeoutSeconds,
            },
            `Payment verification failed: ${verifyResult.error}`
          ),
          402
        );
      }

      // Settle payment on blockchain
      const settleResponse = await fetch(`${config.facilitatorUrl}/settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: paymentHeader,
        }),
      });

      if (!settleResponse.ok) {
        return c.json(
          create402Response(
            {
              scheme: "evm-permit",
              network: config.network,
              maxAmountRequired: config.maxAmountRequired,
              resource: c.req.path,
              payTo: config.payTo,
              asset: config.asset,
              maxTimeoutSeconds: config.maxTimeoutSeconds,
            },
            "Payment settlement failed"
          ),
          402
        );
      }

      const settleResult = (await settleResponse.json()) as SettleResponse;
      if (!settleResult.settled) {
        return c.json(
          create402Response(
            {
              scheme: "evm-permit",
              network: config.network,
              maxAmountRequired: config.maxAmountRequired,
              resource: c.req.path,
              payTo: config.payTo,
              asset: config.asset,
              maxTimeoutSeconds: config.maxTimeoutSeconds,
            },
            `Payment settlement failed: ${settleResult.error}`
          ),
          402
        );
      }

      // Payment settled successfully - add response header and continue
      const paymentResponse = createPaymentResponse(
        settleResult.txHash,
        settleResult.paymentId,
        true,
        settleResult.blockNumber ? BigInt(settleResult.blockNumber) : undefined
      );

      c.header("X-PAYMENT-RESPONSE", JSON.stringify(paymentResponse));

      // Store payment info in context for downstream handlers
      c.set("x402Payment", {
        paymentId: settleResult.paymentId,
        txHash: settleResult.txHash,
        payer: payload.payload.payer,
        amount: payload.payload.amount,
      });

      return await next();
    } catch (error) {
      console.error("X402 middleware error:", error);
      return c.json(
        create402Response(
          {
            scheme: "evm-permit",
            network: config.network,
            maxAmountRequired: config.maxAmountRequired,
            resource: c.req.path,
            payTo: config.payTo,
            asset: config.asset,
            maxTimeoutSeconds: config.maxTimeoutSeconds,
          },
          `Payment processing error: ${error instanceof Error ? error.message : "Unknown error"}`
        ),
        402
      );
    }
  };
}

/**
 * Simple middleware that only checks if payment header exists
 * without verification (for testing)
 */
export function x402CheckOnly(config: Omit<X402MiddlewareConfig, "facilitatorUrl">) {
  return async (c: Context, next: Next) => {
    const paymentHeader = c.req.header("X-PAYMENT");

    if (!paymentHeader) {
      const requirements: PaymentRequirements = {
        scheme: "evm-permit",
        network: config.network,
        maxAmountRequired: config.maxAmountRequired,
        resource: c.req.path,
        description: config.description || `Payment required for ${c.req.path}`,
        mimeType: "application/json",
        payTo: config.payTo,
        asset: config.asset,
        maxTimeoutSeconds: config.maxTimeoutSeconds,
      };

      return c.json(create402Response(requirements, "Payment required"), 402);
    }

    // Payment header present - allow through
    try {
      const payload = parsePaymentHeader(paymentHeader);
      c.set("x402Payment", {
        paymentId: payload.payload.paymentId,
        payer: payload.payload.payer,
        amount: payload.payload.amount,
      });
    } catch (error) {
      // Invalid payment header
      const requirements: PaymentRequirements = {
        scheme: "evm-permit",
        network: config.network,
        maxAmountRequired: config.maxAmountRequired,
        resource: c.req.path,
        payTo: config.payTo,
        asset: config.asset,
        maxTimeoutSeconds: config.maxTimeoutSeconds,
      };

      return c.json(
        create402Response(requirements, "Invalid payment header"),
        402
      );
    }

    return await next();
  };
}
