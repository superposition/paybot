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

// Protocol utilities
export * from "./protocol";

// Signature utilities
export * from "./signatures";

// Client helpers
export * from "./client-helpers";

// Middleware
export * from "./middleware";

// ABIs
export { ESCROW_ABI, TOKEN_ABI } from "./abis";
