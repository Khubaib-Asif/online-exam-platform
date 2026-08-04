import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate); // All device routes require login

router.get('/devices', DeviceController.getDevices);
router.post('/devices', DeviceController.registerDevice);
router.post('/devices/:id/revoke', DeviceController.revokeDevice);

export default router;