import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@shared/dto';
import { TransactionType } from '@shared/enums';

export class ListTransactionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filter to a single transaction type - e.g. transfer, swap, card_payment',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}