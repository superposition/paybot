/**
 * BotAccessGate Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react";
import { BotAccessGate } from "./BotAccessGate";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../../config/wagmi";

const queryClient = new QueryClient();

// Wrapper with providers
function BotAccessGateWithProviders(props: React.ComponentProps<typeof BotAccessGate>) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BotAccessGate {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

const meta = {
  title: "Gate/BotAccessGate",
  component: BotAccessGateWithProviders,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BotAccessGateWithProviders>;

export default meta;
type Story = StoryObj<typeof meta>;

// Robot Control Access
export const RobotControl: Story = {
  args: {
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 100,
    timeoutSeconds: 3600,
    serviceType: "robot-control",
    botId: "bot-001",
    botName: "PayBot Demo",
    endpoint: "http://localhost:8404/robot/control",
    method: "POST",
    title: "Robot Access Required",
    description: "Pay 100 QUSD to control the robot for 1 hour",
    showPaymentStatus: true,
    children: (paymentRecord) => (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Access Granted!</h3>
        <p className="text-gray-600 mb-4">You now have full control of the robot</p>
        {paymentRecord && (
          <div className="text-sm text-gray-500 font-mono">
            Payment ID: {paymentRecord.paymentId.slice(0, 10)}...
          </div>
        )}
        <div className="mt-6 space-y-2">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg">
            Move Forward
          </button>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg">
            Move Backward
          </button>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg">
            Turn Left
          </button>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg">
            Turn Right
          </button>
        </div>
      </div>
    ),
    onPaymentCreated: (record) => {
      console.log("Payment created:", record);
    },
    onAccessGranted: (record) => {
      console.log("Access granted:", record);
    },
    onAccessDenied: () => {
      console.log("Access denied");
    },
  },
};

// API Access
export const APIAccess: Story = {
  args: {
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 10,
    timeoutSeconds: 600,
    serviceType: "api-access",
    endpoint: "http://localhost:8404/protected/data",
    method: "GET",
    title: "Premium API Access",
    description: "Pay 10 QUSD for 100 API requests (10 minutes)",
    showPaymentStatus: true,
    children: (paymentRecord) => (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">API Dashboard</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Requests Remaining</div>
            <div className="text-2xl font-bold text-blue-600">100</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Rate Limit</div>
            <div className="text-2xl font-bold text-green-600">10/min</div>
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded font-mono text-sm">
          <div className="text-gray-600">API Key:</div>
          <div className="text-gray-900">{paymentRecord?.paymentId.slice(0, 32)}...</div>
        </div>
      </div>
    ),
  },
};

// Content Access
export const ContentAccess: Story = {
  args: {
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 5,
    timeoutSeconds: 86400,
    serviceType: "content-access",
    title: "Premium Content",
    description: "Pay 5 QUSD to unlock premium articles for 24 hours",
    showPaymentStatus: false,
    children: (paymentRecord) => (
      <div className="max-w-2xl">
        <article className="prose prose-lg">
          <h1>Premium Article: The Future of Blockchain Payments</h1>
          <p className="lead">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
            ut aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur.
          </p>
          <h2>Key Points</h2>
          <ul>
            <li>Gasless transactions enable better UX</li>
            <li>HTTP 402 standardizes payment protocols</li>
            <li>X402 enables microtransactions at scale</li>
          </ul>
        </article>
      </div>
    ),
  },
};

// Large Amount
export const PremiumAccess: Story = {
  args: {
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 1000,
    timeoutSeconds: 2592000, // 30 days
    serviceType: "premium-access",
    botId: "premium-001",
    botName: "Premium Service",
    title: "Premium Membership",
    description: "Pay 1000 QUSD for 30 days of unlimited access",
    showPaymentStatus: true,
    children: (paymentRecord) => (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">👑</div>
        <h3 className="text-3xl font-bold text-gray-900 mb-2">Premium Member</h3>
        <p className="text-gray-600 mb-6">Welcome to your exclusive dashboard</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-sm text-gray-600">Credits</div>
            <div className="text-2xl font-bold">∞</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-sm text-gray-600">Tier</div>
            <div className="text-2xl font-bold">VIP</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-sm text-gray-600">Support</div>
            <div className="text-2xl font-bold">24/7</div>
          </div>
        </div>
      </div>
    ),
  },
};

// Small Amount
export const MicroPayment: Story = {
  args: {
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 0.1,
    timeoutSeconds: 60,
    serviceType: "micro-payment",
    title: "Single Request",
    description: "Pay 0.1 QUSD for a single API call (1 minute)",
    showPaymentStatus: false,
    children: () => (
      <div className="bg-gray-50 border border-gray-200 rounded p-4 font-mono text-sm">
        <div className="text-gray-600 mb-2">Response:</div>
        <pre className="text-gray-900">{JSON.stringify({ status: "success", data: [1, 2, 3, 4, 5] }, null, 2)}</pre>
      </div>
    ),
  },
};
