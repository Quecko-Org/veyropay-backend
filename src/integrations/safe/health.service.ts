import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class SafeHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real Safe connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('safe');
    return indicator.up();
  }
}
