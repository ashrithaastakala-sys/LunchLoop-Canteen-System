/**
 * LunchLoop Student Order History
 */

let myOrders = [];
let activeStatusFilter = 'all';

async function loadStudentOrders() {
  const container = document.getElementById('studentOrdersList');
  if (!container) return;

  container.innerHTML = `
    <div class="skeleton" style="height: 120px; margin-bottom: 16px;"></div>
    <div class="skeleton" style="height: 120px; margin-bottom: 16px;"></div>
  `;

  try {
    const url = activeStatusFilter === 'all' ? '/orders' : `/orders?status=${activeStatusFilter}`;
    const res = await api.get(url);
    myOrders = res.data?.orders || [];
    renderOrdersList(myOrders);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Failed to load orders</div>
        <p class="empty-desc">${escapeHTML(err.message)}</p>
        <button class="btn btn-outline" onclick="loadStudentOrders()">Retry</button>
      </div>
    `;
  }
}

function renderOrdersList(orders) {
  const container = document.getElementById('studentOrdersList');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <div class="empty-title">No orders found</div>
        <p class="empty-desc">You haven't placed any canteen orders ${activeStatusFilter !== 'all' ? `with status "${activeStatusFilter}"` : 'yet'}.</p>
        <a href="menu.html" class="btn btn-primary">Pre-Order Food Now</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const dateStr = new Date(order.created_at).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const statusBadgeMap = {
      confirmed: 'badge-confirmed',
      preparing: 'badge-preparing',
      ready: 'badge-ready',
      collected: 'badge-collected',
      cancelled: 'badge-cancelled',
    };

    const itemsSummary = (order.items || [])
      .map(i => `${escapeHTML(i.item_name_snapshot)} &times; ${i.quantity}`)
      .join(', ');

    return `
      <div class="chart-card" style="margin-bottom: 16px; border-left: 6px solid var(--color-tomato);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="font-weight: 800; font-size: 1.25rem; color: var(--color-tomato);">
              Token: ${escapeHTML(order.pickup_token)}
            </div>
            <div style="font-size: 0.82rem; color: var(--color-muted); font-family: monospace;">
              Order #${escapeHTML(order.public_order_number)} &bull; ${escapeHTML(dateStr)}
            </div>
          </div>
          <span class="badge ${statusBadgeMap[order.status] || 'badge-confirmed'}">
            ${escapeHTML(order.status)}
          </span>
        </div>

        <div style="font-size: 0.95rem; margin-bottom: 14px; color: var(--color-charcoal);">
          <strong>Items:</strong> ${itemsSummary || 'Standard order'}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--color-border); padding-top: 12px; flex-wrap: wrap; gap: 10px;">
          <div style="font-size: 1.1rem; font-weight: 800;">
            Total: ₹${Number(order.subtotal).toFixed(2)}
          </div>
          <div style="display: flex; gap: 8px;">
            <a href="order-tracker.html?id=${escapeHTML(order.id)}" class="btn btn-primary btn-sm">
              Track Status & Token &rarr;
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.loadStudentOrders = loadStudentOrders;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('studentOrdersList')) {
    loadStudentOrders();

    document.querySelectorAll('.order-status-tab')?.forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.order-status-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeStatusFilter = tab.getAttribute('data-status') || 'all';
        loadStudentOrders();
      });
    });
  }
});
