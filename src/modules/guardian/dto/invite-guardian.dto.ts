import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { GuardianRelationship } from '@shared/enums';

export class InviteGuardianDto {
  @ApiProperty({ description: 'User id returned by guardian search' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: GuardianRelationship })
  @IsEnum(GuardianRelationship)
  relationship!: GuardianRelationship;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canApproveRecovery?: boolean = true;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canMoveFunds?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canSeeBalance?: boolean = false;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canBeRemoved?: boolean = true;
}
