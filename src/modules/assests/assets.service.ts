import { Injectable } from '@nestjs/common';
import { IAssetInfo, SUPPORTED_ASSETS } from './constants/assets.constant';

@Injectable()
export class AssetsService {
  list(chainId?: number): IAssetInfo[] {
    if (chainId === undefined) {
      return SUPPORTED_ASSETS;
    }

    return SUPPORTED_ASSETS.filter((asset) => asset.chainId === chainId);
  }
}
