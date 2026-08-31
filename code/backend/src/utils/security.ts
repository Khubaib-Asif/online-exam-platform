import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
  tokenId: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (userId: string, role: string, isEmailVerified: boolean = false): { token: string; tokenId: string } => {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    { sub: userId, role, jti: tokenId, isEmailVerified },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS }
  );
  return { token, tokenId };
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, env.JWT_SECRET);
};

export const sha256 = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};