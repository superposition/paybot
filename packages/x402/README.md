# @paybot/x402

X402 Payment Protocol Library - Config-driven blockchain payments

## Overview

A TypeScript library for implementing the X402 payment protocol on EVM-compatible blockchains. This library is **fully config-driven** with NO hardcoded values.

## Installation

```bash
bun add @paybot/x402
```

## Design Principles

1. **Config-Driven**: All configuration must be explicitly provided - no defaults
2. **Type-Safe**: Full TypeScript support with strict types
3. **Viem-Based**: Uses viem for all blockchain interactions
4. **Modular**: Clean separation of concerns

## Usage

```typescript
import { X402Config } from "@paybot/x402";

const config: X402Config = {
  rpcUrl: "http://localhost:8545",
  chainId: 31337,
  tokenAddress: "0x...",
  escrowAddress: "0x...",
};

// Client usage will be added in subsequent issues
```

## Development

```bash
# Build the package
bun run build

# Watch mode
bun run dev

# Type check
bun run typecheck
```

## Package Structure

```
packages/x402/
├── src/
│   ├── index.ts        # Main entry point
│   └── types.ts        # Core type definitions
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```
