import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const stopTimer = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const durationSeconds = Number(process.hrtime.bigint() - stopTimer) / 1e9;
        const route = request.route as { path?: string } | undefined;
        const labels = {
          method: request.method,
          route: route?.path ?? request.url,
          status_code: String(response.statusCode),
        };

        this.metricsService.httpRequestsTotal.inc(labels);
        this.metricsService.httpRequestDurationSeconds.observe(labels, durationSeconds);
      }),
    );
  }
}
