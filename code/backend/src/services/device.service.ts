import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import crypto from 'crypto';

export class DeviceService {
  // 1. Get User Devices (Returns max 2 active devices, flags `isCurrent`)
  static async getUserDevices(userId: string, currentDeviceId?: string) {
    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { registeredAt: 'desc' },
      select: {
        id: true,
        label: true,
        platform: true,
        appVersion: true,
        status: true,
        lastSeenAt: true,
        registeredAt: true,
      },
    });

    const activeCount = devices.filter((d) => d.status === 'ACTIVE').length;

    const formattedDevices = devices.map((device) => ({
      id: device.id,
      name: device.label || `${device.platform} Device`,
      os: device.platform,
      lastSeen: device.lastSeenAt,
      isActive: device.status === 'ACTIVE',
      isCurrent: currentDeviceId ? device.id === currentDeviceId : false,
    }));

    return {
      devices: formattedDevices,
      activeCount,
      maxAllowed: 2,
    };
  }

  // 2. Register a New Device (Enforces 2 Active Device Cap)
  static async registerDevice(userId: string, data: {
    label?: string;
    platform?: string;
    appVersion?: string;
    fingerprintHash?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Lock user's device namespace to prevent race conditions
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;

      const activeCount = await tx.device.count({
        where: { userId, status: 'ACTIVE' },
      });

      if (activeCount >= 2) {
        throw new AppError(
          400,
          'Device limit reached (Maximum 2 active devices allowed). Please revoke an existing device first.',
          'DEVICE_LIMIT_EXCEEDED'
        );
      }

      const keyThumbprint = crypto.randomBytes(16).toString('hex');
      const fingerprint = data.fingerprintHash || crypto.randomBytes(32).toString('hex');

      const newDevice = await tx.device.create({
        data: {
          userId,
          label: data.label || 'Web Device',
          platform: data.platform || 'Web',
          appVersion: data.appVersion || '1.0.0',
          fingerprintHash: fingerprint,
          publicKeyThumbprint: keyThumbprint,
          publicKeyJwkEncrypted: 'web-managed-key',
          status: 'ACTIVE',
        },
      });

      return newDevice;
    });
  }

  // 3. Revoke Device
  static async revokeDevice(userId: string, deviceId: string) {
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new AppError(404, 'Device not found', 'DEVICE_NOT_FOUND');
    }

    if (device.status === 'REVOKED') {
      throw new AppError(400, 'Device is already revoked', 'DEVICE_ALREADY_REVOKED');
    }

    // Check if device is attached to an active exam session
    const activeSession = await prisma.examSession.findFirst({
      where: {
        deviceId,
        status: { in: ['ACTIVE', 'PAUSED_RECONNECT'] },
      },
    });

    if (activeSession) {
      throw new AppError(400, 'Cannot revoke a device attached to an active exam session', 'DEVICE_IN_USE');
    }

    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });

    return updatedDevice;
  }
}