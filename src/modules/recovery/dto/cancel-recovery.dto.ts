import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CancelRecoveryDto {
  @ApiProperty({
    description: 'Must match the recovery requester email or the wallet owner email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
