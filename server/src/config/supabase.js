const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = ws;
}
const config = require('./env');
const AppError = require('../errors/AppError');

let supabaseClient = null;
let supabaseAdmin = null;

if (config.isSupabaseConfigured()) {
  try {
    const supabaseKey = config.supabase.anonKey || config.supabase.serviceRoleKey;
    supabaseClient = createClient(config.supabase.url, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (config.supabase.serviceRoleKey) {
      supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } else {
      // Fallback to anon client if service role not provided
      supabaseAdmin = supabaseClient;
    }
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
  }
}

/**
 * Returns the active Supabase client or throws a descriptive AppError if unconfigured.
 */
function getSupabaseClient(req = null) {
  if (!config.isSupabaseConfigured() || !supabaseClient) {
    throw new AppError(
      'Supabase is not configured. Please supply SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.',
      503,
      'DATABASE_NOT_CONFIGURED',
      [{ step: 'Create a Supabase project at https://supabase.com' }, { step: 'Apply migrations in supabase/migrations/' }, { step: 'Populate .env with SUPABASE_URL and SUPABASE_ANON_KEY' }]
    );
  }

  // If a request with an authorization token is passed, create an authenticated client context
  if (req && req.headers && req.headers.authorization) {
    const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
    if (token) {
      return createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    }
  }

  return supabaseClient;
}

/**
 * Returns the privileged Supabase Admin client for server-side transactions & role checks.
 */
function getSupabaseAdmin() {
  if (!config.isSupabaseConfigured() || !supabaseAdmin) {
    throw new AppError(
      'Supabase is not configured. Please supply SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.',
      503,
      'DATABASE_NOT_CONFIGURED',
      [{ step: 'Create a Supabase project at https://supabase.com' }, { step: 'Apply migrations in supabase/migrations/' }, { step: 'Populate .env with credentials' }]
    );
  }
  return supabaseAdmin;
}

module.exports = {
  supabaseClient,
  supabaseAdmin,
  getSupabaseClient,
  getSupabaseAdmin,
};
