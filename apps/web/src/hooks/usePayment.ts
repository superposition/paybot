import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { type Address, type Hash } from 'viem';
import { createX402PaymentHeader } from '@paybot/x402';
import { X402_CONTRACTS, X402_CONFIG, calculateTimeout, X402_ENDPOINTS } from '../config/x402';

export interface PaymentRequest {
  /**
   * Recipient address (service provider)
   */
  to: Address;
  /**
   * Payment amount in wei (QUSD)
   */
  amount: string;
  /**
   * Payment timeout in seconds
   */
  timeoutSeconds?: number;
  /**
   * JSON-RPC method to call
   */
  method: string;
  /**
   * Method parameters
   */
  params?: any;
  /**
   * Service endpoint URL
   */
  endpoint: string;
}

export interface PaymentStatus {
  status: 'idle' | 'approving' | 'locking' | 'sending' | 'success' | 'error';
  requestId?: string;
  txHash?: Hash;
  error?: Error;
  response?: any;
}

export interface UsePaymentReturn {
  /**
   * Current payment status
   */
  paymentStatus: PaymentStatus;
  /**
   * Is payment in progress
   */
  isProcessing: boolean;
  /**
   * Execute payment and call service
   */
  executePayment: (request: PaymentRequest) => Promise<any>;
  /**
   * Reset payment state
   */
  reset: () => void;
}

/**
 * Custom hook for X402 payment flow with wagmi
 */
export function usePayment(): UsePaymentReturn {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'idle',
  });

  const reset = useCallback(() => {
    setPaymentStatus({ status: 'idle' });
  }, []);

  const executePayment = useCallback(
    async (request: PaymentRequest) => {
      if (!address || !walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      try {
        console.log('💳 [PAYMENT] Starting payment flow...');
        console.log('   Recipient:', request.to);
        console.log('   Amount:', request.amount);
        console.log('   Endpoint:', request.endpoint);

        setPaymentStatus({ status: 'approving' });

        // Calculate timeout
        const timeoutSeconds = request.timeoutSeconds || X402_CONFIG.defaultTimeout;
        const amountUSD = Number(BigInt(request.amount) / BigInt(10 ** 18));

        console.log('📝 [PAYMENT] Creating payment header...');
        console.log('   Amount (USD):', amountUSD);
        console.log('   Duration (seconds):', timeoutSeconds);

        // Create X402 payment header (handles approval + escrow in one call)
        const { paymentId, paymentHeader } = await createX402PaymentHeader({
          tokenAddress: X402_CONTRACTS.qusdToken,
          tokenName: X402_CONFIG.tokenName,
          escrowAddress: X402_CONTRACTS.escrow,
          chainId: X402_CONFIG.chainId,
          recipient: request.to,
          amountUSD,
          durationSeconds: timeoutSeconds,
          walletClient,
          publicClient: publicClient as any,
        });

        console.log('✅ [PAYMENT] Payment header created');
        console.log('   Payment ID:', paymentId);

        setPaymentStatus({ status: 'sending' });

        // Send the payment header to the facilitator to settle on-chain
        const facilitatorUrl = X402_ENDPOINTS.facilitator || 'http://localhost:8403';
        console.log('📡 [PAYMENT] Sending to facilitator:', facilitatorUrl);

        const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payment: paymentHeader, // Base64-encoded payment payload
          }),
        });

        if (!settleResponse.ok) {
          const errorData = await settleResponse.json();
          console.error('❌ [PAYMENT] Settlement failed:', errorData);
          throw new Error(errorData.error || 'Settlement failed');
        }

        const result = await settleResponse.json();
        console.log('✅ [PAYMENT] Settlement successful!');
        console.log('   TX Hash:', result.txHash);
        console.log('   Block:', result.blockNumber);

        setPaymentStatus({
          status: 'success',
          requestId: paymentId,
          txHash: result.txHash,
          response: result,
        });

        // Return full payment metadata
        return {
          result,
          requestId: paymentId,
          amount: request.amount,
          timeout: timeoutSeconds,
          txHash: paymentId, // Use paymentId as txHash
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Payment failed');
        setPaymentStatus({
          status: 'error',
          error: err,
        });
        throw err;
      }
    },
    [address, walletClient, publicClient]
  );

  return {
    paymentStatus,
    isProcessing: ['approving', 'locking', 'sending'].includes(paymentStatus.status),
    executePayment,
    reset,
  };
}
