import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RainClient } from './rain.client';
import { RainService } from './rain.service';
import { RainHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [RainClient, RainService, RainHealthService],
  exports: [RainService, RainHealthService],
})
export class RainModule {}
