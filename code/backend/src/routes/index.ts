import { Router } from 'express';
import authRoutes from './auth.routes';
import deviceRoutes from './device.routes';
import registrationRoutes from './registration.routes';
import questionBankRoutes from './questionBank.routes';
import examBuilderRoutes from './examBuilder.routes';
import gateRoutes from './gate.routes';
import sessionRoutes from './session.routes';
import proctoringRoutes from './proctoring.routes';
import gradingRoutes from './grading.routes';

const router = Router();

router.use('/', authRoutes);
router.use('/', deviceRoutes);
router.use('/', registrationRoutes);
router.use('/', questionBankRoutes);
router.use('/', examBuilderRoutes);
router.use('/', gateRoutes);
router.use('/', sessionRoutes);
router.use('/', proctoringRoutes);
router.use('/', gradingRoutes);

export default router;