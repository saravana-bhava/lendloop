import crypto from "node:crypto";

/**
 * Signs a payload using HMAC-SHA256 with the shared secret.
 * Generates hex-encoded digest for transport in X-LendLoop-Signature header.
 */
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verifies an incoming HMAC signature using crypto.timingSafeEqual
 * to eliminate timing-attack vulnerabilities.
 */
export function verifySignature(
  payload: string,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // Support signatures with or without 'sha256=' prefix
  const cleanSignature = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  const expectedSignature = signPayload(payload, secret);

  const sigBuffer = Buffer.from(cleanSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
