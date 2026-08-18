import { Router } from 'express';
import { Role } from '@prisma/client';
import { organizerController } from '../controllers/organizer.controller';
import { eventController } from '../controllers/event.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { approveSellRequestSchema, rejectSellRequestSchema, getSellRequestSchema } from '../validators/sellRequest.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ORGANIZER));

router.post('/import-round1', organizerController.importRound1);
router.post('/start-event', eventController.startEvent);
router.get('/news-bundles', organizerController.getNewsBundles);
router.post('/news-bundles/:id/reveal', organizerController.revealNewsBundle);
router.get('/markets', organizerController.getMarkets);
router.post('/apply-prices', organizerController.applyPrices);
router.get('/teams', organizerController.getTeams);

router.get('/sell-requests', organizerController.getSellRequests);
router.get('/sell-requests/:id', validate(getSellRequestSchema), organizerController.getSellRequest);
router.post('/sell-requests/:id/approve', validate(approveSellRequestSchema), organizerController.approveSellRequest);
router.post('/sell-requests/:id/reject', validate(rejectSellRequestSchema), organizerController.rejectSellRequest);

export const organizerRoutes = router;
