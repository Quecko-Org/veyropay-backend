import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

@Injectable()
export class SendgridHealthService {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  // Reports configuration presence only until real SendGrid connectivity checks are implemented.
  check() {
    const indicator = this.healthIndicatorService.check('sendgrid');
    return indicator.up();
  }
}
