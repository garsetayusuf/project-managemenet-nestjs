import { randomBytes } from 'crypto';

export function generateRandomString(bytes: number = 16): string {
  const buffer = randomBytes(bytes);
  return buffer.toString('base64url');
}
