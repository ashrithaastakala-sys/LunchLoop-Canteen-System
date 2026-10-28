const { getSupabaseClient, getSupabaseAdmin } = require('../config/supabase');
const settingsRepository = require('../repositories/settingsRepository');
const { sendSuccess } = require('../utils/response');
const AppError = require('../errors/AppError');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw AppError.badRequest('Email and password are required');
      }
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email).trim().toLowerCase(),
        password: String(password),
      });

      if (error) throw AppError.unauthorized(error.message);

      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return sendSuccess(res, {
        token: data.session.access_token,
        user: profile || { id: data.user.id, email: data.user.email, role: 'student', display_name: data.user.email.split('@')[0] },
      });
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const { email, password, display_name } = req.body;
      if (!email || !password || !display_name) {
        throw AppError.badRequest('Email, password, and display name are required');
      }
      if (password.length < 6) {
        throw AppError.badRequest('Password must be at least 6 characters');
      }

      const admin = getSupabaseAdmin();
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true,
        user_metadata: { full_name: String(display_name).trim() }
      });

      if (authError) throw AppError.badRequest(authError.message);

      const { data: profile } = await admin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          display_name: String(display_name).trim(),
          email: String(email).trim().toLowerCase(),
          role: 'student'
        })
        .select()
        .single();

      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: String(email).trim().toLowerCase(),
        password: String(password),
      });

      return sendSuccess(res, {
        token: sessionData?.session?.access_token,
        user: profile,
        message: 'Registration successful!'
      }, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  async demoLogin(req, res, next) {
    try {
      const { role = 'student' } = req.body;
      const emailMap = {
        student: 'student@lunchloop.edu',
        staff: 'staff@lunchloop.edu',
        admin: 'admin@lunchloop.edu',
      };
      const email = emailMap[role] || emailMap.student;
      const supabase = getSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'Password123!',
      });

      if (error) throw AppError.unauthorized(error.message);

      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return sendSuccess(res, {
        token: data.session.access_token,
        user: profile || { id: data.user.id, email: data.user.email, role }
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const admin = getSupabaseAdmin();
      const { data: profile, error } = await admin
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .single();

      if (error) {
        return sendSuccess(res, { user: req.user });
      }

      return sendSuccess(res, { user: profile });
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req, res, next) {
    try {
      const { display_name, phone } = req.body;
      const updates = {};

      if (display_name && typeof display_name === 'string') {
        updates.display_name = display_name.trim().substring(0, 80);
      }
      if (phone && typeof phone === 'string') {
        updates.phone = phone.trim().substring(0, 20);
      }

      if (req.body.role) {
        throw AppError.forbidden('Students cannot modify their own system role');
      }

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) throw error;
      return sendSuccess(res, { user: data, message: 'Profile updated' });
    } catch (err) {
      next(err);
    }
  }

  async getPublicCanteenInfo(req, res, next) {
    try {
      let info = null;
      let rules = null;
      try {
        info = await settingsRepository.getSetting('canteen_info');
        rules = await settingsRepository.getSetting('order_rules');
      } catch (dbErr) {
        // Safe fallback
      }

      return sendSuccess(res, {
        canteen: info || {
          name: 'Campus Central Canteen',
          campus: 'College of Engineering & Technology',
          location: 'Student Activity Center, Ground Floor',
          operating_hours: '08:00 AM - 06:30 PM',
          peak_hours: '12:30 PM - 02:00 PM',
          contact_phone: '+91 98765 43210',
          contact_email: 'canteen@campus.edu',
          payment_policy: 'Pay upon pickup at Counter #2 or online tokens',
        },
        rules: rules || {
          cancellation_cutoff_minutes: 10,
          max_items_per_order: 10,
          max_quantity_per_item: 10,
          default_window_capacity: 25,
          is_preordering_active: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
