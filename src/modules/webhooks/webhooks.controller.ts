import { Controller, Headers, HttpCode, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

// Provider webhooks - authenticated by HMAC signature, not JWT. Excluded from Swagger
// since these are machine-to-machine endpoints called by Sumsub/Rain/Baanx, not clients.
@ApiExcludeController()
@Controller({ path: 'webhooks', version: '1' })
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('sumsub')
  @HttpCode(200)
  handleSumsub(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-payload-digest') signature?: string,
  ) {
    return this.webhooksService.handleSumsub(req.rawBody as Buffer, signature);
  }

  @Post('rain')
  @HttpCode(200)
  handleRain(@Req() req: RawBodyRequest<Request>, @Headers('x-rain-signature') signature?: string) {
    return this.webhooksService.handleRain(req.rawBody as Buffer, signature);
  }

  @Post('baanx')
  @HttpCode(200)
  handleBaanx(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-baanx-signature') signature?: string,
  ) {
    return this.webhooksService.handleBaanx(req.rawBody as Buffer, signature);
  }
}
