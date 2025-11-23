/**
 * Wagmi Configuration
 *
 * Wallet and blockchain connection setup using wagmi v2
 */

import { createConfig, http, type Config } from "wagmi";
import { hardhat, base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { X402_CONFIG, X402_ENDPOINTS } from "./x402";

// Determine which chain to use based on chainId
function getChain() {
  switch (X402_CONFIG.chainId) {
    case 31337:
      return hardhat;
    case 8453:
      return base;
    case 84532:
      return baseSepolia;
    default:
      throw new Error(`Unsupported chain ID: ${X402_CONFIG.chainId}`);
  }
}

const chain = getChain();

// WalletConnect project ID (optional, from env)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Wagmi configuration
export const wagmiConfig: Config = createConfig({
  chains: [chain] as const,
  connectors: [
    injected({
      target: "metaMask",
    }),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            metadata: {
              name: "PayBot",
              description: "Robot control with X402 payments",
              url: import.meta.env.VITE_APP_URL || "http://localhost:5173",
              icons: [],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [chain.id]: http(X402_ENDPOINTS.provider),
  } as any,
});

// Export chain for convenience
export { chain };

// Export connector types for TypeScript
declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
