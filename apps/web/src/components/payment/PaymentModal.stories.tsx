/**
 * PaymentModal Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react";
import { PaymentModal } from "./PaymentModal";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../../config/wagmi";
import { useState } from "react";

const queryClient = new QueryClient();

// Wrapper with providers
function PaymentModalWithProviders(props: React.ComponentProps<typeof PaymentModal>) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PaymentModal {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

const meta = {
  title: "Payment/PaymentModal",
  component: PaymentModalWithProviders,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PaymentModalWithProviders>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive story
export const Default: Story = {
  args: {} as any,
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          Open Payment Modal
        </button>

        <PaymentModalWithProviders
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Robot Access Payment"
          description="Pay to access robot control for 1 hour"
          recipient="0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4"
          amountUSD={100}
          durationSeconds={3600}
          onPaymentCreated={(paymentId, header) => {
            console.log("Payment created:", paymentId, header);
          }}
          onError={(error) => {
            console.error("Payment error:", error);
          }}
        />
      </div>
    );
  },
};

// Always open for design review
export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close clicked"),
    title: "Robot Access Payment",
    description: "Pay to access robot control for 1 hour",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 100,
    durationSeconds: 3600,
  },
};

// Small amount
export const SmallAmount: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close clicked"),
    title: "API Access",
    description: "Pay for 100 API requests",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 1,
    durationSeconds: 300,
  },
};

// Large amount
export const LargeAmount: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log("Close clicked"),
    title: "Premium Access",
    description: "Full access for 30 days",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    amountUSD: 1000,
    durationSeconds: 2592000,
  },
};
