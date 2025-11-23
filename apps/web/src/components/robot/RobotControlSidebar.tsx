import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

export interface RobotControlSidebarProps {
  botId: string;
  botName: string;
  controlEndpoint: string;
  status?: "online" | "offline" | "busy";
  batteryLevel?: number;
  temperature?: number;
  onEmergencyStop?: () => void;
  onRestart?: () => void;
  className?: string;
}

export function RobotControlSidebar({
  botId,
  botName,
  controlEndpoint,
  status = "online",
  batteryLevel,
  temperature,
  onEmergencyStop,
  onRestart,
  className = "",
}: RobotControlSidebarProps) {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-500",
    busy: "bg-yellow-500",
  };

  const statusText = {
    online: "Online",
    offline: "Offline",
    busy: "Busy",
  };

  return (
    <div className={`w-80 space-y-4 ${className}`}>
      {/* Robot Info */}
      <Card>
        <CardHeader>
          <CardTitle>{botName}</CardTitle>
          <CardDescription>ID: {botId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColors[status]}`}></div>
              <span className="text-sm font-semibold">{statusText[status]}</span>
            </div>
          </div>

          {batteryLevel !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Battery</span>
                <span className="font-semibold">{batteryLevel}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    batteryLevel > 50
                      ? "bg-green-500"
                      : batteryLevel > 20
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${batteryLevel}%` }}
                />
              </div>
            </div>
          )}

          {temperature !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Temperature</span>
              <span className="text-sm font-semibold">{temperature}°C</span>
            </div>
          )}

          <div className="text-xs text-gray-500 font-mono break-all">
            {controlEndpoint}
          </div>
        </CardContent>
      </Card>

      {/* Movement Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <div></div>
            <Button size="sm" variant="outline">
              ▲
            </Button>
            <div></div>

            <Button size="sm" variant="outline">
              ◄
            </Button>
            <Button size="sm" variant="outline">
              ■
            </Button>
            <Button size="sm" variant="outline">
              ►
            </Button>

            <div></div>
            <Button size="sm" variant="outline">
              ▼
            </Button>
            <div></div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onEmergencyStop}
          >
            Emergency Stop
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onRestart}
          >
            Restart Robot
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
