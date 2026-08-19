import { Router } from 'express';
import { Role } from '@prisma/client';
import { teamCaptainController } from '../controllers/teamCaptain.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { createSellRequestSchema, acceptSellRequestSchema, rejectSellRequestSchema } from '../validators/sellRequest.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.TEAM_CAPTAIN));

router.post('/sell-requests', validate(createSellRequestSchema), teamCaptainController.create);
router.get('/sell-requests', teamCaptainController.listOutgoing);
router.get('/sell-requests/incoming', teamCaptainController.listIncoming);
router.post('/sell-requests/:id/accept', validate(acceptSellRequestSchema), teamCaptainController.accept);
router.post('/sell-requests/:id/reject', validate(rejectSellRequestSchema), teamCaptainController.reject);

router.get('/teams', teamCaptainController.listTeams);

export const teamCaptainRoutes = router;
