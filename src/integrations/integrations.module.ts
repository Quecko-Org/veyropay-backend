import { Module } from '@nestjs/common';
import { TurnkeyModule } from './turnkey/turnkey.module';
import { SafeModule } from './safe/safe.module';
import { PimlicoModule } from './pimlico/pimlico.module';
import { OneinchModule } from './oneinch/oneinch.module';
import { LifiModule } from './lifi/lifi.module';
import { SumsubModule } from './sumsub/sumsub.module';
import { RainModule } from './rain/rain.module';
import { BaanxModule } from './baanx/baanx.module';
import { SendgridModule } from './sendgrid/sendgrid.module';

// Aggregates every provider integration module so app.module.ts only imports this one module.
@Module({
  imports: [
    TurnkeyModule,
    SafeModule,
    PimlicoModule,
    OneinchModule,
    LifiModule,
    SumsubModule,
    RainModule,
    BaanxModule,
    SendgridModule,
  ],
  exports: [
    TurnkeyModule,
    SafeModule,
    PimlicoModule,
    OneinchModule,
    LifiModule,
    SumsubModule,
    RainModule,
    BaanxModule,
    SendgridModule,
  ],
})
export class IntegrationsModule {}
