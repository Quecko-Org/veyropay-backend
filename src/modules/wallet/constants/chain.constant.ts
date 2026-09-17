// Defaults to Base mainnet; override with WALLET_CHAIN_ID (e.g. 84532 for Base Sepolia).
export const BASE_CHAIN_ID = Number(process.env.WALLET_CHAIN_ID ?? 8453);
