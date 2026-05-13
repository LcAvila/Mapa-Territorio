import { Router } from 'express';
import * as controller from '../controllers/route-planning.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/cycles', requireAdmin, controller.createCycle);
router.post('/cycles/:id/distribute', requireAdmin, controller.distributeClients);
router.post('/sequences', requireAdmin, controller.generateSequence);
router.post('/sequences/:id/optimize', requireAdmin, controller.optimizeRoute);

export default router;
