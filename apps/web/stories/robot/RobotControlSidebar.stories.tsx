import type { Meta, StoryObj } from "@storybook/react";
import { RobotControlSidebar } from "../../src/components/robot/RobotControlSidebar";

const meta = {
  title: "Robot/RobotControlSidebar",
  component: RobotControlSidebar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RobotControlSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Online: Story = {
  args: {
    botId: "bot-001",
    botName: "UGV Rover",
    controlEndpoint: "http://192.168.0.221:5000/robot/control",
    status: "online",
    batteryLevel: 85,
    temperature: 42,
  },
};

export const LowBattery: Story = {
  args: {
    botId: "bot-002",
    botName: "Security Patrol Bot",
    controlEndpoint: "http://192.168.0.100:8080/api/control",
    status: "online",
    batteryLevel: 15,
    temperature: 38,
  },
};

export const Busy: Story = {
  args: {
    botId: "bot-003",
    botName: "Delivery Robot",
    controlEndpoint: "http://10.0.1.50:3000/control",
    status: "busy",
    batteryLevel: 65,
    temperature: 45,
  },
};

export const Offline: Story = {
  args: {
    botId: "bot-004",
    botName: "Maintenance Bot",
    controlEndpoint: "http://192.168.1.200:9000/api/robot",
    status: "offline",
    batteryLevel: 0,
    temperature: 25,
  },
};

export const MinimalInfo: Story = {
  args: {
    botId: "bot-005",
    botName: "Simple Bot",
    controlEndpoint: "http://localhost:8080",
    status: "online",
  },
};

export const FullyCharged: Story = {
  args: {
    botId: "bot-006",
    botName: "Warehouse Bot",
    controlEndpoint: "http://warehouse.local:5000/control",
    status: "online",
    batteryLevel: 100,
    temperature: 35,
  },
};

export const HighTemperature: Story = {
  args: {
    botId: "bot-007",
    botName: "Industrial Arm",
    controlEndpoint: "http://factory.local:8888/arm/control",
    status: "busy",
    batteryLevel: 72,
    temperature: 68,
  },
};

export const WithCallbacks: Story = {
  args: {
    botId: "bot-008",
    botName: "PayBot Demo",
    controlEndpoint: "http://192.168.0.221:5000/robot/control",
    status: "online",
    batteryLevel: 92,
    temperature: 40,
    onEmergencyStop: () => {
      alert("Emergency stop activated!");
    },
    onRestart: () => {
      alert("Robot restarting...");
    },
  },
};
