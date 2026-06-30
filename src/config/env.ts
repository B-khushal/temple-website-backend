import dotenv from 'dotenv';
import path from 'path';

// Load env variables immediately during module import phase
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();
