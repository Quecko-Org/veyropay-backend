import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString } from 'class-validator';

export class SetSpendLimitDto {
  @ApiProperty({ example: '500.00' })
  @IsNumberString()
  @IsNotEmpty()
  limit!: string;
}
