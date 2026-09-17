import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GuardianOnChainStatusQueryDto {
  @ApiProperty({ description: 'Wallet id from recovery lookup or wallet provision' })
  @IsUUID()
  walletId!: string;
}
