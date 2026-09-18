import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ClearDatabaseDto {
  @ApiProperty({
    description: 'Temporary admin wipe password (replace with real admin auth later)',
    example: 'Delete@Db',
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
