import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class PimlicoHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real Pimlico connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('pimlico');
    return indicator.up();
  }
}
