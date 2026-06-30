import { Response } from 'express';
import { Event } from '../models/Event';
import { EventRegistration } from '../models/EventRegistration';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import logger from '../config/logger';

// List Events
export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { upcoming } = req.query;
    const filter: any = {};

    if (upcoming === 'true') {
      filter.endDate = { $gte: new Date() };
    }

    const events = await Event.find(filter).sort({ startDate: 1 });
    res.json({ success: true, events, data: events });
  } catch (error: any) {
    logger.error(`Error in getEvents: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Event
export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = new Event({
      ...req.body,
      recordedBy: req.user?.id,
    });
    await event.save();

    await logActivity(req, 'CREATE_EVENT', 'Event', event._id.toString(), null, event.toObject());

    res.status(201).json({ success: true, event, data: event });
  } catch (error: any) {
    logger.error(`Error in createEvent: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Event
export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const original = event.toObject();
    Object.assign(event, req.body);
    await event.save();

    await logActivity(req, 'UPDATE_EVENT', 'Event', id, original, event.toObject());

    res.json({ success: true, event });
  } catch (error: any) {
    logger.error(`Error in updateEvent: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Event
export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    const original = event.toObject();
    
    // Delete event and registrations associated with it
    await event.deleteOne();
    await EventRegistration.deleteMany({ eventId: id });

    await logActivity(req, 'DELETE_EVENT', 'Event', id, original, null);

    res.json({ success: true, message: 'Event and associated registrations deleted successfully' });
  } catch (error: any) {
    logger.error(`Error in deleteEvent: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// RSVP for an Event
export const registerForEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params; // Event ID

  try {
    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (!event.registrationEnabled) {
      res.status(400).json({ success: false, message: 'RSVP registrations are disabled for this event.' });
      return;
    }

    const registration = new EventRegistration({
      ...req.body,
      eventId: id,
    });
    await registration.save();

    await logActivity(req, 'EVENT_RSVP_SUBMIT', 'EventRegistration', registration._id.toString(), null, registration.toObject());

    res.status(201).json({ success: true, registration });
  } catch (error: any) {
    logger.error(`Error in registerForEvent: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// List registrations for an event (Admin / Content Manager)
export const getEventRegistrations = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params; // Event ID

  try {
    const registrations = await EventRegistration.find({ eventId: id }).sort({ createdAt: -1 });
    res.json({ success: true, registrations, data: registrations });
  } catch (error: any) {
    logger.error(`Error in getEventRegistrations: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Registration status (e.g. Check In)
export const updateRegistrationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params; // Registration ID

  try {
    const registration = await EventRegistration.findById(id);
    if (!registration) {
      res.status(404).json({ success: false, message: 'Registration not found' });
      return;
    }

    const original = registration.toObject();
    Object.assign(registration, req.body);
    await registration.save();

    await logActivity(req, 'UPDATE_RSVP_STATUS', 'EventRegistration', id, original, registration.toObject());

    res.json({ success: true, registration });
  } catch (error: any) {
    logger.error(`Error in updateRegistrationStatus: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
