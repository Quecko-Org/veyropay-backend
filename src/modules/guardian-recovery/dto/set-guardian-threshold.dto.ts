import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetGuardianThresholdDto {
  @ApiProperty({
    description:
      'Number of active guardians required to approve a recovery request (N-of-M). Must be ' +
      'between 1 and the wallet current active guardian count.',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  threshold!: number;
}
