const { getSupabaseAdmin } = require('../config/supabase');
const settingsRepository = require('../repositories/settingsRepository');
const { sendSuccess } = require('../utils/response');
const AppError = require('../errors/AppError');

class AdminController {
  async listUsers(req, res, next) {
    try {
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return sendSuccess(res, { users: data || [] });
    } catch (err) {
      next(err);
    }
  }

  async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['student', 'staff', 'admin'].includes(role)) {
        throw AppError.badRequest('Role must be one of: student, staff, admin');
      }

      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return sendSuccess(res, { user: data, message: `User role updated to ${role}` });
    } catch (err) {
      next(err);
    }
  }

  async getSettings(req, res, next) {
    try {
      const settings = await settingsRepository.getAllSettings();
      return sendSuccess(res, { settings });
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const { setting_key, setting_value } = req.body;
      if (!setting_key || !setting_value) {
        throw AppError.badRequest('setting_key and setting_value are required');
      }

      const updated = await settingsRepository.updateSetting(setting_key, setting_value, req.user?.id);
      return sendSuccess(res, { setting: updated, message: 'Setting updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
