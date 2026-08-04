import { Router } from 'express';
import authRoutes from './auth.routes';
import deviceRoutes from './device.routes';

const router = Router();

router.use('/', authRoutes);
router.use('/', deviceRoutes);

export default router;