import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "../../src/components/basic/Header";
import { Button } from "../../src/components/ui/button";

const meta = {
  title: "Basic/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Application Title",
  },
};

export const WithSubtitle: Story = {
  args: {
    title: "Dashboard",
    subtitle: "Welcome back! Here's an overview of your account.",
  },
};

export const WithActions: Story = {
  args: {
    title: "Projects",
    subtitle: "Manage your active projects",
    actions: (
      <>
        <Button variant="outline">Settings</Button>
        <Button>New Project</Button>
      </>
    ),
  },
};

export const PayBot: Story = {
  args: {
    title: "PayBot",
    subtitle: "Robot Control with X402 Micropayments",
    actions: (
      <div className="text-right">
        <div className="text-sm text-gray-500">Network</div>
        <div className="text-sm font-semibold text-gray-900">Chain 31337</div>
      </div>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    title: "Robot Control",
    subtitle: "Full access granted",
    actions: (
      <>
        <Button variant="ghost" size="sm">
          Disconnect
        </Button>
        <Button variant="outline" size="sm">
          Settings
        </Button>
        <Button size="sm">Emergency Stop</Button>
      </>
    ),
  },
};

export const Simple: Story = {
  args: {
    title: "Simple Header",
  },
};

export const Long: Story = {
  args: {
    title: "A Very Long Header Title That Demonstrates Text Wrapping",
    subtitle:
      "This is a longer subtitle that provides additional context and demonstrates how the header handles multiple lines of text.",
  },
};
