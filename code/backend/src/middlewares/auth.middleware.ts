import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/security';
import { AppError } from '../utils/appError';
import prisma from '../lib/prisma';

export type UserRole = 'OWNER' | 'TEACHER' | 'STUDENT' | 'PROCTOR';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = verifyToken(token);
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, role: true, status: true },
        });

        if (!user || user.status !== 'ACTIVE') {
            return next(new AppError(401, 'Invalid or disabled account', 'AUTH_INVALID'));
        }

        req.user = { id: user.id, email: user.email, role: user.role as UserRole };
        next();
    } catch (error) {
        return next(new AppError(401, 'Invalid or expired token', 'AUTH_INVALID'));
    }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return next(new AppError(403, 'Forbidden: Insufficient permissions', 'FORBIDDEN'));
        }
        next();
    };
};