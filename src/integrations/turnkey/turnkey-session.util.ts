import { verifySessionJwtSignature } from '@turnkey/crypto';
import { ITurnkeySessionPayload } from './types';

// Turnkey session JWTs are signed by Turnkey itself and can be validated entirely
// locally - no API call to Turnkey needed. See
// docs.turnkey.com/authentication/backend-authentication ("Validating the JWT").
export async function verifyAndDecodeTurnkeySessionJwt(
  jwt: string,
): Promise<ITurnkeySessionPayload> {
  const isValid = await verifySessionJwtSignature(jwt);
  if (!isValid) {
    throw new Error('Invalid Turnkey session JWT: signature verification failed');
  }

  const [, payload] = jwt.split('.');
  if (!payload) {
    throw new Error('Invalid Turnkey session JWT: missing payload');
  }

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;

  const {
    exp,
    public_key: publicKey,
    session_type: sessionType,
    user_id: userId,
    organization_id: organizationId,
  } = decoded;

  if (!exp || !publicKey || !sessionType || !userId || !organizationId) {
    throw new Error('Invalid Turnkey session JWT: missing required fields');
  }

  if ((exp as number) * 1000 < Date.now()) {
    throw new Error('Turnkey session JWT has expired');
  }

  return {
    userId: userId as string,
    organizationId: organizationId as string,
    expiry: exp as number,
    publicKey: publicKey as string,
    sessionType: sessionType as string,
  };
}
