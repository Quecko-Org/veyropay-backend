export const TURNKEY_PROVIDER_NAME = 'turnkey';

// provider_references.provider key used to persist a user's Turnkey sub-organization
// ID after login, so smart account provisioning can look it up later.
export const TURNKEY_ORGANIZATION_PROVIDER_KEY = 'turnkey_organization';

// Default Ethereum wallet account parameters used when provisioning a new
// sub-organization's first wallet at signup - see docs.turnkey.com/features/wallets.
export const DEFAULT_TURNKEY_WALLET_ACCOUNT_PARAMS = {
  curve: 'CURVE_SECP256K1',
  pathFormat: 'PATH_FORMAT_BIP32',
  path: "m/44'/60'/0'/0/0",
  addressFormat: 'ADDRESS_FORMAT_ETHEREUM',
};
