import { Router } from 'express';
import * as VisitController from '../controllers/visit-route.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', VisitController.getSummary);
router.get('/suggestions', VisitController.getSuggestions);
router.get('/sequence/:id', VisitController.getSequence);
router.get('/:id/geojson', VisitController.getRouteGeoJSON);
router.post('/manual', VisitController.createManualRoute);
router.post('/:id/start', VisitController.startRoute);
router.post('/checkin', VisitController.checkin);
router.post('/checkout', VisitController.checkout);
router.post('/result', VisitController.registerResult);

export default router;
