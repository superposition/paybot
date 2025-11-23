/**
 * PaymentStatusCard Storybook Stories
 */

import type { Meta, StoryObj } from "@storybook/react";
import { PaymentStatusCard } from "./PaymentStatusCard";

const meta = {
  title: "Payment/PaymentStatusCard",
  component: PaymentStatusCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["pending", "confirmed", "expired", "refunded"],
    },
  },
} satisfies Meta<typeof PaymentStatusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Pending payment with countdown
export const Pending: Story = {
  args: {
    paymentId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    status: "pending",
    amount: "100",
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    onRefresh: () => console.log("Refresh clicked"),
  },
};

// Pending with short time remaining
export const PendingExpiringSoon: Story = {
  args: {
    paymentId: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    status: "pending",
    amount: "50",
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    expiresAt: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
    onRefresh: () => console.log("Refresh clicked"),
  },
};

// Confirmed payment
export const Confirmed: Story = {
  args: {
    paymentId: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    status: "confirmed",
    amount: "100",
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    txHash: "0xabc123def456789abc123def456789abc123def456789abc123def456789abc12",
    onRefresh: () => console.log("Refresh clicked"),
  },
};

// Expired payment
export const Expired: Story = {
  args: {
    paymentId: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
    status: "expired",
    amount: "75",
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    expiresAt: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    onRefresh: () => console.log("Refresh clicked"),
  },
};

// Refunded payment
export const Refunded: Story = {
  args: {
    paymentId: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    status: "refunded",
    amount: "200",
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    txHash: "0xdef789abc123456def789abc123456def789abc123456def789abc123456def7",
    onRefresh: () => console.log("Refresh clicked"),
  },
};

// Small amount
export const SmallAmount: Story = {
  args: {
    paymentId: "0xaaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666000077778888999",
    status: "confirmed",
    amount: "1",
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    txHash: "0x123abc456def789012abc456def789012abc456def789012abc456def789012a",
  },
};

// Large amount
export const LargeAmount: Story = {
  args: {
    paymentId: "0x9999888877776666555544443333222211110000ffffeeeedddcccbbbaaa999",
    status: "confirmed",
    amount: "10000",
    payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    recipient: "0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4",
    txHash: "0x789def012abc345678def012abc345678def012abc345678def012abc345678d",
  },
};

// Minimal data
export const Minimal: Story = {
  args: {
    paymentId: "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    status: "pending",
    amount: "100",
  },
};

// All payment states side by side
export const AllStates: Story = {
  args: {} as any,
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <PaymentStatusCard
        paymentId="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        status="pending"
        amount="100"
        payer="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        recipient="0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4"
        expiresAt={Math.floor(Date.now() / 1000) + 1800}
      />
      <PaymentStatusCard
        paymentId="0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"
        status="confirmed"
        amount="100"
        payer="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        recipient="0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4"
        txHash="0xabc123def456789abc123def456789abc123def456789abc123def456789abc12"
      />
      <PaymentStatusCard
        paymentId="0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
        status="expired"
        amount="100"
        payer="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        recipient="0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4"
      />
      <PaymentStatusCard
        paymentId="0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff"
        status="refunded"
        amount="100"
        payer="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        recipient="0x02b0b4efd909240fcb2eb5fae060dc60d112e3a4"
        txHash="0xdef789abc123456def789abc123456def789abc123456def789abc123456def7"
      />
    </div>
  ),
};
