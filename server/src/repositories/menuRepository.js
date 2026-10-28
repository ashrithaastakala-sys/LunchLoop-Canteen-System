const { getSupabaseClient, getSupabaseAdmin } = require('../config/supabase');
const AppError = require('../errors/AppError');

class MenuRepository {
  async getCategories() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getMenuItems({ categoryId, isAvailableOnly = false, search, vegetarianOnly, maxPrice, sort = 'name' }) {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('menu_items')
      .select(`
        *,
        category:menu_categories(id, name, slug)
      `);

    if (isAvailableOnly) {
      query = query.eq('is_available', true).gt('available_quantity', 0);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (vegetarianOnly) {
      query = query.eq('is_vegetarian', true);
    }

    if (maxPrice && !isNaN(maxPrice)) {
      query = query.lte('price', Number(maxPrice));
    }

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'prep_time') {
      query = query.order('prep_time_minutes', { ascending: true });
    } else {
      query = query.order('name', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getMenuItemById(id) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        category:menu_categories(id, name, slug)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async createMenuItem(data) {
    const admin = getSupabaseAdmin();
    const { data: created, error } = await admin
      .from('menu_items')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  async updateMenuItem(id, updates) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStock(id, newQuantity, actorId, reason = 'Manual staff stock adjustment') {
    const admin = getSupabaseAdmin();

    // Fetch existing item to calculate delta
    const current = await this.getMenuItemById(id);
    if (!current) throw AppError.notFound(`Menu item with ID ${id} not found`);

    const delta = newQuantity - current.available_quantity;
    const isAvailable = newQuantity > 0;

    // Update item stock
    const { data: updated, error: itemError } = await admin
      .from('menu_items')
      .update({
        available_quantity: newQuantity,
        is_available: isAvailable,
      })
      .eq('id', id)
      .select()
      .single();

    if (itemError) throw itemError;

    // Record inventory event
    await admin.from('inventory_events').insert({
      menu_item_id: id,
      actor_id: actorId || null,
      quantity_delta: delta,
      event_type: delta >= 0 ? 'restock' : 'manual_adjustment',
      reason,
    });

    return updated;
  }

  async updateAvailability(id, isAvailable) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = new MenuRepository();
