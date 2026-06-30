import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Donation } from '../models/Donation';
import { FinancialTransaction } from '../models/FinancialTransaction';
import { Asset } from '../models/Asset';
import { CommitteeMember } from '../models/CommitteeMember';
import { Founder } from '../models/Founder';
import { HistoryTimeline } from '../models/HistoryTimeline';
import { Gallery } from '../models/Gallery';
import { ContactMessage } from '../models/ContactMessage';
import { Event } from '../models/Event';
import { EventRegistration } from '../models/EventRegistration';
import { Setting } from '../models/Setting';
import { AuditLog } from '../models/AuditLog';

const backupDir = path.join(process.cwd(), 'backups');

const modelsMap: { [key: string]: mongoose.Model<any> } = {
  users: User,
  donations: Donation,
  transactions: FinancialTransaction,
  assets: Asset,
  committeemembers: CommitteeMember,
  founders: Founder,
  historytimelines: HistoryTimeline,
  galleries: Gallery,
  contactmessages: ContactMessage,
  events: Event,
  eventregistrations: EventRegistration,
  settings: Setting,
  auditlogs: AuditLog,
};

export async function exportDatabase() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDirName = `backup-${timestamp}`;
  const sessionDir = path.join(backupDir, sessionDirName);
  fs.mkdirSync(sessionDir);

  const results: { [key: string]: number } = {};

  for (const [key, model] of Object.entries(modelsMap)) {
    const data = await model.find({});
    const filePath = path.join(sessionDir, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    results[key] = data.length;
  }

  return {
    success: true,
    timestamp,
    backupFolder: sessionDirName,
    recordsExported: results,
  };
}

export async function restoreDatabase(backupFolderName: string) {
  const targetDir = path.join(backupDir, backupFolderName);
  if (!fs.existsSync(targetDir)) {
    return { success: false, message: 'Backup directory does not exist' };
  }

  const results: { [key: string]: number } = {};

  for (const [key, model] of Object.entries(modelsMap)) {
    const filePath = path.join(targetDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      const dataContent = fs.readFileSync(filePath, 'utf-8');
      const records = JSON.parse(dataContent);
      
      // Clear existing collection
      await model.deleteMany({});
      
      if (records.length > 0) {
        await model.insertMany(records);
      }
      
      results[key] = records.length;
    }
  }

  return {
    success: true,
    recordsRestored: results,
  };
}

export function listBackups() {
  if (!fs.existsSync(backupDir)) return [];
  return fs.readdirSync(backupDir).filter(f => f.startsWith('backup-'));
}
