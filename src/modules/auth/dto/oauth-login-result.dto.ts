import { ApiProperty } from '@nestjs/swagger';

export class OauthLoginResultDto {
  @ApiProperty({ description: 'Turnkey session JWT - submit this to POST /auth/login' })
  sessionJwt!: string;

  constructor(partial: OauthLoginResultDto) {
    Object.assign(this, partial);
  }
}
