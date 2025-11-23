import type { Meta, StoryObj } from "@storybook/react";
import { CountdownTimer } from "../../src/components/specialized/CountdownTimer";

const meta = {
  title: "Specialized/CountdownTimer",
  component: CountdownTimer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CountdownTimer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Current time + 10 minutes
const tenMinutesFromNow = Math.floor(Date.now() / 1000) + 600;

// Current time + 1 hour
const oneHourFromNow = Math.floor(Date.now() / 1000) + 3600;

// Current time + 45 seconds (warning state)
const fortyFiveSecondsFromNow = Math.floor(Date.now() / 1000) + 45;

// Current time + 5 seconds (critical warning)
const fiveSecondsFromNow = Math.floor(Date.now() / 1000) + 5;

// Already expired
const expired = Math.floor(Date.now() / 1000) - 10;

export const TenMinutes: Story = {
  args: {
    endTime: tenMinutesFromNow,
    showProgress: true,
  },
};

export const OneHour: Story = {
  args: {
    endTime: oneHourFromNow,
    showProgress: true,
  },
};

export const WarningState: Story = {
  args: {
    endTime: fortyFiveSecondsFromNow,
    showProgress: true,
  },
};

export const CriticalWarning: Story = {
  args: {
    endTime: fiveSecondsFromNow,
    showProgress: true,
  },
};

export const Expired: Story = {
  args: {
    endTime: expired,
    showProgress: true,
  },
};

export const WithoutProgress: Story = {
  args: {
    endTime: tenMinutesFromNow,
    showProgress: false,
  },
};

export const WithCallback: Story = {
  args: {
    endTime: Math.floor(Date.now() / 1000) + 10,
    showProgress: true,
    onExpire: () => {
      alert("Timer expired!");
    },
  },
};

export const CustomClass: Story = {
  args: {
    endTime: tenMinutesFromNow,
    showProgress: true,
    className: "w-96",
  },
};
