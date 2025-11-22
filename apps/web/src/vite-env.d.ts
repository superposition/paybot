/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_QUSD_TOKEN_ADDRESS: string;
  readonly VITE_ESCROW_CONTRACT_ADDRESS: string;
  readonly VITE_ROBOT_CONTROL_URL: string;
  readonly VITE_BOT_ID: string;
  readonly VITE_BOT_NAME: string;
  readonly VITE_X402_FACILITATOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
