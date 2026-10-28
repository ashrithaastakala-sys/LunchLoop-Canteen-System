const path = require('path');
const dotenv = require('dotenv');

const initialNodeEnv = process.env.NODE_ENV;
// Load environment variables from .env file at project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
if (initialNodeEnv) {
  process.env.NODE_ENV = initialNodeEnv;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  campusTimezone: process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata',
  cancellationCutoffMinutes: parseInt(process.env.CANCELLATION_CUTOFF_MINUTES || '10', 10),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '150', 10),
  },
  isSupabaseConfigured() {
    return Boolean(this.supabase.url && (this.supabase.anonKey || this.supabase.serviceRoleKey));
  },
};

module.exports = config;
