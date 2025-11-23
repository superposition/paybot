# Hardhat Node Dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Install wget for healthchecks
RUN apk add --no-cache wget

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace packages
COPY packages/tsconfig ./packages/tsconfig
COPY packages/contracts ./packages/contracts
COPY packages/x402 ./packages/x402

# Install dependencies
RUN bun install

# Expose Hardhat node port
EXPOSE 8545

# Set working directory to contracts
WORKDIR /app/packages/contracts

# Health check
HEALTHCHECK --interval=5s --timeout=3s --retries=10 --start-period=10s \
  CMD wget --spider -q http://localhost:8545 || exit 1

# Start Hardhat node
CMD ["bun", "run", "node"]
