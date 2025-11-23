/**
 * PaymentModal Component
 *
 * Modal for initiating X402 payments with wallet integration
 */

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { createX402PaymentHeader } from "@paybot/x402";
import { createPublicClient, http } from "viem";
import { X402_CONTRACTS, X402_CONFIG, X402_ENDPOINTS } from "../../config/x402";
import { chain } from "../../config/wagmi";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  recipient: `0x${string}`;
  amountUSD: number;
  durationSeconds?: number;
  onPaymentCreated?: (paymentId: `0x${string}`, paymentHeader: string) => void;
  onError?: (error: Error) => void;
}

type PaymentStep = "connect" | "creating" | "created" | "error";

export function PaymentModal({
  isOpen,
  onClose,
  title,
  description,
  recipient,
  amountUSD,
  durationSeconds = X402_CONFIG.defaultTimeout,
  onPaymentCreated,
  onError,
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>("connect");
  const [error, setError] = useState<string>("");
  const [paymentId, setPaymentId] = useState<`0x${string}` | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(isConnected ? "connect" : "connect");
      setError("");
      setPaymentId(null);
    }
  }, [isOpen, isConnected]);

  const handleCreatePayment = async () => {
    if (!walletClient || !address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setStep("creating");
      setError("");

      // Create public client
      const publicClient = createPublicClient({
        chain,
        transport: http(X402_ENDPOINTS.provider),
      }) as any;

      // Create payment header
      const result = await createX402PaymentHeader({
        tokenAddress: X402_CONTRACTS.qusdToken,
        tokenName: X402_CONFIG.tokenName,
        escrowAddress: X402_CONTRACTS.escrow,
        chainId: X402_CONFIG.chainId,
        recipient,
        amountUSD,
        durationSeconds,
        walletClient,
        publicClient,
      });

      setPaymentId(result.paymentId);
      setStep("created");

      if (onPaymentCreated) {
        onPaymentCreated(result.paymentId, result.paymentHeader);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create payment";
      setError(errorMessage);
      setStep("error");

      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Amount</span>
            <span className="font-semibold">{amountUSD} QUSD</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Recipient</span>
            <span className="font-mono text-sm">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration</span>
            <span className="font-semibold">{Math.floor(durationSeconds / 60)} minutes</span>
          </div>
        </div>

        {/* Step: Connect Wallet */}
        {step === "connect" && !isConnected && (
          <div>
            <p className="text-gray-600 mb-4">Connect your wallet to create payment</p>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Connect with {connector.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Create Payment */}
        {step === "connect" && isConnected && (
          <div>
            <p className="text-gray-600 mb-4">
              Connected: <span className="font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </p>
            <div className="space-y-2">
              <button
                onClick={handleCreatePayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Create Payment
              </button>
              <button
                onClick={() => disconnect()}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Step: Creating */}
        {step === "creating" && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Creating payment...</p>
            <p className="text-sm text-gray-500 mt-2">Please sign the transaction in your wallet</p>
          </div>
        )}

        {/* Step: Created */}
        {step === "created" && paymentId && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Created!</h3>
            <p className="text-sm text-gray-600 mb-4">Payment ID:</p>
            <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">{paymentId}</p>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Failed</h3>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => setStep("connect")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
