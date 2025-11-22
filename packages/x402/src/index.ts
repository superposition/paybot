/**
 * X402 Payment Protocol Library
 *
 * Config-driven blockchain payment implementation with NO hardcoded values.
 * All configuration must be passed explicitly through function parameters or config objects.
 */

export const X402_VERSION = "1.0.0";

// Core client
export { X402Client } from "./client";

// Types
export * from "./types";

// ABIs
export { ESCROW_ABI, TOKEN_ABI } from "./abis";
