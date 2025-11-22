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

3. **Start blockchain and services (coming soon):**
   ```bash
   docker-compose up -d
   ```

4. **Start web app (coming soon):**
   ```bash
   cd apps/web
   bun run dev
   ```

5. **View Storybook component library (coming soon):**
   ```bash
   cd apps/web
   bun run storybook
   ```

## 📁 Project Structure

This is a **Turborepo monorepo** managed with **Bun workspaces**:

```
paybot/
├── .env.example              # Single source of truth for configuration
├── docker-compose.yml        # Infrastructure services (coming soon)
├── turbo.json                # Build pipeline configuration
├── apps/
│   ├── web/                  # React frontend (Vite + Tailwind + Storybook)
│   └── x402-facilitator/     # Payment facilitator service
└── packages/
    ├── contracts/            # Hardhat 3 smart contracts
    ├── x402/                 # X402 TypeScript library
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

# Clean all build artifacts
bun run clean

# Format code
bun run format
```

### Package-Specific Development

```bash
# Smart contracts (Hardhat 3) - coming soon
cd packages/contracts
bun run compile        # Compile contracts
bun run test          # Run tests
bunx hardhat node     # Start local node

# Frontend - coming soon
cd apps/web
bun run dev           # Development server
bun run storybook     # Component library
```

## 📦 Technology Stack

- **Frontend:** React 18, Vite 5, TypeScript 5
- **Styling:** Tailwind CSS 3, shadcn/ui components
- **Blockchain:** Hardhat 3, viem 2, wagmi 2
- **Components:** Storybook 8 for isolated development
- **Monorepo:** Turborepo 2, Bun workspaces
- **Infrastructure:** Docker Compose

## 🏗️ Implementation Status

### ✅ Completed
- [x] Monorepo setup with Turborepo and Bun
- [x] Environment variable system
- [x] Shared TypeScript configurations
- [x] Project documentation structure

### 🚧 In Progress
Track implementation progress at: [GitHub Issues](../../issues)

- [ ] Hardhat 3 smart contracts (QUSD token, Escrow)
- [ ] X402 payment protocol library
- [ ] React web application with Storybook
- [ ] Component library (11 components)
- [ ] Docker infrastructure
- [ ] Mermaid diagrams and full documentation

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

**Status:** 🚧 Under active development | **Current Phase:** Foundation Complete ✅
