import { Router } from 'express';
import { Role } from '@prisma/client';
import { participantController } from '../controllers/participant.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.PARTICIPANT));

router.get('/sell-requests', participantController.list);

export const participantRoutes = router;
