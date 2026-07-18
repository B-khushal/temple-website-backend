import { Router, Response } from 'express';
import { Founder } from '../models/Founder';
import { authenticateJWT, requireRoles, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';

const router = Router();

// Public route to view founders
router.get('/', async (req, res) => {
  try {
    const founders = await Founder.find().sort({ order: 1 });
    res.json({ success: true, founders, data: founders });
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
      const founder = new Founder({
        ...req.body,
        recordedBy: req.user?.id,
      });
      await founder.save();
      await logActivity(req, 'CREATE_FOUNDER', 'Founder', founder._id.toString(), null, founder.toObject());
      res.status(201).json({ success: true, founder, data: founder });
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
      const founder = await Founder.findById(id);
      if (!founder) {
        res.status(404).json({ success: false, message: 'Founder not found' });
        return;
      }
      const original = founder.toObject();
      Object.assign(founder, req.body);
      await founder.save();
      await logActivity(req, 'UPDATE_FOUNDER', 'Founder', id, original, founder.toObject());
      res.json({ success: true, founder, data: founder });
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
      const founder = await Founder.findById(id);
      if (!founder) {
        res.status(404).json({ success: false, message: 'Founder not found' });
        return;
      }
      const original = founder.toObject();
      await founder.deleteOne();
      await logActivity(req, 'DELETE_FOUNDER', 'Founder', id, original, null);
      res.json({ success: true, message: 'Founder deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
