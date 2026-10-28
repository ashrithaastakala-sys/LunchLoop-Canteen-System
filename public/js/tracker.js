/**
 * LunchLoop Order Tracker & Token Display
 */

let currentOrderId = null;
let pollTimer = null;

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadOrderTracker() {
  const container = document.getElementById('orderTrackerContent');
  if (!container) return;

  currentOrderId = getOrderIdFromUrl();
  if (!currentOrderId) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎫</div>
        <div class="empty-title">No Order Selected</div>
        <p class="empty-desc">Please open an order from your history or place a new pre-order.</p>
        <div style="display:flex; justify-content:center; gap:12px;">
          <a href="orders.html" class="btn btn-primary">My Orders</a>
          <a href="menu.html" class="btn btn-outline">Explore Menu</a>
        </div>
      </div>
    `;
    return;
  }

  try {
    const res = await api.get(`/orders/${currentOrderId}`);
    const order = res.data?.order;
    if (!order) throw new Error('Order data empty');

    renderTracker(order);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Order Lookup Failed</div>
        <p class="empty-desc">${escapeHTML(err.message)}</p>
        <a href="orders.html" class="btn btn-outline">Back to My Orders</a>
      </div>
    `;
  }
}

function renderTracker(order) {
  const container = document.getElementById('orderTrackerContent');
  if (!container) return;

  const isCancelled = order.status === 'cancelled';
  const statusSteps = ['confirmed', 'preparing', 'ready', 'collected'];
  const currentIndex = statusSteps.indexOf(order.status);

  let progressPercent = 0;
  if (!isCancelled && currentIndex >= 0) {
    progressPercent = (currentIndex / (statusSteps.length - 1)) * 100;
  }

  const windowInfo = order.pickup_window;
  let windowTime = 'Standard Pickup Window';
  if (windowInfo) {
    const start = new Date(windowInfo.starts_at);
    const end = new Date(windowInfo.ends_at);
    windowTime = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  const itemsHtml = (order.items || []).map(item => `
    <div style="display:flex; justify-content:space-between; padding: 10px 0; border-bottom: 1px solid var(--color-border); font-size: 0.95rem;">
      <div>
        <strong>${escapeHTML(item.item_name_snapshot)}</strong> &times; ${item.quantity}
      </div>
      <div style="font-weight:700;">₹${Number(item.line_total).toFixed(2)}</div>
    </div>
  `).join('');

  // Cancellation block
  let cancellationHtml = '';
  if (isCancelled) {
    cancellationHtml = `
      <div style="background: var(--color-pale-red); border: 1px solid rgba(233, 75, 53, 0.3); border-radius: var(--radius-md); padding: 16px; margin-top: 24px; text-align: left;">
        <h4 style="color: var(--color-tomato); margin-bottom: 6px;">❌ Order Cancelled</h4>
        <p style="font-size: 0.9rem; color: var(--color-charcoal);">
          <strong>Reason:</strong> ${escapeHTML(order.cancellation_reason || 'Student requested cancellation')}
        </p>
        <p style="font-size: 0.8rem; color: var(--color-muted); margin-top: 4px;">
          Reserved inventory portions and pickup slot were safely restored to the kitchen.
        </p>
      </div>
    `;
  } else if (order.cancellation && order.cancellation.is_allowed) {
    cancellationHtml = `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="font-size: 0.85rem; color: var(--color-muted);">
          ⏱️ Cancellation eligible for next <strong>${order.cancellation.minutes_remaining} minutes</strong>
        </div>
        <button class="btn btn-danger btn-sm" id="btnCancelOrder" onclick="triggerOrderCancellation('${escapeHTML(order.id)}')">
          Cancel This Order
        </button>
      </div>
    `;
  } else if (order.status === 'confirmed') {
    cancellationHtml = `
      <div style="margin-top: 20px; font-size: 0.85rem; color: var(--color-muted);">
        🔒 Cancellation deadline (${order.cancellation?.cutoff_policy_minutes || 10} mins before window) has passed.
      </div>
    `;
  }

  container.innerHTML = `
    <div class="token-card">
      <div class="token-label">Pickup Token Number</div>
      <div class="token-number">${escapeHTML(order.pickup_token)}</div>
      <div class="token-order-no">Order #${escapeHTML(order.public_order_number)}</div>
      
      <div style="display:inline-flex; align-items:center; gap:8px; background:var(--color-cream); padding: 8px 16px; border-radius: var(--radius-pill); font-size: 0.9rem; margin-bottom: 24px;">
        <span>🕒 Scheduled Pickup:</span>
        <strong>${escapeHTML(windowTime)}</strong>
      </div>

      <!-- Live Stepper -->
      ${!isCancelled ? `
        <div class="progress-stepper" aria-label="Order lifecycle stages">
          <div class="progress-line">
            <div class="progress-line-fill" style="width: ${progressPercent}%;"></div>
          </div>
          
          <div class="progress-step ${currentIndex >= 0 ? (currentIndex === 0 ? 'current' : 'completed') : ''}">
            <div class="step-dot">1</div>
            <div class="step-label">Confirmed</div>
          </div>

          <div class="progress-step ${currentIndex >= 1 ? (currentIndex === 1 ? 'current' : 'completed') : ''}">
            <div class="step-dot">2</div>
            <div class="step-label">Preparing</div>
          </div>

          <div class="progress-step ${currentIndex >= 2 ? (currentIndex === 2 ? 'current' : 'completed') : ''}">
            <div class="step-dot">3</div>
            <div class="step-label">Ready</div>
          </div>

          <div class="progress-step ${currentIndex >= 3 ? 'completed' : ''}">
            <div class="step-dot">4</div>
            <div class="step-label">Collected</div>
          </div>
        </div>
      ` : ''}

      ${cancellationHtml}

      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--color-border); display: flex; justify-content: center; gap: 10px;">
        <button class="btn btn-outline btn-sm" id="btnOpenPrint" onclick="window.print()" style="font-size: 0.82rem;">
          🖨️ Print Pickup Slip / Save Pass
        </button>
      </div>
    </div>

    <!-- Order Summary Box -->
    <div class="chart-card">
      <div class="chart-header">
        <h3 class="chart-title">Order Items Summary</h3>
        <span class="badge ${order.status === 'collected' ? 'badge-collected' : (order.status === 'ready' ? 'badge-ready' : 'badge-preparing')}">
          ${escapeHTML(order.status)}
        </span>
      </div>

      <div style="margin-bottom: 16px;">
        ${itemsHtml}
      </div>

      <div style="display:flex; justify-content:space-between; font-size:1.15rem; font-weight:800; padding-top:12px; border-top: 2px solid var(--color-border);">
        <span>Total Due at Pickup:</span>
        <span style="color:var(--color-tomato);">₹${Number(order.subtotal).toFixed(2)}</span>
      </div>

      ${order.notes ? `
        <div style="margin-top: 14px; font-size: 0.88rem; background: var(--color-cream); padding: 10px 14px; border-radius: var(--radius-sm);">
          <strong>Note:</strong> ${escapeHTML(order.notes)}
        </div>
      ` : ''}
    </div>
  `;
}

async function triggerOrderCancellation(orderId) {
  const reason = prompt('Reason for cancelling this pre-order (optional):', 'Change of schedule');
  if (reason === null) return; // user cancelled prompt

  try {
    await api.post(`/orders/${orderId}/cancel`, { reason });
    showToast('Order cancelled successfully. Inventory restored.', 'success');
    loadOrderTracker();
  } catch (err) {
    showToast(`Cancellation failed: ${err.message}`, 'error');
  }
}

// Start polling for realtime order updates
function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    // Only poll when page is visible
    if (!document.hidden && currentOrderId) {
      loadOrderTracker();
    }
  }, 5000);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
}

window.loadOrderTracker = loadOrderTracker;
window.triggerOrderCancellation = triggerOrderCancellation;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('orderTrackerContent')) {
    loadOrderTracker();
    startPolling();
  }
});

window.addEventListener('beforeunload', stopPolling);
