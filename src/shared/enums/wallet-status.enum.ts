export enum WalletStatus {
  // Wallet creation is gated behind an unresolved architecture decision
  // (see docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1) - a Wallet row can exist in
  // this state before a smart account provider is bound.
  PENDING_PROVIDER = 'pending_provider',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}
