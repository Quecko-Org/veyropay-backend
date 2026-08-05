import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class LifiHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real Lifi connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('lifi');
    return indicator.up();
  }
}
