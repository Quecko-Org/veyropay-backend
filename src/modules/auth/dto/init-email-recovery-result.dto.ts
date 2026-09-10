import { ApiProperty } from '@nestjs/swagger';

export class InitEmailRecoveryResultDto {
  @ApiProperty({ description: 'Turnkey user id that must recover (pass to /auth/recover/complete)' })
  userId!: string;

  @ApiProperty({ description: 'Turnkey sub-organization id for this user' })
  organizationId!: string;

  constructor(partial: InitEmailRecoveryResultDto) {
    Object.assign(this, partial);
  }
}
