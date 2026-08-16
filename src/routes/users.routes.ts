import { Router } from 'express';
import { Role } from '@prisma/client';
import { usersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.PARTICIPANT, Role.TEAM_CAPTAIN));

router.get('/active-news-bundle', usersController.getActiveNewsBundle);
router.get('/news-bundles/:id', usersController.getNewsBundle);

export const usersRoutes = router;
