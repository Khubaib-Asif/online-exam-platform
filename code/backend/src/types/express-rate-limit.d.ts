declare module 'express-rate-limit' {
  import { RequestHandler } from 'express';

  export interface Options {
    windowMs?: number;
    max?: number | ((req: any, res: any) => number | Promise<number>);
    message?: any;
    statusCode?: number;
    standardHeaders?: boolean | 'draft-6' | 'draft-7';
    legacyHeaders?: boolean;
    keyGenerator?: (req: any, res: any) => string;
    skip?: (req: any, res: any) => boolean | Promise<boolean>;
    handler?: (req: any, res: any, next: any, options: any) => any;
  }

  export function rateLimit(options?: Options): RequestHandler;
  export default rateLimit;
}
