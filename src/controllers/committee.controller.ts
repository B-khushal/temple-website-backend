import { Response } from 'express';
import { CommitteeMember } from '../models/CommitteeMember';
import { AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import logger from '../config/logger';

// List Committee Members
export const getCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, status, role_category, is_active, grouped } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (role_category) filter.role_category = role_category;
    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }

    const members = await CommitteeMember.find(filter);

    const categoryOrder = [
      'CHAIRMAN',
      'GENERAL_SECRETARY',
      'TREASURER',
      'VICE_CHAIRMAN',
      'JOINT_SECRETARY',
      'ORGANISING_SECRETARY',
      'EXECUTIVE_MEMBER',
      'ADVISOR',
      'PAST_MEMBER'
    ];

    // Hierarchical in-memory sorting
    const sorted = members.sort((a: any, b: any) => {
      const aCatIdx = categoryOrder.indexOf(a.role_category || 'EXECUTIVE_MEMBER');
      const bCatIdx = categoryOrder.indexOf(b.role_category || 'EXECUTIVE_MEMBER');
      if (aCatIdx !== bCatIdx) {
        return aCatIdx - bCatIdx;
      }
      const aOrder = a.display_order ?? 0;
      const bOrder = b.display_order ?? 0;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    if (grouped === 'true') {
      const groupedData: any = {};
      categoryOrder.forEach(cat => {
        groupedData[cat] = [];
      });
      sorted.forEach((m: any) => {
        const cat = m.role_category || 'EXECUTIVE_MEMBER';
        if (!groupedData[cat]) groupedData[cat] = [];
        groupedData[cat].push(m);
      });
      res.json({ success: true, grouped: groupedData, data: groupedData, members: sorted });
      return;
    }

    res.json({ success: true, members: sorted, data: sorted });
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
    
    // Update fields from req.body using Mongoose set method
    member.set(req.body);
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

// Reorder Committee Members (Admin only)
export const reorderCommittee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      res.status(400).json({ success: false, message: 'Invalid orders data: expected array' });
      return;
    }

    const bulkOps = orders.map((item: any) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { 
          $set: { 
            display_order: item.display_order ?? item.displayOrder ?? 0,
            displayOrder: item.display_order ?? item.displayOrder ?? 0
          } 
        }
      }
    }));

    if (bulkOps.length > 0) {
      await CommitteeMember.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: 'Committee members reordered successfully' });
  } catch (error: any) {
    logger.error(`Error in reorderCommittee: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
