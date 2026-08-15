import { Router } from 'express';
import { Role } from '@prisma/client';
import { eventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ORGANIZER, Role.TEAM_CAPTAIN, Role.PARTICIPANT));

router.get('/', eventController.getEvent);

export const eventRoutes = router;
