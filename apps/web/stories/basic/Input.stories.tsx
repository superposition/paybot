import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "../../src/components/ui/input";

const meta = {
  title: "Basic/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "tel", "url"],
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const Email: Story = {
  args: {
    type: "email",
    placeholder: "email@example.com",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password",
  },
};

export const Number: Story = {
  args: {
    type: "number",
    placeholder: "Enter number",
  },
};

export const Search: Story = {
  args: {
    type: "search",
    placeholder: "Search...",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Disabled input",
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "Pre-filled value",
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="w-[350px] space-y-2">
      <label htmlFor="input-with-label" className="text-sm font-medium">
        Email Address
      </label>
      <Input id="input-with-label" {...args} />
    </div>
  ),
  args: {
    type: "email",
    placeholder: "you@example.com",
  },
};

export const WithError: Story = {
  render: (args) => (
    <div className="w-[350px] space-y-2">
      <label htmlFor="input-error" className="text-sm font-medium">
        Email Address
      </label>
      <Input
        id="input-error"
        className="border-red-500 focus-visible:ring-red-500"
        {...args}
      />
      <p className="text-sm text-red-500">Please enter a valid email address.</p>
    </div>
  ),
  args: {
    type: "email",
    placeholder: "you@example.com",
  },
};

export const WithHelperText: Story = {
  render: (args) => (
    <div className="w-[350px] space-y-2">
      <label htmlFor="input-helper" className="text-sm font-medium">
        Username
      </label>
      <Input id="input-helper" {...args} />
      <p className="text-sm text-gray-500">
        Choose a unique username for your account.
      </p>
    </div>
  ),
  args: {
    placeholder: "username",
  },
};
