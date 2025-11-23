import React, { useState, useEffect } from 'react';
import { type Address } from 'viem';
import { PaymentModal } from '../payment/PaymentModal';
import { PaymentStatusCard } from '../payment/PaymentStatusCard';
import { CountdownTimer } from '../ui/CountdownTimer';
import { X402_CONFIG, X402_ENDPOINTS } from '../../config/x402';

export interface BotAccessGateProps {
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
   * Method parameters (will be passed to payment)
   */
  params?: any;
  /**
   * Payment timeout in seconds
   */
  timeoutSeconds?: number;
  /**
   * Content to show when access is granted
   * Can be ReactNode or render function receiving payment record
   */
  children: React.ReactNode | ((record: PaymentRecord) => React.ReactNode);
  /**
   * Custom payment amount (overrides serviceType price)
   */
  customAmount?: string;
  /**
   * Gate title
   */
  title?: string;
  /**
   * Gate description
   */
  description?: string;
  /**
   * Show payment status after successful payment
   */
  showPaymentStatus?: boolean;
  /**
   * Callback when payment is successful
   */
  onPaymentSuccess?: (response: any) => void;
  /**
   * Callback when payment fails
   */
  onPaymentError?: (error: Error) => void;
  /**
   * Optional CSS classes
   */
  className?: string;
  /**
   * Bot/robot identifier for JWT generation
   */
  botId?: string;
  /**
   * Bot/robot display name for JWT generation
   */
  botName?: string;
}

type AccessState = 'locked' | 'payment-pending' | 'granted';

interface PaymentRecord {
  amount: string;
  timestamp: number;
  timeoutTimestamp: number;
  totalDuration: number;
  requestId: string;
  response: any;
  jwt?: string; // JWT token for protected service access
  paymentTxHash?: string; // Transaction hash for JWT validation
}

/**
 * BotAccessGate - Gate content behind X402 payment
 *
 * Features:
 * - Restrict access to children until payment is made
 * - Integrated payment modal
 * - Payment status tracking
 * - Automatic timeout handling
 * - Visual lock/unlock states
 */
export const BotAccessGate: React.FC<BotAccessGateProps> = ({
  recipient,
  serviceType,
  endpoint,
  method,
  params,
  timeoutSeconds = X402_CONFIG.defaultTimeout,
  children,
  customAmount,
  title = 'Premium Content',
  description = 'This content requires payment to access.',
  showPaymentStatus = true,
  onPaymentSuccess,
  onPaymentError,
  className = '',
  botId,
  botName,
}) => {
  const [accessState, setAccessState] = useState<AccessState>('locked');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);

  // Check if payment has expired
  useEffect(() => {
    if (accessState === 'granted' && paymentRecord) {
      const checkExpiry = setInterval(() => {
        if (Date.now() / 1000 > paymentRecord.timeoutTimestamp) {
          setAccessState('locked');
          setPaymentRecord(null);
        }
      }, 1000);

      return () => clearInterval(checkExpiry);
    }
  }, [accessState, paymentRecord]);

  const handlePaymentClick = () => {
    console.log('[BotAccessGate] Unlock button clicked!');
    setAccessState('payment-pending');
    setIsPaymentModalOpen(true);
    console.log('[BotAccessGate] Modal state set to:', true);
  };

  const handlePaymentSuccess = async (response: any) => {
    console.log('[BotAccessGate] Payment success callback triggered', response);

    // Immediately set state to granted to prevent race condition with modal close
    setAccessState('granted');

    const now = Math.floor(Date.now() / 1000);
    const paymentAmount = response?.amount || customAmount || '';
    const paymentTimeout = response?.timeout || timeoutSeconds;

    let jwt: string | undefined;
    let paymentTxHash: string | undefined;

    // JWT generation disabled - not needed for iframe-only access
    // The payment verification happens via X402 protocol on the resource server
    console.log('[BotAccessGate] Payment successful, granting access');

    const record: PaymentRecord = {
      amount: paymentAmount,
      timestamp: now,
      timeoutTimestamp: now + paymentTimeout,
      totalDuration: paymentTimeout,
      requestId: response?.requestId || 'unknown',
      response,
      ...(jwt && { jwt }),
      ...(paymentTxHash && { paymentTxHash }),
    };

    console.log('[BotAccessGate] Setting payment record:', record);
    setPaymentRecord(record);
    setIsPaymentModalOpen(false);

    if (onPaymentSuccess) {
      onPaymentSuccess(response);
    }
  };

  const handlePaymentError = (error: Error) => {
    setAccessState('locked');
    setIsPaymentModalOpen(false);

    if (onPaymentError) {
      onPaymentError(error);
    }
  };

  const handlePaymentClose = () => {
    setIsPaymentModalOpen(false);
    // Only reset to locked if payment was cancelled (not if granted)
    if (accessState === 'payment-pending') {
      setAccessState('locked');
    }
  };

  const handleTimeout = () => {
    setAccessState('locked');
    setPaymentRecord(null);
  };

  console.log('[BotAccessGate] Rendering with accessState:', accessState, 'paymentRecord:', paymentRecord);

  return (
    <div className={`h-full ${className}`}>
      {/* Locked State */}
      {accessState === 'locked' && (
        <div className="relative overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-lg">
          {/* Blurred Content Preview */}
          <div className="blur-sm pointer-events-none select-none opacity-30">
            {typeof children === 'function' ? (
              <div className="h-screen w-screen bg-gray-900"></div>
            ) : (
              children
            )}
          </div>

          {/* Lock Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/95">
            <div className="text-center p-8 max-w-md">
              {/* Lock Icon */}
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full">
                <svg
                  className="w-10 h-10 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-6">
                {description}
              </p>

              {/* Unlock Button */}
              <button
                onClick={handlePaymentClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
                <span>Unlock with Payment</span>
              </button>

              {/* Service Info */}
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="capitalize">{serviceType}</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  <span>X402 Protocol</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Granted State */}
      {accessState === 'granted' && (
        <div className="h-full flex flex-col">
          {/* Access Status Bar */}
          {paymentRecord && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-3">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-green-800 font-semibold">Access Granted</span>
                  </div>
                  <div className="h-4 w-px bg-green-300"></div>
                  <CountdownTimer
                    endTime={paymentRecord.timeoutTimestamp}
                    format="HH:MM:SS"
                    onComplete={handleTimeout}
                    className="text-green-700 font-mono font-medium"
                  />
                </div>
                <div className="text-sm text-green-700">
                  Payment ID: {paymentRecord.requestId.slice(0, 8)}...
                </div>
              </div>
            </div>
          )}

          {/* Unlocked Content */}
          <div className="flex-1 relative">
            <>
              {typeof children === 'function' && paymentRecord
                ? children(paymentRecord)
                : children}
            </>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        recipient={recipient}
        serviceType={serviceType}
        endpoint={endpoint}
        method={method}
        params={params}
        {...(customAmount && { customAmount })}
        timeoutSeconds={timeoutSeconds}
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
};
