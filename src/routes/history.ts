import { Router, Response } from 'express';
import { HistoryTimeline } from '../models/HistoryTimeline';
import { authenticateJWT, requireRoles, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';

const router = Router();

// Public route to view timeline
router.get('/', async (req, res) => {
  try {
    const timeline = await HistoryTimeline.find().sort({ order: 1, year: 1 });
    res.json({ success: true, timeline });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Administrative routes
router.post(
  '/', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  async (req: AuthRequest, res: Response) => {
    try {
      const timeline = new HistoryTimeline({
        ...req.body,
        recordedBy: req.user?.id,
      });
      await timeline.save();
      await logActivity(req, 'CREATE_HISTORY_TIMELINE', 'HistoryTimeline', timeline._id.toString(), null, timeline.toObject());
      res.status(201).json({ success: true, timeline });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin', 'Content Manager']), 
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const timeline = await HistoryTimeline.findById(id);
      if (!timeline) {
        res.status(404).json({ success: false, message: 'Timeline item not found' });
        return;
      }
      const original = timeline.toObject();
      Object.assign(timeline, req.body);
      await timeline.save();
      await logActivity(req, 'UPDATE_HISTORY_TIMELINE', 'HistoryTimeline', id, original, timeline.toObject());
      res.json({ success: true, timeline });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.delete(
  '/:id', 
  authenticateJWT, 
  requireRoles(['Super Admin']), 
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const timeline = await HistoryTimeline.findById(id);
      if (!timeline) {
        res.status(404).json({ success: false, message: 'Timeline item not found' });
        return;
      }
      const original = timeline.toObject();
      await timeline.deleteOne();
      await logActivity(req, 'DELETE_HISTORY_TIMELINE', 'HistoryTimeline', id, original, null);
      res.json({ success: true, message: 'Timeline item deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
