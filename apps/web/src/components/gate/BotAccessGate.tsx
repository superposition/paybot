/**
 * BotAccessGate Component
 *
 * Core gating component that manages payment-based access
 * ALL configuration via props (NO hardcoded values)
 */

import { useState, useEffect, ReactNode } from "react";
import { PaymentModal } from "../payment/PaymentModal";
import { PaymentStatusCard } from "../payment/PaymentStatusCard";
import type { PaymentStatus } from "../payment/PaymentStatusCard";

export interface PaymentRecord {
  paymentId: `0x${string}`;
  paymentHeader: string;
  status: PaymentStatus;
  amount: string;
  payer?: `0x${string}`;
  recipient: `0x${string}`;
  expiresAt?: number;
  txHash?: `0x${string}`;
}

export interface BotAccessGateProps {
  // Payment configuration (NO defaults - all required)
  recipient: `0x${string}`;
  amountUSD: number;
  timeoutSeconds: number;

  // Service identification
  serviceType: string;
  botId?: string;
  botName?: string;

  // API endpoint configuration
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, any>;

  // UI configuration
  title: string;
  description: string;
  showPaymentStatus?: boolean;

  // Render prop pattern
  children: (paymentRecord: PaymentRecord | null) => ReactNode;

  // Callbacks
  onPaymentCreated?: (paymentRecord: PaymentRecord) => void;
  onAccessGranted?: (paymentRecord: PaymentRecord) => void;
  onAccessDenied?: () => void;
}

export function BotAccessGate({
  recipient,
  amountUSD,
  timeoutSeconds,
  serviceType,
  botId,
  botName,
  endpoint,
  method = "GET",
  params,
  title,
  description,
  showPaymentStatus = true,
  children,
  onPaymentCreated,
  onAccessGranted,
  onAccessDenied,
}: BotAccessGateProps) {
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Check if user has active payment
  const hasActivePayment = paymentRecord && paymentRecord.status === "confirmed";

  // Handle payment creation
  const handlePaymentCreated = (
    paymentId: `0x${string}`,
    paymentHeader: string
  ) => {
    const record: PaymentRecord = {
      paymentId,
      paymentHeader,
      status: "pending",
      amount: amountUSD.toString(),
      recipient,
      expiresAt: Math.floor(Date.now() / 1000) + timeoutSeconds,
    };

    setPaymentRecord(record);
    setShowPaymentModal(false);

    if (onPaymentCreated) {
      onPaymentCreated(record);
    }

    // Start verification process
    verifyPayment(paymentHeader, paymentId);
  };

  // Verify payment with backend/facilitator
  const verifyPayment = async (
    paymentHeader: string,
    paymentId: `0x${string}`
  ) => {
    if (!endpoint) {
      // No endpoint provided, assume payment is valid
      updatePaymentStatus("confirmed");
      return;
    }

    setIsVerifying(true);

    try {
      // Send payment to protected endpoint
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
        },
        body: method !== "GET" ? JSON.stringify(params || {}) : undefined,
      });

      if (response.ok) {
        // Payment accepted
        const paymentResponseHeader = response.headers.get("X-PAYMENT-RESPONSE");
        let txHash: `0x${string}` | undefined;

        if (paymentResponseHeader) {
          try {
            const paymentResponse = JSON.parse(paymentResponseHeader);
            txHash = paymentResponse.txHash;
          } catch (e) {
            console.error("Failed to parse payment response:", e);
          }
        }

        updatePaymentStatus("confirmed", txHash);
      } else {
        // Payment rejected
        updatePaymentStatus("expired");
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      updatePaymentStatus("expired");
    } finally {
      setIsVerifying(false);
    }
  };

  // Update payment status
  const updatePaymentStatus = (
    status: PaymentStatus,
    txHash?: `0x${string}`
  ) => {
    if (!paymentRecord) return;

    const updated: PaymentRecord = {
      ...paymentRecord,
      status,
      txHash: txHash || paymentRecord.txHash,
    };

    setPaymentRecord(updated);

    if (status === "confirmed" && onAccessGranted) {
      onAccessGranted(updated);
    } else if (status === "expired" && onAccessDenied) {
      onAccessDenied();
    }
  };

  // Refresh payment status
  const handleRefreshStatus = () => {
    if (paymentRecord && paymentRecord.paymentHeader) {
      verifyPayment(paymentRecord.paymentHeader, paymentRecord.paymentId);
    }
  };

  // Check if payment is expired
  useEffect(() => {
    if (!paymentRecord || paymentRecord.status !== "pending") return;
    if (!paymentRecord.expiresAt) return;

    const checkExpiry = () => {
      const now = Math.floor(Date.now() / 1000);
      if (now >= paymentRecord.expiresAt!) {
        updatePaymentStatus("expired");
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [paymentRecord]);

  return (
    <div className="w-full">
      {/* No payment or expired - show gate */}
      {!hasActivePayment && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600 mb-6">{description}</p>

            <div className="bg-white rounded-lg p-4 mb-6 inline-block">
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <div className="text-sm text-gray-600">Access Fee</div>
                  <div className="text-2xl font-bold text-gray-900">{amountUSD} QUSD</div>
                </div>
                <div className="h-12 w-px bg-gray-300"></div>
                <div className="text-left">
                  <div className="text-sm text-gray-600">Duration</div>
                  <div className="text-2xl font-bold text-gray-900">{Math.floor(timeoutSeconds / 60)}m</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Unlock Access
            </button>

            {botId && botName && (
              <div className="mt-6 text-sm text-gray-500">
                Service: {botName} ({botId})
              </div>
            )}
          </div>

          {/* Show payment status if exists but not active */}
          {paymentRecord && showPaymentStatus && (
            <div className="mt-6">
              <PaymentStatusCard
                {...paymentRecord}
                onRefresh={handleRefreshStatus}
              />
            </div>
          )}
        </div>
      )}

      {/* Payment verified - show content */}
      {hasActivePayment && (
        <div>
          {showPaymentStatus && (
            <div className="mb-6">
              <PaymentStatusCard
                {...paymentRecord}
                onRefresh={handleRefreshStatus}
              />
            </div>
          )}

          {/* Render children with payment record */}
          {children(paymentRecord)}
        </div>
      )}

      {/* Verifying state */}
      {isVerifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-center text-gray-700 font-semibold">Verifying payment...</p>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={title}
        description={description}
        recipient={recipient}
        amountUSD={amountUSD}
        durationSeconds={timeoutSeconds}
        onPaymentCreated={handlePaymentCreated}
        onError={(error) => {
          console.error("Payment error:", error);
          setShowPaymentModal(false);
        }}
      />
    </div>
  );
}
