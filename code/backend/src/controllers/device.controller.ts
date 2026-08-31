import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { DeviceService } from '../services/device.service';
import { z } from 'zod';

const RegisterDeviceSchema = z.object({
  label: z.string().trim().max(128).optional(),
  platform: z.string().trim().max(32).optional(),
  appVersion: z.string().trim().max(32).optional(),
});

export class DeviceController {
  static async getDevices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await DeviceService.getUserDevices(req.user!.id);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  static async registerDevice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = RegisterDeviceSchema.parse(req.body);
      const device = await DeviceService.registerDevice(req.user!.id, validated);
      res.status(201).json({ data: device, message: 'Device registered successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async revokeDevice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deviceId = req.params.id as string;
      const device = await DeviceService.revokeDevice(req.user!.id, deviceId);
      res.json({ data: device, message: 'Device revoked successfully' });
    } catch (error) {
      next(error);
    }
  }
}