/**
 * PaymentStatusCard Component
 *
 * Displays current payment status with countdown timer
 */

import { useState, useEffect } from "react";

export type PaymentStatus = "pending" | "confirmed" | "expired" | "refunded";

export interface PaymentStatusCardProps {
  paymentId: `0x${string}`;
  status: PaymentStatus;
  amount: string; // Amount in QUSD
  payer?: `0x${string}`;
  recipient?: `0x${string}`;
  expiresAt?: number; // Unix timestamp
  txHash?: `0x${string}`;
  onRefresh?: () => void;
}

export function PaymentStatusCard({
  paymentId,
  status,
  amount,
  payer,
  recipient,
  expiresAt,
  txHash,
  onRefresh,
}: PaymentStatusCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Calculate time remaining
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const statusConfig = {
    pending: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Pending",
    },
    confirmed: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      label: "Confirmed",
    },
    expired: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "Expired",
    },
    refunded: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-800",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      label: "Refunded",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`${config.bg} ${config.border} border-2 rounded-lg p-6 shadow-sm`}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={config.text}>{config.icon}</div>
          <h3 className={`text-lg font-semibold ${config.text}`}>{config.label}</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Payment Amount */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900">{amount} QUSD</div>
      </div>

      {/* Payment Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Payment ID</span>
          <span className="font-mono text-gray-900">
            {paymentId.slice(0, 6)}...{paymentId.slice(-4)}
          </span>
        </div>

        {payer && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">From</span>
            <span className="font-mono text-gray-900">
              {payer.slice(0, 6)}...{payer.slice(-4)}
            </span>
          </div>
        )}

        {recipient && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">To</span>
            <span className="font-mono text-gray-900">
              {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </span>
          </div>
        )}

        {txHash && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Transaction</span>
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue-600 hover:text-blue-800"
            >
              {txHash.slice(0, 6)}...{txHash.slice(-4)}
            </a>
          </div>
        )}
      </div>

      {/* Countdown Timer */}
      {status === "pending" && expiresAt && timeRemaining > 0 && (
        <div className="bg-white bg-opacity-50 rounded-lg p-3 border border-yellow-300">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Time Remaining</span>
            <span className="text-lg font-mono font-semibold text-yellow-800">
              {formatTime(timeRemaining)}
            </span>
          </div>
          <div className="mt-2 bg-yellow-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-yellow-500 h-full transition-all duration-1000"
              style={{
                width: `${(timeRemaining / ((expiresAt - Math.floor(Date.now() / 1000)) + timeRemaining)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Expired Timer */}
      {status === "pending" && expiresAt && timeRemaining === 0 && (
        <div className="bg-red-100 rounded-lg p-3 border border-red-300">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-red-800">Payment Expired</span>
          </div>
        </div>
      )}
    </div>
  );
}
