import React, { useEffect, useState } from 'react';

export interface CountdownTimerProps {
  /**
   * Target end time (Unix timestamp in seconds)
   */
  endTime: number;
  /**
   * Show progress bar
   */
  showProgressBar?: boolean;
  /**
   * Total duration for progress calculation (seconds)
   */
  totalDuration?: number;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Warning threshold in seconds (changes color)
   */
  warningThreshold?: number;
  /**
   * Callback when countdown completes
   */
  onComplete?: () => void;
  /**
   * Callback when warning threshold reached
   */
  onWarning?: (remainingSeconds: number) => void;
  /**
   * Callback on each tick (every second)
   */
  onTick?: (remainingSeconds: number) => void;
  /**
   * Format: 'MM:SS' or 'HH:MM:SS' or 'text'
   */
  format?: 'MM:SS' | 'HH:MM:SS' | 'text';
  /**
   * Custom CSS classes
   */
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl font-bold',
};

/**
 * CountdownTimer component with visual feedback
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  endTime,
  showProgressBar = false,
  totalDuration,
  size = 'md',
  warningThreshold = 30,
  onComplete,
  onWarning,
  onTick,
  format = 'MM:SS',
  className = '',
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);

  // Calculate remaining time
  useEffect(() => {
    const updateRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, endTime - now);
      setRemainingSeconds(remaining);

      // Trigger callbacks
      if (remaining > 0) {
        onTick?.(remaining);

        // Warning threshold
        if (remaining <= warningThreshold && !hasWarned) {
          setHasWarned(true);
          onWarning?.(remaining);
        }
      } else if (remaining === 0) {
        onComplete?.();
      }
    };

    // Initial update
    updateRemaining();

    // Update every second
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [endTime, warningThreshold, hasWarned, onComplete, onWarning, onTick]);

  // Format time display
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return format === 'text' ? 'Expired' : '00:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (format === 'HH:MM:SS') {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (format === 'MM:SS') {
      const totalMinutes = Math.floor(seconds / 60);
      return `${totalMinutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    } else {
      // text format
      if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    }
  };

  // Calculate progress percentage
  const progressPercentage = totalDuration
    ? Math.max(0, Math.min(100, (remainingSeconds / totalDuration) * 100))
    : 0;

  // Determine color based on remaining time
  const getColorClass = () => {
    if (remainingSeconds === 0) {
      return 'text-gray-400';
    } else if (remainingSeconds <= warningThreshold) {
      return 'text-red-600';
    } else if (remainingSeconds <= warningThreshold * 2) {
      return 'text-yellow-600';
    } else {
      return 'text-green-600';
    }
  };

  const getProgressColorClass = () => {
    if (remainingSeconds === 0) {
      return 'bg-gray-400';
    } else if (remainingSeconds <= warningThreshold) {
      return 'bg-red-600';
    } else if (remainingSeconds <= warningThreshold * 2) {
      return 'bg-yellow-600';
    } else {
      return 'bg-green-600';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Time Display */}
      <div className={`font-mono ${sizeClasses[size]} ${getColorClass()}`}>
        {formatTime(remainingSeconds)}
      </div>

      {/* Progress Bar */}
      {showProgressBar && totalDuration && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${getProgressColorClass()}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Status Indicator */}
      {remainingSeconds > 0 && remainingSeconds <= warningThreshold && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-600 font-medium">
            Expiring soon!
          </span>
        </div>
      )}

      {remainingSeconds === 0 && (
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-xs text-gray-500 font-medium">Expired</span>
        </div>
      )}
    </div>
  );
};
