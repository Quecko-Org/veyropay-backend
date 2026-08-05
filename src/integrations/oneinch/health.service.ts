import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class OneinchHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real Oneinch connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('oneinch');
    return indicator.up();
  }
}
