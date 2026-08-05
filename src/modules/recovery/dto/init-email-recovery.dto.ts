import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Unauthenticated by design - the requester has lost session access.
export class InitEmailRecoveryDto {
  @ApiProperty({ description: 'Email address of the account to recover' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description:
      'Client-side public key generated for this recovery attempt, to which the recovery bundle will be encrypted',
  })
  @IsString()
  @IsNotEmpty()
  targetPublicKey!: string;
}
