/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Blockchain Configuration
  readonly VITE_RPC_URL: string;
  readonly VITE_CHAIN_ID: string;

  // Contract Addresses
  readonly VITE_QUSD_TOKEN_ADDRESS: string;
  readonly VITE_ESCROW_CONTRACT_ADDRESS: string;

  // API Endpoints
  readonly VITE_FACILITATOR_URL: string;
  readonly VITE_BOT_SERVER_URL?: string;
  readonly VITE_BACKEND_URL?: string;

  // Robot Configuration
  readonly VITE_ROBOT_CONTROL_URL?: string;
  readonly VITE_ROBOT_PROVIDER_ADDRESS?: string;
  readonly VITE_ROBOT_BOT_ID?: string;
  readonly VITE_ROBOT_BOT_NAME?: string;

  // Payment Configuration
  readonly VITE_ROBOT_FULL_ACCESS_PRICE?: string;
  readonly VITE_DEFAULT_PAYMENT_TIMEOUT?: string;

  // Optional Configuration
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
