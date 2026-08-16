import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { organizerRoutes } from './organizer.routes';
import { eventRoutes } from './event.routes';
import { usersRoutes } from './users.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/organizer', organizerRoutes);
router.use('/event', eventRoutes);
router.use('/users', usersRoutes);

export const routes = router;
