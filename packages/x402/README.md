# @paybot/x402

X402 Payment Protocol Implementation

A complete TypeScript implementation of the X402 protocol for HTTP-based blockchain payments with gasless transactions.

## Features

- ✅ **HTTP 402 Status Code** - Standardized payment requirement responses
- ✅ **Gasless Transactions** - Users sign, facilitator pays gas (EIP-2612 + EIP-712)
- ✅ **Payment Verification** - `/verify` endpoint for signature validation
- ✅ **Blockchain Settlement** - `/settle` endpoint for on-chain payment execution
- ✅ **Middleware Support** - Easy integration with Hono/Express servers
- ✅ **Type-Safe** - Full TypeScript support with viem

## Installation

```bash
bun add @paybot/x402
```

## Quick Start

### 1. Client: Create Gasless Payment

```typescript
import {
  createEVMPermitPayload,
  createPaymentHeader,
  getNonces,
} from "@paybot/x402";
import { parseEther, keccak256, toHex } from "viem";

// Create payment payload
const paymentId = keccak256(toHex("unique-payment-id"));
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

// Get nonces
const nonces = await getNonces(
  tokenAddress,
  escrowAddress,
  TOKEN_ABI,
  ESCROW_ABI,
  userAddress,
  publicClient
);

// Create signed payload
const payload = await createEVMPermitPayload(
  {
    tokenAddress,
    tokenName: "Qualia USD",
    escrowAddress,
    chainId: 31337,
  },
  {
    paymentId,
    payer: userAddress,
    recipient: serviceAddress,
    amount: parseEther("100"),
    duration: 3600,
  },
  nonces,
  deadline,
  walletClient,
  publicClient
);

// Create payment header
const paymentHeader = createPaymentHeader({
  x402Version: 1,
  scheme: "evm-permit",
  network: "localhost",
  payload,
});

// Send request with payment
const response = await fetch("https://api.example.com/protected/data", {
  headers: {
    "X-PAYMENT": paymentHeader,
  },
});
```

### 2. Server: Require Payment

```typescript
import { Hono } from "hono";
import { x402Middleware } from "@paybot/x402";

const app = new Hono();

app.get(
  "/protected/data",
  x402Middleware({
    payTo: "0x...", // Your payment address
    asset: "0x...", // QUSD token address
    maxAmountRequired: "100000000000000000000", // 100 QUSD
    network: "localhost",
    maxTimeoutSeconds: 3600,
    facilitatorUrl: "http://localhost:8403",
    description: "Access to protected data",
  }),
  (c) => {
    const payment = c.get("x402Payment");
    return c.json({
      message: "Success!",
      payment,
      data: { secret: "Protected content" },
    });
  }
);
```

### 3. Facilitator: Verify and Settle

The facilitator handles payment verification and blockchain settlement:

```typescript
import { PaymentFacilitator } from "@paybot/x402-facilitator";

const facilitator = new PaymentFacilitator({
  rpcUrl: "http://localhost:8545",
  chainId: 31337,
  tokenAddress: "0x...",
  escrowAddress: "0x...",
});

// Verify payment
const verification = await facilitator.verifyPayment(paymentHeader);

// Settle on blockchain
const settlement = await facilitator.settlePayment(
  paymentHeader,
  facilitatorPrivateKey
);
```

## Protocol Flow

```
1. Client → Resource Server
   GET /protected/data

2. Resource Server → Client
   402 Payment Required
   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "evm-permit",
       "payTo": "0x...",
       "asset": "0x...",
       "maxAmountRequired": "100000000000000000000"
     }]
   }

3. Client → Facilitator
   POST /verify
   { "payment": "<base64-payload>" }

4. Facilitator → Client
   { "valid": true, "paymentId": "0x..." }

5. Client → Resource Server
   GET /protected/data
   X-PAYMENT: <base64-payload>

6. Resource Server → Facilitator
   POST /settle
   { "payment": "<base64-payload>" }

7. Facilitator → Blockchain
   createPaymentWithPermit(...)

8. Facilitator → Resource Server
   { "settled": true, "txHash": "0x..." }

9. Resource Server → Client
   200 OK
   X-PAYMENT-RESPONSE: {"txHash": "0x...", "paymentId": "0x..."}
   { "data": "Protected content" }
```

## API Reference

### Protocol Types

```typescript
interface PaymentPayload {
  x402Version: number;
  scheme: "evm-permit" | "evm-legacy";
  network: string;
  payload: EVMPermitPayload;
}

interface EVMPermitPayload {
  paymentId: Hex;
  payer: Address;
  recipient: Address;
  amount: string;
  duration: number;
  deadline: string;
  nonce: string;
  permitSignature: { v: number; r: Hex; s: Hex };
  paymentSignature: { v: number; r: Hex; s: Hex };
}
```

### Utility Functions

- `encodePaymentPayload(payload)` - Encode to base64
- `decodePaymentPayload(encoded)` - Decode from base64
- `validatePaymentPayload(payload)` - Validate structure
- `create402Response(requirements)` - Create 402 response
- `createPaymentHeader(payload)` - Create X-PAYMENT header
- `parsePaymentHeader(header)` - Parse X-PAYMENT header

### Signature Functions

- `signPermit(...)` - Sign EIP-2612 permit
- `signPaymentIntent(...)` - Sign EIP-712 payment intent
- `createEVMPermitPayload(...)` - Create complete signed payload
- `getNonces(...)` - Get nonces for signing

### Middleware

- `x402Middleware(config)` - Full verification and settlement
- `x402CheckOnly(config)` - Header check only (for testing)

## Environment Variables

```env
# Facilitator
FACILITATOR_PRIVATE_KEY=0x...  # Private key to pay gas
X402_FACILITATOR_PORT=8403

# Resource Server
RESOURCE_SERVER_PORT=8404

# Blockchain
VITE_RPC_URL=http://localhost:8545
VITE_CHAIN_ID=31337
VITE_QUSD_TOKEN_ADDRESS=0x...
VITE_ESCROW_CONTRACT_ADDRESS=0x...
```

## Running the Example

```bash
# Terminal 1: Start Hardhat node
cd packages/contracts
bun run node

# Terminal 2: Start facilitator
cd apps/x402-facilitator
bun run dev

# Terminal 3: Start example resource server
cd apps/x402-facilitator
bun run dev:resource

# Terminal 4: Test the flow
curl http://localhost:8404/protected/data
# Returns 402 with payment requirements

curl http://localhost:8404/endpoints
# List all endpoints and their payment requirements
```

## Testing

The gasless payment functionality is fully tested in the contracts package:

```bash
cd packages/contracts
bun run test
```

64 tests including:
- Gasless payment creation (EIP-2612 + EIP-712)
- Signature verification
- Nonce management
- Replay attack prevention
- Gas cost verification (facilitator pays, user doesn't)

## Architecture

### Gasless Transactions

The X402 implementation uses a gasless transaction pattern:

1. **User** signs two messages off-chain (no gas):
   - EIP-2612 permit for token approval
   - EIP-712 payment intent with payment details

2. **Facilitator** submits transaction on-chain (pays gas):
   - Calls `createPaymentWithPermit()`
   - Verifies both signatures
   - Creates escrow payment

3. **Result**: User pays tokens, facilitator pays gas

### Smart Contracts

- **Escrow.sol** - Payment escrow with gasless support
  - `createPaymentWithPermit()` - Gasless payment creation
  - `claimPayment()` - Recipient claims payment
  - `refundPayment()` - Payer refunds after expiry

- **QUSDToken.sol** - ERC20 with EIP-2612 permit
  - Standard ERC20 functionality
  - `permit()` for gasless approvals

## Package Structure

```
packages/x402/
├── src/
│   ├── index.ts           # Main entry point
│   ├── types.ts           # Core type definitions
│   ├── client.ts          # X402Client
│   ├── protocol.ts        # Protocol types and utilities
│   ├── signatures.ts      # EIP-712 signature utilities
│   ├── middleware.ts      # HTTP middleware
│   └── abis.ts            # Contract ABIs
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
