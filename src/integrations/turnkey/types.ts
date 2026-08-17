// The client authenticates a request by signing it with the user's passkey/API key and
// attaching the result as the X-Stamp header. The backend never sees the private key -
// it only relays the stamp to Turnkey for verification.
export interface ITurnkeyStampedRequest {
  stamp: string;
  organizationId: string;
}

// Shape of Turnkey's whoami query response. Field names should be verified against
// Turnkey's current API reference before this integration goes live - this sandbox has
// no live Turnkey credentials to validate the exact response contract against.
export interface ITurnkeyWhoAmIResponse {
  organizationId: string;
  organizationName: string;
  userId: string;
  username: string;
}

// A single derived address within a Turnkey Wallet. `addressFormat` should be
// reconfirmed against Turnkey's current reference (expected: "ADDRESS_FORMAT_ETHEREUM").
export interface ITurnkeyWalletAccount {
  address: string;
  addressFormat: string;
  walletId: string;
}

export interface ITurnkeyWalletAccountsResponse {
  accounts: ITurnkeyWalletAccount[];
}

// Decoded, verified payload of a Turnkey session JWT - see
// docs.turnkey.com/authentication/backend-authentication. Signature is verified locally
// via @turnkey/crypto's verifySessionJwtSignature before this is trusted.
export interface ITurnkeySessionPayload {
  userId: string;
  organizationId: string;
  expiry: number;
  publicKey: string;
  sessionType: string;
}

// A single authenticator (passkey) registered on a new sub-organization's root user.
export interface ITurnkeyAuthenticatorParams {
  authenticatorName: string;
  challenge: string;
  attestation: unknown;
}

// A single OAuth/OIDC provider registered on a new sub-organization's root user.
export interface ITurnkeyOauthProviderParams {
  providerName: string;
  oidcToken: string;
}

export interface ITurnkeyApiKeyParams {
  apiKeyName: string;
  publicKey: string;
  curveType: string;
}

export interface ITurnkeyRootUserParams {
  userName?: string;
  userEmail?: string;
  apiKeys: ITurnkeyApiKeyParams[];
  authenticators: ITurnkeyAuthenticatorParams[];
  oauthProviders: ITurnkeyOauthProviderParams[];
}

export interface ITurnkeyWalletAccountParams {
  curve: string;
  pathFormat: string;
  path: string;
  addressFormat: string;
}

export interface ITurnkeyCreateSubOrganizationParams {
  subOrganizationName: string;
  rootUsers: ITurnkeyRootUserParams[];
  rootQuorumThreshold: number;
  wallet?: {
    walletName: string;
    accounts: ITurnkeyWalletAccountParams[];
  };
}

export interface ITurnkeyCreateSubOrganizationResult {
  subOrganizationId: string;
  wallet?: {
    walletId: string;
    addresses: string[];
  };
}

export interface ITurnkeyOauthLoginParams {
  organizationId: string;
  oidcToken: string;
  publicKey: string;
  expirationSeconds?: string;
  invalidateExisting?: boolean;
}

export interface ITurnkeyOauthLoginResult {
  session: string;
}

export interface ITurnkeyGetSubOrgIdsResponse {
  organizationIds: string[];
}

export interface ITurnkeyEmailCustomizationParams {
  appName: string;
  logoUrl?: string;
  magicLinkTemplate?: string;
}

export interface ITurnkeyInitEmailRecoveryParams {
  organizationId: string;
  email: string;
  targetPublicKey: string;
  expirationSeconds?: string;
  emailCustomization: ITurnkeyEmailCustomizationParams;
}

export interface ITurnkeyInitEmailRecoveryResult {
  userId: string;
}

// The client constructs and stamps this entire activity body itself, using the
// recovery credential decrypted from the email Turnkey sent - the backend cannot
// produce this stamp (it never sees the recovery credential) and only relays the
// exact bytes the client signed. `timestampMs` is client-supplied for the same
// reason: it's part of what the stamp signs over.
export interface ITurnkeyCompleteRecoveryParams {
  organizationId: string;
  userId: string;
  timestampMs: string;
  authenticator: ITurnkeyAuthenticatorParams;
  stamp: string;
}

export interface ITurnkeyCompleteRecoveryResult {
  userId: string;
}
