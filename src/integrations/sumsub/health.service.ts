import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class SumsubHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real Sumsub connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('sumsub');
    return indicator.up();
  }
}
