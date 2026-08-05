import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route as exempt from JWT authorization once a global auth guard is introduced.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
