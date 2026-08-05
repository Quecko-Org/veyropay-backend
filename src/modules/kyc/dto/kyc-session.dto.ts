import { ApiProperty } from '@nestjs/swagger';

export class KycSessionDto {
  @ApiProperty()
  applicantId!: string;

  @ApiProperty({ description: 'Token the mobile client uses to open the Sumsub SDK flow' })
  accessToken!: string;

  constructor(partial: KycSessionDto) {
    Object.assign(this, partial);
  }
}
