import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListAssetsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter to a single chain, e.g. 8453 for Base',
    example: 8453,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chainId?: number;
}
