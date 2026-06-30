import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { eventSchema, registrationSchema } from '../validators/event.validator';

const router = Router();

// Public routes
router.get('/', eventController.getEvents);
router.post('/:id/register', validateRequest(registrationSchema), eventController.registerForEvent);

// Administrative routes
router.post(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  validateRequest(eventSchema), 
  eventController.createEvent
);

router.put(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  validateRequest(eventSchema), 
  eventController.updateEvent
);

router.delete(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  eventController.deleteEvent
);

router.get(
  '/:id/registrations',
  authenticateJWT,
  requireRoles(['Super Admin', 'Content Manager']),
  eventController.getEventRegistrations
);

router.put(
  '/registrations/:id',
  authenticateJWT,
  requireRoles(['Super Admin', 'Content Manager']),
  eventController.updateRegistrationStatus
);

export default router;
