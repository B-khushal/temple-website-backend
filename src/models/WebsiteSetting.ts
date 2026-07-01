import { Schema, model, Document } from 'mongoose';

export interface IWebsiteSetting extends Document {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  visibilityMode: 'hide_completely' | 'disable_route_accessible';
  showOnlyLoggedIn: boolean;
  showOnlyHomepage: boolean;
  scheduleEnabled: boolean;
  scheduleStartDate?: Date | null;
  scheduleEndDate?: Date | null;
  festivalOnly: boolean;
  navaratriOnly: boolean;
  category: string;
  previewIcon: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteSettingSchema = new Schema<IWebsiteSetting>(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    visibilityMode: { type: String, enum: ['hide_completely', 'disable_route_accessible'], default: 'hide_completely' },
    showOnlyLoggedIn: { type: Boolean, default: false },
    showOnlyHomepage: { type: Boolean, default: false },
    scheduleEnabled: { type: Boolean, default: false },
    scheduleStartDate: { type: Date, default: null },
    scheduleEndDate: { type: Date, default: null },
    festivalOnly: { type: Boolean, default: false },
    navaratriOnly: { type: Boolean, default: false },
    category: { type: String, required: true },
    previewIcon: { type: String, default: 'Eye' },
  },
  {
    timestamps: true,
  }
);

export const WebsiteSetting = model<IWebsiteSetting>('WebsiteSetting', WebsiteSettingSchema);
export default WebsiteSetting;
