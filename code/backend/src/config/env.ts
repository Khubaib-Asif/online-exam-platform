import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32).default('super-secret-default-jwt-key-min-32-chars!'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().default(900), // 15 minutes
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().default(604800), // 7 days
  BOOTSTRAP_SECRET: z.string().min(16).optional().default('default-bootstrap-secret-change-me!'),
  
  // Email & SMTP Configuration
  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('noreply@onlineexamplatform.com'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

export const env = EnvSchema.parse(process.env);