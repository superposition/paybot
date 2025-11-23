import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";

export interface CountdownTimerProps {
  endTime: number; // Unix timestamp in seconds
  onExpire?: () => void;
  className?: string;
  showProgress?: boolean;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function CountdownTimer({
  endTime,
  onExpire,
  className = "",
  showProgress = true,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, endTime - now);
    setTimeRemaining(remaining);

    // Set total duration on first render
    if (totalDuration === 0) {
      setTotalDuration(remaining);
    }
  }, [endTime, totalDuration]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      if (onExpire) {
        onExpire();
      }
      return;
    }

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, timeRemaining, onExpire]);

  const isWarning = timeRemaining > 0 && timeRemaining < 60;
  const isExpired = timeRemaining === 0;
  const progress = totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0;

  return (
    <Card
      className={`${className} ${
        isExpired
          ? "border-red-500 bg-red-50"
          : isWarning
          ? "border-yellow-500 bg-yellow-50 animate-pulse"
          : "border-blue-500"
      }`}
    >
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600 mb-2">
            {isExpired ? "Expired" : "Time Remaining"}
          </div>
          <div
            className={`text-4xl font-bold font-mono ${
              isExpired
                ? "text-red-600"
                : isWarning
                ? "text-yellow-600"
                : "text-blue-600"
            }`}
          >
            {isExpired ? "0:00" : formatTime(timeRemaining)}
          </div>
          {showProgress && !isExpired && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    isWarning ? "bg-yellow-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
