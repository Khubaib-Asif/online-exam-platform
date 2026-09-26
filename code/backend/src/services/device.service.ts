import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import crypto from 'crypto';

export class DeviceService {
  // 1. Get User Devices (Telegram-style: returns active devices only, deduplicates fingerprints, separates history)
  static async getUserDevices(userId: string, currentFingerprintOrId?: string) {
    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        label: true,
        platform: true,
        appVersion: true,
        status: true,
        lastSeenAt: true,
        registeredAt: true,
        revokedAt: true,
        fingerprintHash: true,
      },
    });

    const activeList = devices.filter((d) => d.status === 'ACTIVE');
    const revokedList = devices.filter((d) => d.status === 'REVOKED');

    // Deduplicate active devices by fingerprintHash if duplicates existed
    const uniqueActive: typeof activeList = [];
    const seenFingerprints = new Set<string>();

    for (const d of activeList) {
      if (!seenFingerprints.has(d.fingerprintHash)) {
        seenFingerprints.add(d.fingerprintHash);
        uniqueActive.push(d);
      } else {
        // Mark stale duplicate as revoked in background
        prisma.device.update({
          where: { id: d.id },
          data: { status: 'REVOKED', revokedAt: new Date() },
        }).catch(() => {});
      }
    }

    const formattedActive = uniqueActive.map((device, index) => {
      const isCurrent = currentFingerprintOrId
        ? device.id === currentFingerprintOrId || device.fingerprintHash === currentFingerprintOrId
        : index === 0;

      return {
        id: device.id,
        name: device.label || `${device.platform} Enclave`,
        os: device.platform,
        appVersion: device.appVersion,
        lastSeen: device.lastSeenAt,
        registeredAt: device.registeredAt,
        isActive: true,
        isCurrent,
      };
    });

    const formattedRevoked = revokedList.map((device) => ({
      id: device.id,
      name: device.label || `${device.platform} Device`,
      os: device.platform,
      appVersion: device.appVersion,
      lastSeen: device.lastSeenAt,
      registeredAt: device.registeredAt,
      revokedAt: device.revokedAt,
      isActive: false,
      isCurrent: false,
    }));

    return {
      devices: formattedActive,
      activeDevices: formattedActive,
      revokedDevices: formattedRevoked,
      activeCount: formattedActive.length,
      maxAllowed: 2,
    };
  }

  // 2. Register a New Device (Enforces 2 Active Device Cap & Fingerprint Deduplication)
  static async registerDevice(userId: string, data: {
    label?: string;
    platform?: string;
    appVersion?: string;
    fingerprintHash?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Lock user's device namespace to prevent race conditions
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;

      const fingerprint = data.fingerprintHash || crypto.randomBytes(32).toString('hex');

      // Check if a device with this fingerprint already exists for this user
      const existingDevice = await tx.device.findFirst({
        where: { userId, fingerprintHash: fingerprint },
      });

      if (existingDevice) {
        // If already active, update lastSeenAt and return
        if (existingDevice.status === 'ACTIVE') {
          return tx.device.update({
            where: { id: existingDevice.id },
            data: {
              lastSeenAt: new Date(),
              label: data.label || existingDevice.label,
              platform: data.platform || existingDevice.platform,
              appVersion: data.appVersion || existingDevice.appVersion,
            },
          });
        }

        // If previously revoked, check active count before reactivating
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

        return tx.device.update({
          where: { id: existingDevice.id },
          data: {
            status: 'ACTIVE',
            revokedAt: null,
            lastSeenAt: new Date(),
            label: data.label || existingDevice.label,
          },
        });
      }

      // New device: check active count
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

      const newDevice = await tx.device.create({
        data: {
          userId,
          label: data.label || 'Windows Desktop Enclave',
          platform: data.platform || 'Electron',
          appVersion: data.appVersion || '1.0.0',
          fingerprintHash: fingerprint,
          publicKeyThumbprint: keyThumbprint,
          publicKeyJwkEncrypted: 'desktop-secure-enclave',
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

  // 4. Revoke All Other Devices (Telegram-style Terminate All Other Sessions)
  static async revokeAllOtherDevices(userId: string, currentDeviceId?: string) {
    const devices = await prisma.device.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    const toRevoke = devices.filter((d) => d.id !== currentDeviceId);
    const ids = toRevoke.map((d) => d.id);

    if (ids.length > 0) {
      await prisma.device.updateMany({
        where: { id: { in: ids } },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
    }

    return { revokedCount: ids.length, success: true };
  }
}