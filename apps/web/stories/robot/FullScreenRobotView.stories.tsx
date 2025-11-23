import type { Meta, StoryObj } from "@storybook/react";
import { FullScreenRobotView } from "../../src/components/robot/FullScreenRobotView";

const meta = {
  title: "Robot/FullScreenRobotView",
  component: FullScreenRobotView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FullScreenRobotView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    botName: "UGV Rover",
    iframeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
  },
};

export const WithCustomAllow: Story = {
  args: {
    botName: "Security Bot",
    iframeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    allow: "camera; microphone; fullscreen; accelerometer; gyroscope",
  },
};

export const PayBotDemo: Story = {
  args: {
    botName: "PayBot Demo",
    iframeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
  },
};

export const IndustrialRobot: Story = {
  args: {
    botName: "Industrial Robot Arm - Station 4",
    iframeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
  },
};

export const DroneView: Story = {
  args: {
    botName: "Aerial Drone - Unit 7",
    iframeUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
  },
};
