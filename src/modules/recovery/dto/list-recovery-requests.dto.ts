import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecoveryRequestStatus } from '@shared/enums';

export class ListRecoveryRequestsDto {
  @ApiProperty({ description: 'Wallet id from recovery lookup' })
  @IsUUID()
  walletId!: string;

  @ApiPropertyOptional({
    enum: RecoveryRequestStatus,
    description:
      'When omitted, returns in-flight recoveries only (pending, approved, executed). ' +
      'Use status=claimed for completed recovery history.',
  })
  @IsOptional()
  @IsEnum(RecoveryRequestStatus)
  status?: RecoveryRequestStatus;
}
