import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipResponseTransform } from '@common/decorators';

@ApiExcludeController()
@Controller({ path: '/', version: VERSION_NEUTRAL })
export class RootController {
  @Get()
  @SkipResponseTransform()
  root() {
    return {
      status: 'ok',
      message: 'Server is running',
    };
  }
}
