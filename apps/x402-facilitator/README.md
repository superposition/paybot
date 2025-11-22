# X402 Facilitator Service

Payment facilitation service for the X402 micropayment protocol.

## Overview

The X402 Facilitator provides a stateless HTTP API for managing X402 payments without requiring direct wallet integration. It handles:

- Payment request generation
- Payment status monitoring
- Webhook notifications for payment status changes
- QR code data and deep link generation

## Features

- **Stateless Architecture**: No database required
- **Config-Driven**: All configuration from environment variables
- **Webhook Support**: Real-time payment status notifications
- **QR Code Generation**: Payment data formatted for QR encoding
- **Deep Links**: Mobile wallet integration support

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Get Configuration
```
GET /config
```
Returns blockchain configuration (chainId, contract addresses).

### Create Payment Request
```
POST /payments/create
Content-Type: application/json

{
  "recipient": "0x...",
  "amount": "1000000000000000000",
  "duration": 3600,
  "serviceType": "robot-control",
  "metadata": {}
}
```
Generates a payment request with QR code data and deep link.

### Check Payment Status
```
GET /payments/:paymentId
```
Returns current payment status from blockchain.

### Monitor Payment
```
POST /payments/:paymentId/monitor
Content-Type: application/json

{
  "callbackUrl": "https://your-service.com/webhook"
}
```
Starts monitoring a payment and sends webhooks on status changes.

## Environment Variables

```bash
X402_FACILITATOR_PORT=8403
VITE_RPC_URL=http://localhost:8545
VITE_CHAIN_ID=31337
VITE_QUSD_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_ESCROW_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

## Running

```bash
# Development (with auto-reload)
bun run dev

# Production
bun run start

# Build
bun run build
```

## Architecture

- **Hono**: Fast, lightweight web framework for Bun
- **X402Client**: Blockchain interaction via viem
- **PaymentFacilitator**: Payment lifecycle management
- **Webhook System**: Real-time status notifications

## Payment Flow

1. **Create Request**: POST /payments/create generates paymentId and QR data
2. **User Pays**: User scans QR or uses deep link to create payment on-chain
3. **Monitor**: Service polls blockchain and sends webhooks on status changes
4. **Complete**: Payment claimed or refunded, monitoring stops

## Development

```bash
# Type check
bun run typecheck

# Clean build artifacts
rm -rf dist
```
