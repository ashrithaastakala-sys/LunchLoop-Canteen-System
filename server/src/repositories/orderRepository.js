const { getSupabaseClient, getSupabaseAdmin } = require('../config/supabase');
const AppError = require('../errors/AppError');

class OrderRepository {
  /**
   * Executes atomic order creation RPC in PostgreSQL
   */
  async createOrderAtomic({ userId, pickupWindowId, items, notes, idempotencyKey }) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc('create_order_atomic', {
      p_user_id: userId,
      p_pickup_window_id: pickupWindowId,
      p_items: items,
      p_notes: notes,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Executes atomic cancellation RPC in PostgreSQL
   */
  async cancelOrderAtomic({ orderId, actorId, reason, cutoffMinutes }) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc('cancel_order_atomic', {
      p_order_id: orderId,
      p_actor_id: actorId,
      p_reason: reason,
      p_cutoff_minutes: cutoffMinutes,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Executes atomic status transition RPC in PostgreSQL
   */
  async updateOrderStatusAtomic({ orderId, newStatus, actorId, note }) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc('update_order_status_atomic', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_actor_id: actorId,
      p_note: note,
    });

    if (error) throw error;
    return data;
  }

  async getOrderById(orderId) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('orders')
      .select(`
        *,
        pickup_window:pickup_windows(*),
        items:order_items(*),
        status_history:order_status_events(*)
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getOrderByPublicNumber(publicNumber) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('orders')
      .select(`
        *,
        pickup_window:pickup_windows(*),
        items:order_items(*),
        status_history:order_status_events(*)
      `)
      .eq('public_order_number', publicNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async getOrdersByUser(userId, { status, limit = 20, offset = 0 } = {}) {
    const admin = getSupabaseAdmin();
    let query = admin
      .from('orders')
      .select(`
        *,
        pickup_window:pickup_windows(id, starts_at, ends_at),
        items:order_items(*)
      `, { count: 'exact' })
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { orders: data || [], total: count || 0 };
  }

  async getAllOrders({ status, pickupWindowId, search, limit = 50, offset = 0, sort = 'created_at' } = {}) {
    const admin = getSupabaseAdmin();
    let query = admin
      .from('orders')
      .select(`
        *,
        pickup_window:pickup_windows(id, starts_at, ends_at, capacity, reserved_count),
        items:order_items(*),
        user:profiles(id, display_name, email)
      `, { count: 'exact' });

    if (status) {
      if (status === 'active') {
        query = query.in('status', ['confirmed', 'preparing', 'ready']);
      } else {
        query = query.eq('status', status);
      }
    }

    if (pickupWindowId) {
      query = query.eq('pickup_window_id', pickupWindowId);
    }

    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`public_order_number.ilike.%${term}%,pickup_token.ilike.%${term}%`);
    }

    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'pickup_time') {
      query = query.order('pickup_window_id', { ascending: true }).order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { orders: data || [], total: count || 0 };
  }

  async getKitchenQueue() {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('orders')
      .select(`
        id,
        public_order_number,
        pickup_token,
        status,
        notes,
        created_at,
        pickup_window:pickup_windows(id, starts_at, ends_at),
        items:order_items(id, item_name_snapshot, quantity)
      `)
      .in('status', ['confirmed', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

module.exports = new OrderRepository();
