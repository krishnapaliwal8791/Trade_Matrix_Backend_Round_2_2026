import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { organizerRoutes } from './organizer.routes';
import { eventRoutes } from './event.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/organizer', organizerRoutes);
router.use('/event', eventRoutes);

export const routes = router;
