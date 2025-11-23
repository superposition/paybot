import type { Meta, StoryObj } from "@storybook/react";
import { Webcam } from "../../src/components/specialized/Webcam";

const meta = {
  title: "Specialized/Webcam",
  component: Webcam,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Webcam>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    title: "Live Camera Feed",
  },
};

export const NoTitle: Story = {
  args: {
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
  },
};

export const WithControls: Story = {
  args: {
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    title: "Robot Camera with Controls",
    showControls: true,
  },
};

export const AspectRatio4x3: Story = {
  args: {
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    title: "4:3 Aspect Ratio",
    aspectRatio: "4:3",
  },
};

export const AspectRatioSquare: Story = {
  args: {
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    title: "Square Aspect Ratio",
    aspectRatio: "1:1",
  },
};

export const RobotFeed: Story = {
  args: {
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    title: "UGV Rover - Live Feed",
    showControls: true,
    aspectRatio: "16:9",
  },
};

export const CustomSize: Story = {
  args: {
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    title: "Custom Size",
    className: "w-[600px]",
  },
};

export const ErrorState: Story = {
  args: {
    streamUrl: "https://invalid-url-that-will-fail",
    title: "Error State Demo",
  },
};
