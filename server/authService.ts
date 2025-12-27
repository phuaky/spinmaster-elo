import crypto from 'crypto';

export interface HashedPin {
  hash: string;
  salt: string;
}

export function hashPin(pin: string): HashedPin {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(pin + salt).digest('hex');
  return { hash, salt };
}

export function verifyPin(pin: string, storedHash: string, salt: string): boolean {
  const hash = crypto.createHash('sha256').update(pin + salt).digest('hex');
  return hash === storedHash;
}
