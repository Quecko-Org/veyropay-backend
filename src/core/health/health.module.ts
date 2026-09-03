import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RootController } from './root.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController, RootController],
})
export class HealthModule {}
