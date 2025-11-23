# X402 Facilitator Dockerfile
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
COPY apps/x402-facilitator ./apps/x402-facilitator

# Install dependencies
RUN bun install

# Build x402 package
WORKDIR /app/packages/x402
RUN bun run build

# Build contracts package
WORKDIR /app/packages/contracts
RUN bun run compile

# Expose facilitator port
WORKDIR /app
EXPOSE 8403

# Expose resource server port
EXPOSE 8404

# Set working directory to facilitator
WORKDIR /app/apps/x402-facilitator

# Health check for facilitator
HEALTHCHECK --interval=10s --timeout=3s --retries=5 --start-period=20s \
  CMD wget --spider -q http://localhost:8403/health || exit 1

# Default: start facilitator (can be overridden with command)
CMD ["bun", "run", "start"]
