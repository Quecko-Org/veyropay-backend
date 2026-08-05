import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

// The requester has, by definition, lost access to their authenticated session - this
// endpoint is intentionally unauthenticated and identifies the account by email instead.
export class CreateRecoveryRequestDto {
  @ApiProperty({ description: 'Email address of the account being recovered' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'New Turnkey-provisioned owner address to swap in once recovery is approved',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'newOwnerAddress must be a valid EVM address' })
  newOwnerAddress!: string;
}
