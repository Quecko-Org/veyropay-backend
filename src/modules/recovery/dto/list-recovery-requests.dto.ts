import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecoveryRequestStatus } from '@shared/enums';

export class ListRecoveryRequestsDto {
  @ApiProperty({ description: 'Wallet id from recovery lookup' })
  @IsUUID()
  walletId!: string;

  @ApiPropertyOptional({ enum: RecoveryRequestStatus })
  @IsOptional()
  @IsEnum(RecoveryRequestStatus)
  status?: RecoveryRequestStatus;
}
