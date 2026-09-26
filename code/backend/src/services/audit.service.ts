import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';

export interface AuditLogQueryOptions {
  search?: string;
  limit?: number;
  offset?: number;
  resourceType?: string;
  action?: string;
}

export class AuditService {
  /**
   * Query immutable audit trail records with actor identity and cryptographic verification hash
   */
  static async getAuditLogs(options: AuditLogQueryOptions = {}) {
    const { search, limit = 50, offset = 0, resourceType, action } = options;

    const whereClause: any = {};

    if (resourceType) {
      whereClause.resourceType = resourceType;
    }

    if (action) {
      whereClause.action = { contains: action, mode: 'insensitive' };
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { resourceType: { contains: q, mode: 'insensitive' } },
        { resourceId: { contains: q, mode: 'insensitive' } },
        { sessionId: { contains: q, mode: 'insensitive' } },
        {
          actor: {
            email: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: whereClause,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              role: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.auditEvent.count({ where: whereClause }),
    ]);

    const formattedEvents = events.map((evt: any) => {
      const actorEmail = evt.actor?.email || (evt.actorId ? `system-worker (${evt.actorId.slice(0, 8)})` : 'system-gate-worker');
      const actorRole = evt.actor?.role || 'SYSTEM';
      const targetRef = evt.resourceId
        ? `${evt.resourceType.toLowerCase()}:${evt.resourceId}`
        : evt.sessionId
        ? `session:${evt.sessionId}`
        : `${evt.resourceType.toLowerCase()}:global`;

      const hashShort = evt.recordHash ? `sha256:${evt.recordHash.slice(0, 12)}...` : 'sha256:none';

      return {
        id: evt.id,
        timestamp: evt.createdAt.toISOString(),
        actor: actorEmail,
        role: actorRole,
        action: evt.action,
        targetRef,
        hash: hashShort,
        fullHash: evt.recordHash,
        metadata: evt.metadata,
      };
    });

    return {
      events: formattedEvents,
      total,
      limit,
      offset,
    };
  }
}

