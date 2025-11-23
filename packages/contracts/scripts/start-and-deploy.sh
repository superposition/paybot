#!/bin/sh
set -e

echo "🚀 Starting Hardhat node and deploying contracts..."

# Start Hardhat node in the background
echo "📡 Starting Hardhat node..."
bunx --bun hardhat node &
NODE_PID=$!

# Wait for node to be ready
echo "⏳ Waiting for Hardhat node to be ready..."
i=0
while [ $i -lt 30 ]; do
  if wget --spider -q http://127.0.0.1:8545 2>/dev/null; then
    echo "✅ Hardhat node is ready!"
    break
  fi
  i=$((i + 1))
  if [ $i -eq 30 ]; then
    echo "❌ Hardhat node failed to start"
    kill $NODE_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Deploy contracts
echo "📝 Deploying contracts..."
if bun run scripts/deploy.ts; then
  echo "✅ Contracts deployed successfully!"

  # Export contract ABIs
  echo "📤 Exporting contract ABIs..."
  bun run scripts/export-contracts.ts
  echo "✅ Contract ABIs exported!"
else
  echo "❌ Contract deployment failed"
  kill $NODE_PID 2>/dev/null || true
  exit 1
fi

# Keep the node running
echo "🎉 Setup complete! Hardhat node running on port 8545"
wait $NODE_PID
