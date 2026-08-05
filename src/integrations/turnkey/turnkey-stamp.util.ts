import { createPrivateKey, createSign } from 'crypto';

// Builds the SEC1 (RFC 5915) DER encoding of a raw P-256 private key scalar so
// Node's crypto module can import it and derive the matching public key/sign with
// it - Turnkey issues API keys as a bare 32-byte private scalar (hex), not PEM/DER.
// Verified empirically (round-tripped a generated P-256 key through this exact
// encoding, confirmed the derived public key and a produced signature both match
// what Node produces from the original key) before relying on it here.
function buildSec1PrivateKeyDer(privateKeyHex: string): Buffer {
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  const version = Buffer.from([0x02, 0x01, 0x01]);
  const privateKeyOctet = Buffer.concat([
    Buffer.from([0x04, privateKeyBytes.length]),
    privateKeyBytes,
  ]);
  // OID 1.2.840.10045.3.1.7 (prime256v1 / P-256), wrapped in an EXPLICIT [0] tag.
  const curveOid = Buffer.from([0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]);
  const curveField = Buffer.concat([Buffer.from([0xa0, curveOid.length]), curveOid]);
  const body = Buffer.concat([version, privateKeyOctet, curveField]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

// Reproduces @turnkey/api-key-stamper's X-Stamp scheme (SIGNATURE_SCHEME_TK_API_P256)
// using only Node's built-in crypto module - no new dependency required for this.
// Every authenticated Turnkey request (reads included) must carry this header,
// signed by an API key belonging to the caller (here: our own backend-held
// organization-level API key, distinct from the end user's passkey).
export function createTurnkeyApiStamp(
  payload: unknown,
  apiPublicKeyHex: string,
  apiPrivateKeyHex: string,
): string {
  const content = JSON.stringify(payload);
  const privateKey = createPrivateKey({
    key: buildSec1PrivateKeyDer(apiPrivateKeyHex),
    format: 'der',
    type: 'sec1',
  });

  const sign = createSign('SHA256');
  sign.write(Buffer.from(content));
  sign.end();
  const signature = sign.sign(privateKey, 'hex');

  const stamp = {
    publicKey: apiPublicKeyHex,
    scheme: 'SIGNATURE_SCHEME_TK_API_P256',
    signature,
  };

  return Buffer.from(JSON.stringify(stamp)).toString('base64url');
}
