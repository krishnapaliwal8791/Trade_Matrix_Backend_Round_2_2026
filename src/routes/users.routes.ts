import { Router } from 'express';
import { Role } from '@prisma/client';
import { usersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { getSellRequestSchema } from '../validators/sellRequest.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.PARTICIPANT, Role.TEAM_CAPTAIN));

router.get('/dashboard', usersController.getDashboard);
router.get('/team', usersController.getTeam);
router.get('/companies', usersController.getCompanies);
router.get('/active-news-bundle', usersController.getActiveNewsBundle);
router.get('/news-bundles/:id', usersController.getNewsBundle);
router.get('/sell-requests/:id', validate(getSellRequestSchema), usersController.getSellRequest);
router.get('/leaderboard', usersController.getLeaderboard);

export const usersRoutes = router;
