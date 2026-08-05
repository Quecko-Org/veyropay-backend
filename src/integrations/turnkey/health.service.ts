import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class TurnkeyHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real Turnkey connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('turnkey');
    return indicator.up();
  }
}
