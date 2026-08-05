import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TurnkeyClient } from './turnkey.client';
import { TurnkeyService } from './turnkey.service';
import { TurnkeyHealthService } from './health.service';

@Module({
  imports: [TerminusModule],
  providers: [TurnkeyClient, TurnkeyService, TurnkeyHealthService],
  exports: [TurnkeyService, TurnkeyHealthService],
})
export class TurnkeyModule {}
