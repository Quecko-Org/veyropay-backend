import { ApiProperty } from '@nestjs/swagger';

export class CompleteEmailRecoveryResultDto {
  @ApiProperty({ description: 'Turnkey user id that recovered' })
  userId!: string;

  @ApiProperty({
    description:
      'Next step: client calls Turnkey stampLogin() with the new passkey, then POST /auth/login',
  })
  message!: string;

  constructor(partial: CompleteEmailRecoveryResultDto) {
    Object.assign(this, partial);
  }
}
