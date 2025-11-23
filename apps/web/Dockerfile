# Web Frontend Dockerfile (Multi-stage)
FROM oven/bun:1.3-alpine AS base

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./

# Copy workspace packages
COPY packages/tsconfig ./packages/tsconfig
COPY packages/contracts ./packages/contracts
COPY packages/x402 ./packages/x402
COPY apps/web ./apps/web

# Install dependencies
RUN bun install

# Build x402 package
WORKDIR /app/packages/x402
RUN bun run build

# Build contracts package
WORKDIR /app/packages/contracts
RUN bun run compile

# Development stage
WORKDIR /app
FROM base AS development

WORKDIR /app/apps/web

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# Production build stage
FROM base AS builder

WORKDIR /app/apps/web

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.3-alpine AS production

WORKDIR /app

# Install serve for static file serving
RUN bun add -g serve

# Copy built files from builder
COPY --from=builder /app/apps/web/dist ./dist

EXPOSE 5173

# Serve static files
CMD ["serve", "-s", "dist", "-l", "5173"]
