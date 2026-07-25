import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default {
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
