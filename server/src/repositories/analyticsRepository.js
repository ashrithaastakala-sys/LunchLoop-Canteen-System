const { getSupabaseAdmin } = require('../config/supabase');

class AnalyticsRepository {
  async getOverviewStats() {
    const admin = getSupabaseAdmin();

    // Fetch today's order metrics
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select('id, status, subtotal, created_at, cancelled_at, collected_at');

    if (ordersError) throw ordersError;

    const totalOrders = orders ? orders.length : 0;
    const confirmedCount = orders ? orders.filter(o => o.status === 'confirmed').length : 0;
    const preparingCount = orders ? orders.filter(o => o.status === 'preparing').length : 0;
    const readyCount = orders ? orders.filter(o => o.status === 'ready').length : 0;
    const collectedCount = orders ? orders.filter(o => o.status === 'collected').length : 0;
    const cancelledCount = orders ? orders.filter(o => o.status === 'cancelled').length : 0;

    const activeQueueCount = confirmedCount + preparingCount + readyCount;
    const cancellationRate = totalOrders > 0 ? Number(((cancelledCount / totalOrders) * 100).toFixed(1)) : 0;

    const totalRevenue = orders
      ? orders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + Number(o.subtotal || 0), 0)
      : 0;

    // Fetch low stock items count & sold out items count
    const { data: menuItems, error: itemsError } = await admin
      .from('menu_items')
      .select('id, name, available_quantity, low_stock_threshold, is_available');

    if (itemsError) throw itemsError;

    const soldOutCount = menuItems ? menuItems.filter(i => !i.is_available || i.available_quantity === 0).length : 0;
    const lowStockCount = menuItems ? menuItems.filter(i => i.is_available && i.available_quantity > 0 && i.available_quantity <= i.low_stock_threshold).length : 0;

    return {
      total_orders: totalOrders,
      active_queue_count: activeQueueCount,
      confirmed_count: confirmedCount,
      preparing_count: preparingCount,
      ready_count: readyCount,
      collected_count: collectedCount,
      cancelled_count: cancelledCount,
      cancellation_rate_percent: cancellationRate,
      total_revenue_inr: Number(totalRevenue.toFixed(2)),
      sold_out_count: soldOutCount,
      low_stock_count: lowStockCount,
      is_synthetic_demonstration_dataset: true,
    };
  }

  async getHourlyDemand() {
    const admin = getSupabaseAdmin();
    const { data: orders, error } = await admin
      .from('orders')
      .select('created_at, status');

    if (error) throw error;

    // Group into 24-hour buckets
    const hourBuckets = {};
    for (let h = 8; h <= 18; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      hourBuckets[label] = { hour: label, total_orders: 0, completed: 0, cancelled: 0 };
    }

    if (orders) {
      orders.forEach(order => {
        const d = new Date(order.created_at);
        const h = d.getHours();
        const label = `${h.toString().padStart(2, '0')}:00`;
        if (hourBuckets[label]) {
          hourBuckets[label].total_orders += 1;
          if (order.status === 'collected') hourBuckets[label].completed += 1;
          if (order.status === 'cancelled') hourBuckets[label].cancelled += 1;
        }
      });
    }

    return Object.values(hourBuckets);
  }

  async getTopOrderedItems(limit = 10) {
    const admin = getSupabaseAdmin();
    const { data: items, error } = await admin
      .from('order_items')
      .select('menu_item_id, item_name_snapshot, quantity, line_total');

    if (error) throw error;

    const itemMap = new Map();

    if (items) {
      items.forEach(item => {
        const current = itemMap.get(item.item_name_snapshot) || {
          item_name: item.item_name_snapshot,
          total_quantity_ordered: 0,
          total_revenue: 0,
        };
        current.total_quantity_ordered += Number(item.quantity);
        current.total_revenue += Number(item.line_total);
        itemMap.set(item.item_name_snapshot, current);
      });
    }

    const sorted = Array.from(itemMap.values())
      .sort((a, b) => b.total_quantity_ordered - a.total_quantity_ordered)
      .slice(0, limit);

    return sorted;
  }

  async getPickupWindowDemand() {
    const admin = getSupabaseAdmin();
    const { data: windows, error } = await admin
      .from('pickup_windows')
      .select('id, starts_at, ends_at, capacity, reserved_count, is_active')
      .order('starts_at', { ascending: true });

    if (error) throw error;

    return (windows || []).map(w => ({
      window_id: w.id,
      starts_at: w.starts_at,
      ends_at: w.ends_at,
      capacity: w.capacity,
      reserved_count: w.reserved_count,
      occupancy_percent: w.capacity > 0 ? Math.round((w.reserved_count / w.capacity) * 100) : 0,
      is_full: w.reserved_count >= w.capacity,
    }));
  }

  async getInventoryEvents(limit = 30) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('inventory_events')
      .select(`
        id,
        quantity_delta,
        event_type,
        reason,
        created_at,
        item:menu_items(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

module.exports = new AnalyticsRepository();
