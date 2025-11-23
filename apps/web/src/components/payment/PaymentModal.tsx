import React, { useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { type Address } from 'viem';
import { usePayment, type PaymentRequest } from '../../hooks/usePayment';
import { SERVICE_PRICES, formatQusd, X402_CONFIG } from '../../config/x402';

export interface PaymentModalProps {
  /**
   * Service provider address
   */
  recipient: Address;
  /**
   * Service type (determines price)
   */
  serviceType: 'chat' | 'video' | 'data' | 'robotControl' | 'robotFullAccess';
  /**
   * Service endpoint URL
   */
  endpoint: string;
  /**
   * JSON-RPC method to call
   */
  method: string;
  /**
   * Method parameters
   */
  params?: any;
  /**
   * Custom payment amount (overrides serviceType price)
   */
  customAmount?: string;
  /**
   * Payment timeout in seconds
   */
  timeoutSeconds?: number;
  /**
   * Is modal open
   */
  isOpen: boolean;
  /**
   * Close modal callback
   */
  onClose: () => void;
  /**
   * Success callback with service response
   */
  onSuccess?: (response: any) => void;
  /**
   * Error callback
   */
  onError?: (error: Error) => void;
}

/**
 * PaymentModal - Modal dialog for X402 payment flow
 *
 * Features:
 * - Wallet connection
 * - Payment approval + locking
 * - Real-time countdown timer
 * - Transaction status tracking
 * - Error handling
 */
export const PaymentModal: React.FC<PaymentModalProps> = ({
  recipient,
  serviceType,
  endpoint,
  method,
  params,
  customAmount,
  timeoutSeconds = X402_CONFIG.defaultTimeout,
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { paymentStatus, isProcessing, executePayment, reset } = usePayment();

  // Calculate payment amount
  const amount = customAmount || SERVICE_PRICES[serviceType];

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Auto-close modal after successful payment
  useEffect(() => {
    if (paymentStatus.status === 'success') {
      const timer = setTimeout(() => {
        handleClose();
      }, 500); // Close after 0.5 seconds
      return () => clearTimeout(timer);
    }
  }, [paymentStatus.status, handleClose]);

  // Handle payment execution
  const handlePayment = async () => {
    try {
      const request: PaymentRequest = {
        to: recipient,
        amount,
        timeoutSeconds,
        method,
        params,
        endpoint,
      };

      const response = await executePayment(request);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full border border-gray-200">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Payment Required
              </h2>
              <p className="text-sm text-gray-500 mt-1">Secure payment via X402 Protocol</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 rounded-lg p-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Payment Details Card */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Service</span>
              <span className="font-medium text-gray-900 capitalize">{serviceType}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Amount</span>
              <span className="font-bold text-lg text-gray-900">{formatQusd(amount)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Recipient</span>
              <span className="font-mono text-sm text-gray-700">
                {recipient.slice(0, 6)}...{recipient.slice(-4)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Method</span>
              <span className="font-mono text-xs text-gray-700">{method}</span>
            </div>
          </div>

          {/* Wallet Connection */}
          {!isConnected && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">Connect your wallet to continue</p>
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  Connect with {connector.name}
                </button>
              ))}
            </div>
          )}

          {/* Payment Status */}
          {isConnected && (
            <div className="space-y-4">
              {/* Connected Wallet */}
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Wallet:</span>
                  <span className="font-mono text-sm text-gray-900">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-sm text-red-600 hover:text-red-700 hover:underline"
                  disabled={isProcessing}
                >
                  Disconnect
                </button>
              </div>

              {/* Payment Status Messages */}
              {paymentStatus.status === 'approving' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium">Approving QUSD spending...</div>
                      <div className="text-gray-600 text-sm">Please confirm in your wallet</div>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus.status === 'locking' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium">Locking payment in escrow...</div>
                      <div className="text-gray-600 text-sm">Securing funds on-chain</div>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus.status === 'sending' && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-medium">Calling service...</div>
                      <div className="text-gray-600 text-sm">Processing your request</div>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus.status === 'success' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-bold">Payment successful!</div>
                      <div className="text-gray-600 text-sm">
                        Unlocking access...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus.status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 font-bold">Payment failed</div>
                      <div className="text-gray-600 text-sm">
                        {paymentStatus.error?.message}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Button */}
              {paymentStatus.status === 'idle' && (
                <button
                  onClick={handlePayment}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  <span>Pay {formatQusd(amount)}</span>
                </button>
              )}

              {/* Close Button (Success/Error) */}
              {(paymentStatus.status === 'success' || paymentStatus.status === 'error') && (
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          )}

          {/* Info Footer */}
          <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1.5 border-t border-gray-200 mt-4 pt-4">
            <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span>Secured by X402 Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
};
