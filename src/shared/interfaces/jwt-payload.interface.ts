export interface IJwtPayload {
  sub: string; // User ID
  sid: string; // Session ID
  iat?: number;
  exp?: number;
}
