export interface ISafeInfo {
  address: string;
  owners: string[];
  threshold: number;
  nonce: number;
  singleton: string;
  version: string;
}

export interface ISafeCreationInfo {
  created: string;
  creator: string;
  transactionHash: string;
  factoryAddress: string;
  masterCopy: string;
  setupData: string;
}

export interface ISafesByOwnerResponse {
  safes: string[];
}
