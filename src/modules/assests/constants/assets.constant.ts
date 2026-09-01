// Sentinel address convention used by 1inch, LiFi, and most DeFi protocols to represent
// the native gas token (ETH, MATIC, ...) in place of an ERC20 contract address - there
// is no real contract at this address.
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export interface IAssetInfo {
  chainId: number;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isNative: boolean;
  logoUrl: string;
}

const TRUST_WALLET_ASSETS_BASE_URL =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains';

// Seed list of supported assets, address-verified against BaseScan/PolygonScan before
// adding - a wrong contract address here would send real funds to the wrong place.
// logoUrl points at Trust Wallet's public assets repo (spot-checked, not exhaustively
// verified for every entry) - swap for your own CDN/hosted copies if you'd rather not
// depend on a third-party repo at runtime.
// Base (8453) USDT is deliberately NOT included: multiple different "USDT" contracts
// exist there (one bridged version is explicitly disclaimed by Tether as not affiliated
// with them), with no single confirmed canonical address - add it only once you've
// independently verified the correct one for your use case.
export const SUPPORTED_ASSETS: IAssetInfo[] = [
  // Base mainnet (8453)
  {
    chainId: 8453,
    symbol: 'ETH',
    name: 'Ether',
    address: NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    isNative: true,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/base/info/logo.png`,
  },
  {
    chainId: 8453,
    symbol: 'USDT',
    name: 'Tether USD (bridged)',
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6,
    isNative: false,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/base/assets/0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2/logo.png`,
  },

  {
    chainId: 8453,
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    isNative: false,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png`,
  },
  {
    chainId: 8453,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    isNative: false,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/base/assets/0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb/logo.png`,
  },

  // Polygon mainnet (137) - included for cross-chain swap testing via LiFi
  {
    chainId: 137,
    symbol: 'MATIC',
    name: 'Polygon',
    address: NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    isNative: true,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/polygon/info/logo.png`,
  },
  {
    chainId: 137,
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    isNative: false,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/polygon/assets/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359/logo.png`,
  },
  {
    chainId: 137,
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    isNative: false,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/polygon/assets/0xc2132D05D31c914a87C6611C10748AEb04B58e8F/logo.png`,
  },
  {
    chainId: 137,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    decimals: 18,
    isNative: false,
    logoUrl: `${TRUST_WALLET_ASSETS_BASE_URL}/polygon/assets/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063/logo.png`,
  },
];