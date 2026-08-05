import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_TRANSFORM_KEY = 'skipResponseTransform';

// Opts a route out of the global ResponseInterceptor envelope, for endpoints
// that must return a raw body (e.g. Prometheus text exposition format).
export const SkipResponseTransform = () => SetMetadata(SKIP_RESPONSE_TRANSFORM_KEY, true);
