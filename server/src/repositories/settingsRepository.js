const { getSupabaseClient, getSupabaseAdmin } = require('../config/supabase');

class SettingsRepository {
  async getSetting(key) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('setting_key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? data.setting_value : null;
  }

  async getAllSettings() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('*');

    if (error) throw error;
    const settings = {};
    (data || []).forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    return settings;
  }

  async updateSetting(key, value, actorId) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('app_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_by: actorId || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' })
      .select()
      .single();

    if (error) throw error;
    return data.setting_value;
  }
}

module.exports = new SettingsRepository();
