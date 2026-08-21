import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireVerifiedEmail } from '../middlewares/requireVerifiedEmail';

const router = Router();

router.use(authenticate); // All device routes require login

router.get('/devices', DeviceController.getDevices);
// Device registration and revocation require the user's email to be verified
router.post('/devices', requireVerifiedEmail, DeviceController.registerDevice);
router.post('/devices/:id/revoke', requireVerifiedEmail, DeviceController.revokeDevice);

export default router;