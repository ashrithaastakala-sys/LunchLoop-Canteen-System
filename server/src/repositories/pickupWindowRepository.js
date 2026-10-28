const { getSupabaseClient, getSupabaseAdmin } = require('../config/supabase');

class PickupWindowRepository {
  async getUpcomingWindows() {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    let { data, error } = await supabase
      .from('pickup_windows')
      .select('*')
      .eq('is_active', true)
      .gte('ends_at', nowIso)
      .order('starts_at', { ascending: true });

    if (error) throw error;

    // If no active upcoming windows remain, automatically ensure slots relative to current time
    if (!data || data.length === 0) {
      await this.ensureUpcomingWindows();
      const res = await supabase
        .from('pickup_windows')
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true });
      data = res.data || [];
    }

    return data || [];
  }

  async ensureUpcomingWindows() {
    try {
      const admin = getSupabaseAdmin();
      const now = new Date();
      const startMinutes = Math.ceil(now.getMinutes() / 10) * 10;
      const baseTime = new Date(now);
      baseTime.setMinutes(startMinutes, 0, 0);

      const slotConfigs = [
        { offsetMin: 10, duration: 20, cap: 20 },
        { offsetMin: 30, duration: 20, cap: 25 },
        { offsetMin: 50, duration: 20, cap: 30 },
        { offsetMin: 70, duration: 20, cap: 30 },
        { offsetMin: 90, duration: 20, cap: 25 },
        { offsetMin: 110, duration: 20, cap: 20 },
      ];

      const slotIds = [
        'fa111111-1111-1111-1111-111111111101',
        'fa111111-1111-1111-1111-111111111102',
        'fa111111-1111-1111-1111-111111111103',
        'fa111111-1111-1111-1111-111111111104',
        'fa111111-1111-1111-1111-111111111105',
        'fa111111-1111-1111-1111-111111111106',
      ];

      for (let i = 0; i < slotConfigs.length; i++) {
        const cfg = slotConfigs[i];
        const start = new Date(baseTime.getTime() + cfg.offsetMin * 60000);
        const end = new Date(start.getTime() + cfg.duration * 60000);
        await admin.from('pickup_windows').upsert({
          id: slotIds[i],
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          capacity: cfg.cap,
          reserved_count: 0,
          is_active: true,
        });
      }
    } catch (e) {
      console.warn('ensureUpcomingWindows error:', e.message);
    }
  }

  async getAllWindows({ limit = 50, offset = 0 } = {}) {
    const supabase = getSupabaseClient();
    const { data, error, count } = await supabase
      .from('pickup_windows')
      .select('*', { count: 'exact' })
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { windows: data || [], total: count || 0 };
  }

  async getWindowById(id) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('pickup_windows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createWindow(windowData) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('pickup_windows')
      .insert(windowData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWindow(id, updates) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('pickup_windows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new PickupWindowRepository();
