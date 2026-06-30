import { Response } from 'express';
import { ContactMessage } from '../models/ContactMessage';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import logger from '../config/logger';

// List messages (Admin only)
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, messages, data: messages });
  } catch (error: any) {
    logger.error(`Error in getMessages: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Submit contact message (Public endpoint)
export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = new ContactMessage(req.body);
    await message.save();

    logger.info(`📧 New contact message received from ${message.name} (${message.email})`);

    res.status(201).json({ success: true, message: 'Message sent successfully.' });
  } catch (error: any) {
    logger.error(`Error in createMessage: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update message status (Admin only)
export const updateMessageStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const message = await ContactMessage.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    const original = message.toObject();
    message.status = status;
    await message.save();

    await logActivity(req, 'UPDATE_CONTACT_STATUS', 'ContactMessage', id, original, message.toObject());

    res.json({ success: true, message });
  } catch (error: any) {
    logger.error(`Error in updateMessageStatus: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
