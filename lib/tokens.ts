import { customAlphabet } from 'nanoid';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 32);

export function generateToken(): string {
  return nanoid();
}

export function getTokenExpiry(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  return expires;
}
