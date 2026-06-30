import { Schema, model } from 'mongoose';

const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'general' },
    templeNameEnglish: { type: String, default: 'SRI DURGA MATA TEMPLE' },
    templeNameTelugu: { type: String, default: 'శ్రీశ్రీశ్రీ దుర్గా మాత ఆలయం' },
    morningTimings: { type: String, default: '6:00 AM - 12:00 PM' },
    eveningTimings: { type: String, default: '4:00 PM - 9:00 PM' },
    locationAddress: { type: String, default: '123 Sacred Path, Temple District, Holy City, IN 400001' },
    livestreamUrl: { type: String, default: '' },
    announcementBanner: { type: String, default: '' },
    contactEmail: { type: String, default: 'info@sridurgamatatemple.org' },
    contactPhone: { type: String, default: '+91 99999 99999' },
    introEnabled: { type: Boolean, default: true },
    introDuration: { type: Number, default: 11 },
    
    // CMS texts
    aboutIntroduction: { type: String, default: 'Sri Durga Mata Temple, Bapu Nagar is a sacred space dedicated to Maa Durga, fostering spiritual growth and cultural preservation. For over four decades, we have served as a source of peace, devotion, and community service.' },
    aboutMission: { type: String, default: 'To propagate the teachings of Sanatana Dharma, preserve our cultural heritage, and serve humanity through charitable endeavors like Annadanam and spiritual activities.' },
    aboutVision: { type: String, default: 'To build a vibrant spiritual community rooted in devotion, transparent governance, and absolute transparency in temple administration.' },
    aboutSpiritualSignificance: { type: String, default: 'Maa Durga at our temple is worshipped in her ancient Nalla Pochamma form, representing power, protection, and motherhood. The sanctum sanctorum radiates a powerful divine presence, drawing thousands of devotees daily.' },
    aboutCulturalImpact: { type: String, default: 'The temple is a cultural hub, hosting community festivals, Vedic education seminars, and musical programs that celebrate local traditions and heritage.' },
    aboutCommunityActivities: { type: String, default: 'We are committed to social service, executing daily free meal programs (Annadanam), medical camps, educational scholarships, and disaster relief programs.' },
    aboutArchitecturalSignificance: { type: String, default: 'The temple complex is designed with a blend of traditional South Indian temple architecture and modern facilities. The beautiful Shikhara and detailed carvings on the pillars tell the story of ancient scriptures.' },
  },
  {
    timestamps: true,
  }
);

export const Setting = model('Setting', SettingSchema);
export default Setting;
