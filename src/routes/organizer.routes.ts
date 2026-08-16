import { Router } from 'express';
import { Role } from '@prisma/client';
import { organizerController } from '../controllers/organizer.controller';
import { eventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ORGANIZER));

router.post('/import-round1', organizerController.importRound1);
router.post('/start-event', eventController.startEvent);
router.get('/news-bundles', organizerController.getNewsBundles);

export const organizerRoutes = router;
