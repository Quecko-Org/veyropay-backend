import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class BaanxHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real Baanx connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('baanx');
    return indicator.up();
  }
}
