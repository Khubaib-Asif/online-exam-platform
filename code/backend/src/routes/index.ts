import { Router } from 'express';
import authRoutes from './auth.routes';
import deviceRoutes from './device.routes';
import registrationRoutes from './registration.routes';
import questionBankRoutes from './questionBank.routes';
import examBuilderRoutes from './examBuilder.routes';

const router = Router();

router.use('/', authRoutes);
router.use('/', deviceRoutes);
router.use('/', registrationRoutes);
router.use('/', questionBankRoutes);
router.use('/', examBuilderRoutes);

export default router;