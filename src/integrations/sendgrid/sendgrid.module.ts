import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SendgridClient } from './sendgrid.client';
import { SendgridService } from './sendgrid.service';
import { SendgridHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [SendgridClient, SendgridService, SendgridHealthService],
  exports: [SendgridService, SendgridHealthService],
})
export class SendgridModule {}
