#!/usr/bin/env bash

# Test runner script that manages Hardhat node lifecycle

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Start Hardhat node in background
echo -e "${YELLOW}Starting Hardhat node...${NC}"
bunx --bun hardhat node > /dev/null 2>&1 &
NODE_PID=$!

# Function to cleanup
cleanup() {
  echo -e "${YELLOW}Stopping Hardhat node...${NC}"
  kill $NODE_PID 2>/dev/null || true
  exit
}

# Setup cleanup on script exit
trap cleanup EXIT INT TERM

# Wait for node to be ready
echo -e "${YELLOW}Waiting for node to be ready...${NC}"
sleep 3

# Run tests
echo -e "${GREEN}Running tests...${NC}"
bunx mocha test/**/*.test.ts

echo -e "${GREEN}Tests complete!${NC}"
