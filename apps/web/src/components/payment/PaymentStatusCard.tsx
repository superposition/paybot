import React from 'react';
import { type Address, type Hash } from 'viem';
import { CountdownTimer } from '../ui/CountdownTimer';
import { formatQusd } from '../../config/x402';

export interface PaymentStatusCardProps {
  /**
   * Payment status
   */
  status: 'pending' | 'locked' | 'completed' | 'released' | 'refunded' | 'expired' | 'failed';
  /**
   * Service provider address
   */
  recipient: Address;
  /**
   * Payment amount in wei
   */
  amount: string;
  /**
   * Service type
   */
  serviceType?: string;
  /**
   * Transaction hash (if available)
   */
  txHash?: Hash;
  /**
   * Payment timeout unix timestamp
   */
  timeoutTimestamp?: number;
  /**
   * Total timeout duration (for progress bar)
   */
  totalDuration?: number;
  /**
   * Request ID
   */
  requestId?: string;
  /**
   * Error message (for failed payments)
   */
  error?: string;
  /**
   * Show countdown timer
   */
  showTimer?: boolean;
  /**
   * Card variant
   */
  variant?: 'compact' | 'detailed';
  /**
   * Header style variant
   */
  headerVariant?: 'minimal' | 'standard' | 'detailed';
  /**
   * Layout variant (v1, v2, v3)
   */
  layoutVariant?: 'v1' | 'v2' | 'v3';
  /**
   * Callback when countdown completes
   */
  onTimeout?: () => void;
  /**
   * Optional CSS classes
   */
  className?: string;
}

const statusConfig = {
  pending: {
    color: 'bg-gray-900 border-gray-400',
    textColor: 'text-gray-100',
    accentColor: 'text-gray-400',
    icon: '○',
    label: 'PENDING',
  },
  locked: {
    color: 'bg-blue-950 border-blue-400',
    textColor: 'text-blue-100',
    accentColor: 'text-blue-400',
    icon: '🔒',
    label: 'LOCKED',
  },
  completed: {
    color: 'bg-green-950 border-green-400',
    textColor: 'text-green-100',
    accentColor: 'text-green-400',
    icon: '✓',
    label: 'COMPLETED',
  },
  released: {
    color: 'bg-green-950 border-green-400',
    textColor: 'text-green-100',
    accentColor: 'text-green-400',
    icon: '✓',
    label: 'RELEASED',
  },
  refunded: {
    color: 'bg-amber-950 border-amber-400',
    textColor: 'text-amber-100',
    accentColor: 'text-amber-400',
    icon: '↶',
    label: 'REFUNDED',
  },
  expired: {
    color: 'bg-orange-950 border-orange-400',
    textColor: 'text-orange-100',
    accentColor: 'text-orange-400',
    icon: '⏱',
    label: 'EXPIRED',
  },
  failed: {
    color: 'bg-red-950 border-red-400',
    textColor: 'text-red-100',
    accentColor: 'text-red-400',
    icon: '✕',
    label: 'FAILED',
  },
};

/**
 * PaymentStatusCard - Display payment status with countdown timer
 *
 * Features:
 * - Visual status indicators
 * - Real-time countdown timer
 * - Transaction details
 * - Progress tracking
 * - Compact & detailed variants
 */
export const PaymentStatusCard: React.FC<PaymentStatusCardProps> = ({
  status,
  recipient,
  amount,
  serviceType,
  txHash,
  timeoutTimestamp,
  totalDuration,
  requestId,
  error,
  showTimer = true,
  variant = 'detailed',
  headerVariant = 'standard',
  layoutVariant = 'v1',
  onTimeout,
  className = '',
}) => {
  const config = statusConfig[status];
  const isActive = status === 'locked' || status === 'pending';

  // v1 - Compact Terminal Layout
  if (layoutVariant === 'v1') {
    return (
      <div
        className={`border-2 ${config.color} p-3 ${className}`}
        style={{ fontFamily: 'Consolas, monospace' }}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-lg ${config.accentColor}`}>{config.icon}</span>
            <span className={`text-xs font-bold ${config.textColor}`}>{config.label}</span>
          </div>
          {requestId && (
            <span className={`text-xs ${config.accentColor} opacity-50`}>
              {requestId.slice(0, 8)}
            </span>
          )}
        </div>

        {/* Main Info */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className={`text-xs ${config.accentColor} opacity-50`}>AMOUNT</span>
            <span className={`text-sm font-bold ${config.textColor}`}>{formatQusd(amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-xs ${config.accentColor} opacity-50`}>TO</span>
            <span className={`text-xs ${config.textColor}`}>
              {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </span>
          </div>
          {txHash && (
            <div className="flex justify-between items-center">
              <span className={`text-xs ${config.accentColor} opacity-50`}>TX</span>
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs ${config.accentColor} hover:underline`}
              >
                {txHash.slice(0, 6)}...{txHash.slice(-4)}
              </a>
            </div>
          )}
        </div>

        {/* Timer */}
        {showTimer && timeoutTimestamp && isActive && totalDuration && (
          <div className="mt-2 pt-2 border-t border-current opacity-30">
            <CountdownTimer
              endTime={timeoutTimestamp}
              totalDuration={totalDuration}
              showProgressBar={true}
              size="sm"
              format="MM:SS"
              {...(onTimeout && { onComplete: onTimeout })}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`mt-2 pt-2 border-t ${config.accentColor} border-opacity-30`}>
            <div className={`text-xs ${config.accentColor}`}>{error}</div>
          </div>
        )}
      </div>
    );
  }

  // v2 - Grid Layout
  if (layoutVariant === 'v2') {
    return (
      <div
        className={`border-2 ${config.color} ${className}`}
        style={{ fontFamily: 'Consolas, monospace' }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b-2 border-current opacity-30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xl ${config.accentColor}`}>{config.icon}</span>
            <span className={`text-sm font-bold ${config.textColor}`}>{config.label}</span>
          </div>
          {serviceType && (
            <span className={`text-xs ${config.accentColor} uppercase`}>{serviceType}</span>
          )}
        </div>

        {/* Grid Content */}
        <div className="p-3 grid grid-cols-2 gap-3">
          <div>
            <div className={`text-xs ${config.accentColor} opacity-50 mb-1`}>AMOUNT</div>
            <div className={`text-sm font-bold ${config.textColor}`}>{formatQusd(amount)}</div>
          </div>
          <div>
            <div className={`text-xs ${config.accentColor} opacity-50 mb-1`}>RECIPIENT</div>
            <div className={`text-xs ${config.textColor}`}>
              {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </div>
          </div>
          {txHash && (
            <div className="col-span-2">
              <div className={`text-xs ${config.accentColor} opacity-50 mb-1`}>TRANSACTION</div>
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs ${config.accentColor} hover:underline`}
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </div>
          )}
          {requestId && (
            <div className="col-span-2">
              <div className={`text-xs ${config.accentColor} opacity-50 mb-1`}>REQUEST ID</div>
              <div className={`text-xs ${config.textColor}`}>{requestId}</div>
            </div>
          )}
        </div>

        {/* Timer */}
        {showTimer && timeoutTimestamp && isActive && totalDuration && (
          <div className="px-3 py-2 border-t-2 border-current opacity-30">
            <div className={`text-xs ${config.accentColor} opacity-50 mb-1`}>TIME REMAINING</div>
            <CountdownTimer
              endTime={timeoutTimestamp}
              totalDuration={totalDuration}
              showProgressBar={true}
              size="md"
              format="MM:SS"
              {...(onTimeout && { onComplete: onTimeout })}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 border-t-2 border-current opacity-30">
            <div className={`text-xs ${config.accentColor} opacity-50 mb-1`}>ERROR</div>
            <div className={`text-xs ${config.textColor}`}>{error}</div>
          </div>
        )}
      </div>
    );
  }

  // v3 - Horizontal Bar Layout
  if (layoutVariant === 'v3') {
    return (
      <div
        className={`border-2 ${config.color} ${className}`}
        style={{ fontFamily: 'Consolas, monospace' }}
      >
        {/* Single Row Layout */}
        <div className="p-3 flex items-center justify-between gap-4">
          {/* Status */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-lg ${config.accentColor}`}>{config.icon}</span>
            <div className="min-w-0">
              <div className={`text-xs font-bold ${config.textColor}`}>{config.label}</div>
              {serviceType && (
                <div className={`text-xs ${config.accentColor} opacity-50`}>{serviceType}</div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="flex-shrink-0">
            <div className={`text-xs ${config.accentColor} opacity-50`}>AMOUNT</div>
            <div className={`text-sm font-bold ${config.textColor}`}>{formatQusd(amount)}</div>
          </div>

          {/* Recipient */}
          <div className="flex-shrink-0">
            <div className={`text-xs ${config.accentColor} opacity-50`}>TO</div>
            <div className={`text-xs ${config.textColor}`}>
              {recipient.slice(0, 6)}...{recipient.slice(-4)}
            </div>
          </div>

          {/* Timer or Status */}
          {showTimer && timeoutTimestamp && isActive && totalDuration ? (
            <div className="flex-shrink-0">
              <CountdownTimer
                endTime={timeoutTimestamp}
                totalDuration={totalDuration}
                showProgressBar={false}
                size="sm"
                format="MM:SS"
                {...(onTimeout && { onComplete: onTimeout })}
              />
            </div>
          ) : (
            requestId && (
              <div className="flex-shrink-0">
                <div className={`text-xs ${config.accentColor} opacity-50`}>REQ</div>
                <div className={`text-xs ${config.textColor}`}>{requestId.slice(0, 8)}</div>
              </div>
            )
          )}
        </div>

        {/* Progress Bar */}
        {showTimer && timeoutTimestamp && isActive && totalDuration && (
          <div className="px-3 pb-2">
            <CountdownTimer
              endTime={timeoutTimestamp}
              totalDuration={totalDuration}
              showProgressBar={true}
              size="sm"
              format="MM:SS"
              {...(onTimeout && { onComplete: onTimeout })}
            />
          </div>
        )}

        {/* Expanded Info */}
        {(txHash || error) && (
          <div className="px-3 py-2 border-t-2 border-current opacity-30 space-y-1">
            {txHash && (
              <div className="flex justify-between items-center">
                <span className={`text-xs ${config.accentColor} opacity-50`}>TX</span>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs ${config.accentColor} hover:underline`}
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </a>
              </div>
            )}
            {error && (
              <div className={`text-xs ${config.accentColor}`}>{error}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback to old variant for backwards compatibility
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center justify-between p-4 rounded-lg border-2 ${config.color} ${className}`}
        style={{ fontFamily: 'Consolas, monospace' }}
      >
        <div className="flex items-center gap-3">
          <div className={`text-2xl ${config.textColor}`}>{config.icon}</div>
          <div>
            <div className={`font-semibold ${config.textColor}`}>{config.label}</div>
            <div className={`text-sm ${config.accentColor}`}>{formatQusd(amount)}</div>
          </div>
        </div>
        {showTimer && timeoutTimestamp && isActive && (
          <div className="text-right">
            <CountdownTimer
              endTime={timeoutTimestamp}
              {...(totalDuration && { totalDuration })}
              size="sm"
              format="MM:SS"
              showProgressBar={false}
              {...(onTimeout && { onComplete: onTimeout })}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border-2 ${config.color} overflow-hidden ${className}`}>
      {headerVariant === 'minimal' && (
        <div className={`p-3 bg-black border-b ${config.accentColor} border-opacity-30`}>
          <div className="flex items-center gap-2">
            <div className={`text-xl ${config.textColor}`}>{config.icon}</div>
            <h3 className={`text-base font-semibold ${config.textColor}`}>{config.label}</h3>
          </div>
        </div>
      )}

      {headerVariant === 'standard' && (
        <div className="p-4 bg-black border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-2xl ${config.textColor}`}>{config.icon}</div>
              <h3 className={`text-lg font-bold ${config.textColor}`}>{config.label}</h3>
            </div>
            {requestId && (
              <div className={`font-mono text-xs ${config.accentColor} opacity-50`}>
                {requestId.slice(0, 8)}...
              </div>
            )}
          </div>
        </div>
      )}

      {headerVariant === 'detailed' && (
        <div className="p-4 bg-black border-b border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-3xl ${config.textColor}`}>{config.icon}</div>
              <div>
                <h3 className={`text-lg font-bold ${config.textColor}`}>{config.label}</h3>
                {serviceType && (
                  <p className={`text-sm ${config.accentColor}`}>Service: {serviceType}</p>
                )}
              </div>
            </div>
            {requestId && (
              <div className="text-right">
                <div className={`text-xs ${config.accentColor} opacity-50`}>Request ID</div>
                <div className={`font-mono text-sm ${config.textColor}`}>
                  {requestId.slice(0, 8)}...{requestId.slice(-6)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-3 bg-black">
        <div className="flex justify-between items-center">
          <span className={`${config.accentColor} font-medium`}>Amount:</span>
          <span className={`text-xl font-bold ${config.textColor}`}>{formatQusd(amount)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className={`${config.accentColor} font-medium`}>Recipient:</span>
          <span className={`font-mono text-sm ${config.textColor}`}>
            {recipient.slice(0, 6)}...{recipient.slice(-4)}
          </span>
        </div>

        {txHash && (
          <div className="flex justify-between items-center">
            <span className={`${config.accentColor} font-medium`}>Tx Hash:</span>
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-mono text-sm ${config.accentColor} hover:underline`}
            >
              {txHash.slice(0, 6)}...{txHash.slice(-4)}
            </a>
          </div>
        )}

        {error && (
          <div className={`p-3 bg-red-950 border ${config.accentColor} border-opacity-30 rounded`}>
            <div className={`text-sm font-medium ${config.textColor}`}>Error</div>
            <div className={`text-sm ${config.accentColor} mt-1`}>{error}</div>
          </div>
        )}
      </div>

      {showTimer && timeoutTimestamp && isActive && totalDuration && (
        <div className="p-4 bg-black border-t border-gray-600">
          <div className={`text-sm ${config.accentColor} mb-2 font-medium`}>Time Remaining:</div>
          <CountdownTimer
            endTime={timeoutTimestamp}
            totalDuration={totalDuration}
            showProgressBar={true}
            size="lg"
            format="MM:SS"
            warningThreshold={60}
            {...(onTimeout && { onComplete: onTimeout })}
          />
        </div>
      )}

      {!isActive && (
        <div className={`p-3 text-center text-sm font-medium ${config.textColor} ${config.color}`}>
          {status === 'completed' && 'Payment successfully processed'}
          {status === 'released' && 'Funds have been released to recipient'}
          {status === 'refunded' && 'Payment has been refunded'}
          {status === 'expired' && 'Payment timeout has expired'}
          {status === 'failed' && 'Payment transaction failed'}
        </div>
      )}
    </div>
  );
};
