import { Response } from 'express';
import { CommitteeMember } from '../models/CommitteeMember';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import logger from '../config/logger';

// List Committee Members
export const getCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, status } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (status) filter.status = status;

    const members = await CommitteeMember.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, members, data: members });
  } catch (error: any) {
    logger.error(`Error in getCommittee: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Committee Member (Admin only)
export const createCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = new CommitteeMember(req.body);
    await member.save();

    await logActivity(req, 'CREATE_COMMITTEE_MEMBER', 'CommitteeMember', member._id.toString(), null, member.toObject());

    res.status(201).json({ success: true, member, data: member });
  } catch (error: any) {
    logger.error(`Error in createCommittee: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Committee Member (Admin only)
export const updateCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const member = await CommitteeMember.findById(id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Committee member not found' });
      return;
    }

    const original = member.toObject();
    
    // Update fields from req.body
    Object.assign(member, req.body);
    await member.save();

    await logActivity(req, 'UPDATE_COMMITTEE_MEMBER', 'CommitteeMember', id, original, member.toObject());

    res.json({ success: true, member });
  } catch (error: any) {
    logger.error(`Error in updateCommittee: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Committee Member (Admin only)
export const deleteCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const member = await CommitteeMember.findById(id);
    if (!member) {
      res.status(404).json({ success: false, message: 'Committee member not found' });
      return;
    }

    const original = member.toObject();
    await member.deleteOne();

    await logActivity(req, 'DELETE_COMMITTEE_MEMBER', 'CommitteeMember', id, original, null);

    res.json({ success: true, message: 'Committee member deleted successfully' });
  } catch (error: any) {
    logger.error(`Error in deleteCommittee: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
