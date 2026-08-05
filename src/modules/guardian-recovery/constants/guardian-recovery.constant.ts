// Arbitrary sane cap, not derived from any product decision yet - revisit once the
// guardian threshold policy is finalized alongside the on-chain execution mechanism.
export const MAX_GUARDIANS_PER_WALLET = 5;

// Recovery requests expire after this window if not approved - prevents a stale
// request from being approved/executed long after it was legitimate.
export const RECOVERY_REQUEST_EXPIRY_HOURS = 72;

// A configurable guardian threshold must be at least 1 (never "0-of-M", meaningless)
// and at most the wallet's current active guardian count (enforced at both
// GuardianService.setGuardianThreshold() write time and RecoveryRequestService.
// createRequest() read time, since guardians can be removed after a threshold is set).
export const MIN_GUARDIAN_THRESHOLD = 1;
