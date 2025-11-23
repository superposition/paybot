export interface FullScreenRobotViewProps {
  botName: string;
  iframeUrl: string;
  allow?: string;
  sandbox?: string;
  className?: string;
}

export function FullScreenRobotView({
  botName,
  iframeUrl,
  allow = "camera; microphone; fullscreen",
  sandbox,
  className = "",
}: FullScreenRobotViewProps) {
  return (
    <div className={`fixed inset-0 bg-black ${className}`}>
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-900 bg-opacity-90 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold">{botName}</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">Live</span>
          </div>
        </div>
      </div>

      <iframe
        src={iframeUrl}
        className="w-full h-full border-0"
        title={`${botName} Control Interface`}
        allow={allow}
        sandbox={sandbox}
      />
    </div>
  );
}
