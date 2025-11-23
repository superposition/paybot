# Paybot - Robot Control with X402 Micropayments

> **EthGlobal Submission** - Component-driven React web app with blockchain-based micropayments for robot control

A full-stack application that enables pay-per-use access to robotic systems using the X402 micropayment protocol, built with React, Hardhat 3, and Bun.

## 🚀 Quick Start

### Prerequisites

- **Bun** ≥ 1.0 - [Install Bun](https://bun.sh)
- **Docker & Docker Compose** - For running blockchain and services
- **Node.js** ≥ 20.0 (for Hardhat compatibility)

### Setup

1. **Clone and setup environment:**
   ```bash
   git clone <your-repo-url>
   cd paybot
   cp .env.example .env
   # Edit .env if needed (defaults work for local development)
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start all services with Docker:**
   ```bash
   docker-compose up -d
   ```

   This starts:
   - Hardhat blockchain node (port 8545)
   - X402 facilitator (port 8403)
   - Resource server (port 8404)
   - Web frontend (port 5173)

4. **Access the application:**
   - **Web App:** http://localhost:5173
   - **Storybook:** `cd apps/web && bun run storybook`

5. **Deploy contracts (if needed):**
   ```bash
   cd packages/contracts
   bun run deploy:local
   ```

## 📁 Project Structure

This is a **Turborepo monorepo** managed with **Bun workspaces**:

```
paybot/
├── .env.example              # Single source of truth for configuration
├── docker-compose.yml        # Multi-container orchestration ✅
├── turbo.json                # Build pipeline configuration
├── apps/
│   ├── web/                  # React frontend (Vite + Tailwind + Storybook) ✅
│   │   ├── src/
│   │   │   ├── components/   # UI components (gate, payment, basic, specialized, robot)
│   │   │   └── config/       # Environment-driven configuration
│   │   └── stories/          # Storybook stories for all components
│   └── x402-facilitator/     # Payment facilitator service ✅
│       └── src/
│           ├── facilitator.ts    # Core payment verification & settlement
│           ├── server.ts         # HTTP endpoints (/verify, /settle)
│           └── example-resource-server.ts
└── packages/
    ├── contracts/            # Hardhat 3 smart contracts ✅
    │   ├── contracts/        # QUSD token, Escrow, PaymentVerifier
    │   └── test/             # Comprehensive test suite (69 tests)
    ├── x402/                 # X402 TypeScript library ✅
    │   └── src/              # Protocol utilities, signatures, middleware, client helpers
    └── tsconfig/             # Shared TypeScript configurations ✅
```

## ⚙️ Environment Configuration

All configuration is centralized in `.env.example`. Key principles:

1. **Single Source of Truth:** All configuration in `.env.example`
2. **VITE_ Prefix:** Browser variables need `VITE_` prefix
3. **No Hardcoding:** All addresses/URLs from environment
4. **Docker Integration:** Services read from `.env` automatically
5. **Type Safety:** Config modules export typed constants

### Environment Variable Sections

```bash
# Blockchain
ANVIL_PORT=8545
ANVIL_CHAIN_ID=31337

# Contracts (deterministic addresses from Hardhat)
QUSD_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ESCROW_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# X402 Services
X402_SERVER_PORT=8402
X402_FACILITATOR_PORT=8403

# Robot Configuration
VITE_ROBOT_CONTROL_URL=http://192.168.0.221:5000
VITE_BOT_ID=ugv-rover-01
VITE_BOT_NAME=UGV Rover
```

See `.env.example` for complete documentation.

## 🛠️ Development Workflow

### Monorepo Commands

```bash
# Run all dev servers
bun run dev

# Build all packages
bun run build

# Run all tests
bun run test

# Run E2E tests (headless)
bun run test:e2e

# Run E2E tests (keep services running for debugging)
bun run test:e2e:dev

# Clean all build artifacts
bun run clean

# Format code
bun run format
```

### Package-Specific Development

```bash
# Smart contracts (Hardhat 3)
cd packages/contracts
bun run compile        # Compile contracts with viaIR optimizer
bun run test          # Run 69 tests (all passing)
bunx hardhat node     # Start local blockchain node

# X402 Protocol Library
cd packages/x402
bun run build         # Build TypeScript library
bun run typecheck     # Validate types

# Frontend
cd apps/web
bun run dev           # Development server (port 5173)
bun run storybook     # Component library (port 6007)
bun run build         # Production build

# X402 Facilitator
cd apps/x402-facilitator
bun run start         # Start facilitator (port 8403)
bun run start:resource # Start resource server (port 8404)
```

## 🏛️ Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Frontend"
        Web[Web App<br/>React + Vite]
        Storybook[Storybook<br/>Component Library]
    end

    subgraph "Backend Services"
        Facilitator[X402 Facilitator<br/>:8403]
        Resource[Resource Server<br/>:8404]
    end

    subgraph "Blockchain"
        Hardhat[Hardhat Node<br/>:8545]
        QUSD[QUSD Token Contract]
        Escrow[Escrow Contract]
    end

    subgraph "User"
        Wallet[MetaMask/WalletConnect]
    end

    Web -->|Signs Permit + Payment| Wallet
    Web -->|X-PAYMENT header| Resource
    Resource -->|/verify| Facilitator
    Resource -->|/settle| Facilitator
    Facilitator -->|Submit TX| Hardhat
    Hardhat --> QUSD
    Hardhat --> Escrow
    Wallet -.->|Read Balance| Hardhat

    style Web fill:#3b82f6
    style Facilitator fill:#10b981
    style Hardhat fill:#f59e0b
    style Wallet fill:#8b5cf6
```

### X402 Payment Flow

```mermaid
sequenceDiagram
    participant User
    participant Wallet
    participant Web
    participant Resource
    participant Facilitator
    participant Blockchain

    User->>Web: Request Access
    Web->>Wallet: Request Signatures
    Note over Wallet: EIP-2612 Permit<br/>EIP-712 Payment Intent
    Wallet->>Web: Signed Payloads
    Web->>Web: Create X-PAYMENT header
    Web->>Resource: Protected Request + X-PAYMENT
    Resource->>Facilitator: POST /verify
    Facilitator->>Facilitator: Validate Signatures
    Facilitator-->>Resource: Valid ✓
    Resource->>Facilitator: POST /settle
    Facilitator->>Blockchain: createPaymentWithPermit()
    Blockchain-->>Facilitator: Transaction Hash
    Facilitator-->>Resource: X-PAYMENT-RESPONSE
    Resource-->>Web: 200 OK + Response
    Web->>User: Access Granted
```

### Component Hierarchy

```mermaid
graph TD
    App[App.tsx]
    App --> BotAccessGate

    subgraph "Access Control"
        BotAccessGate --> PaymentModal
        BotAccessGate --> PaymentStatusCard
    end

    subgraph "Payment Components"
        PaymentModal --> Button
        PaymentModal --> Card
        PaymentModal --> Input
        PaymentStatusCard --> CountdownTimer
    end

    subgraph "Robot Interface"
        BotAccessGate --> FullScreenRobotView
        BotAccessGate --> RobotControlSidebar
        FullScreenRobotView --> Webcam
    end

    subgraph "Basic Components"
        Header
        Button
        Card
        Input
    end

    subgraph "Specialized"
        CountdownTimer
        Webcam
    end

    style BotAccessGate fill:#3b82f6
    style PaymentModal fill:#10b981
    style FullScreenRobotView fill:#f59e0b
```

### Docker Service Dependencies

```mermaid
graph LR
    subgraph "Docker Network: paybot-network"
        Hardhat[hardhat-node<br/>:8545]
        Facilitator[x402-facilitator<br/>:8403]
        Resource[resource-server<br/>:8404]
        Web[web<br/>:5173]
    end

    Hardhat -->|healthy| Facilitator
    Facilitator -->|healthy| Resource
    Facilitator -.-> Web
    Resource -.-> Web
    Hardhat -.-> Web

    style Hardhat fill:#f59e0b
    style Facilitator fill:#10b981
    style Resource fill:#8b5cf6
    style Web fill:#3b82f6
```

### Environment Variable Flow

```mermaid
graph TB
    ENV[.env file]

    subgraph "Backend"
        ENV --> Facilitator[X402 Facilitator]
        ENV --> Docker[Docker Compose]
    end

    subgraph "Frontend"
        ENV --> ViteEnv[VITE_* variables]
        ViteEnv --> X402Config[x402.ts]
        ViteEnv --> WagmiConfig[wagmi.ts]
    end

    X402Config --> Components[React Components]
    WagmiConfig --> Components

    style ENV fill:#f59e0b
    style ViteEnv fill:#10b981
    style Components fill:#3b82f6
```

### Monorepo Structure

```mermaid
graph TB
    Root[paybot/]

    Root --> Apps[apps/]
    Root --> Packages[packages/]

    Apps --> Web[web/<br/>React + Vite + Storybook]
    Apps --> Facilitator[x402-facilitator/<br/>Payment Service]

    Packages --> Contracts[contracts/<br/>Hardhat 3 + Solidity]
    Packages --> X402[x402/<br/>TypeScript Library]
    Packages --> TSConfig[tsconfig/<br/>Shared Configs]

    Web -.depends on.-> X402
    Web -.depends on.-> Contracts
    Facilitator -.depends on.-> X402
    Facilitator -.depends on.-> Contracts

    style Root fill:#f59e0b
    style Apps fill:#3b82f6
    style Packages fill:#10b981
```

## 📦 Technology Stack

- **Frontend:** React 18, Vite 5, TypeScript 5
- **Styling:** Tailwind CSS 3, shadcn/ui components
- **Blockchain:** Hardhat 3, viem 2, wagmi 2
- **Components:** Storybook 8 for isolated development
- **Monorepo:** Turborepo 2, Bun workspaces
- **Infrastructure:** Docker Compose

## 🏗️ Implementation Status

### ✅ Completed (MVP Ready)

**Foundation (M1)**
- [x] Monorepo setup with Turborepo and Bun
- [x] Environment variable system
- [x] Shared TypeScript configurations

**Smart Contracts (M2)**
- [x] QUSD ERC20 token with EIP-2612 permits
- [x] Escrow contract with gasless payments
- [x] PaymentVerifier for signature validation
- [x] 69 passing tests with full coverage

**X402 Protocol (M3)**
- [x] Protocol utilities (encoding, validation, 402 responses)
- [x] Signature helpers (EIP-712, EIP-2612)
- [x] HTTP middleware for payment verification
- [x] Client helpers for payment creation
- [x] Integration tests

**Backend Services (M4)**
- [x] X402 facilitator with /verify and /settle endpoints
- [x] Example resource server with X402 middleware
- [x] Docker Compose orchestration

**Frontend & Components (M5)**
- [x] Vite React app with Tailwind CSS
- [x] Wagmi v2 wallet integration
- [x] Configuration layer (environment-driven)
- [x] Payment components (PaymentModal, PaymentStatusCard)
- [x] Access gate component (BotAccessGate)
- [x] Basic components (Button, Card, Input, Header)
- [x] Specialized components (CountdownTimer, Webcam)
- [x] Robot components (FullScreenRobotView, RobotControlSidebar)
- [x] Comprehensive Storybook library (30+ stories)

**Infrastructure (M6)**
- [x] Vite configuration with proxies
- [x] Docker Compose with 4 services
- [x] Health checks and service dependencies

### 📝 Documentation (In Progress)
- [ ] Mermaid architecture diagrams
- [ ] Complete technical documentation

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
bun run test

# Run contract tests only
cd packages/contracts
bun run test
```

### E2E Tests (Headless)

The E2E test suite runs a complete end-to-end test of the entire stack:

```bash
# Run full E2E test (auto cleanup)
bun run test:e2e

# Run E2E test and keep services running
bun run test:e2e:dev
```

**What it tests:**
- ✅ Docker Compose service orchestration
- ✅ Hardhat blockchain node RPC
- ✅ X402 facilitator health and endpoints
- ✅ Resource server health and endpoints
- ✅ Web application availability
- ✅ Smart contract compilation and tests (69 tests)
- ✅ Service health checks and dependencies

**Output:**
- Color-coded test results
- Service status report
- Pass/fail summary
- Automatic cleanup (unless --no-cleanup flag)

### Manual Testing

```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down
```

## 🔒 Security Considerations

⚠️ **Important:**
- Never commit `.env` file
- Rotate private keys in production
- Use hardware wallet for contract deployment
- Audit contracts before mainnet deployment
- Validate all user inputs
- Implement rate limiting on X402 servers

## 📚 Documentation

- [GitHub Issues](../../issues) - Implementation tracking
- [Environment Variables](.env.example) - Complete configuration reference
- Architecture diagrams - Coming soon

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and test thoroughly
4. Update Storybook stories if adding/modifying components
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

- Built for **EthGlobal Hackathon**
- X402 micropayment protocol
- shadcn/ui component library
- Hardhat development framework

---

**Status:** ✅ MVP Complete | **Components:** 11 | **Tests:** 69 passing | **Services:** 4 running
