/**
 * LunchLoop Kitchen Queue Management (Enhanced Professional Edition)
 */

let kitchenQueue = [];
let kitchenStatusFilter = 'all';
let kitchenSort = 'oldest';
let kitchenSearchTerm = '';
let kitchenPollTimer = null;
let soundEnabled = true;
let previousQueueCount = null;

// Gentle Web Audio API synthesizer chime (no external audio assets needed)
function playOrderChime() {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Note 1 (D5 - 587.3 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.3, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Note 2 (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (e) {
    // Audio autoplay restrictions before first user gesture
  }
}

function toggleKitchenSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('btnToggleSound');
  if (btn) {
    btn.innerHTML = soundEnabled ? '🔔 Audio: ON' : '🔕 Audio: MUTED';
    btn.classList.toggle('btn-primary', soundEnabled);
    btn.classList.toggle('btn-outline', !soundEnabled);
  }
  showToast(soundEnabled ? 'Audio alerts enabled' : 'Audio alerts muted', 'info', 2000);
}

function onKitchenSearch(val) {
  kitchenSearchTerm = (val || '').toLowerCase().trim();
  renderKitchenQueue();
}

async function loadKitchenQueue() {
  const grid = document.getElementById('kitchenQueueGrid');
  if (!grid) return;

  try {
    const res = await api.get('/staff/queue');
    const newQueue = res.data?.queue || [];

    // Chime when new orders arrive
    if (previousQueueCount !== null && newQueue.length > previousQueueCount) {
      playOrderChime();
      showToast(`🔔 New pre-order ticket arrived!`, 'info', 3000);
    }
    previousQueueCount = newQueue.length;
    kitchenQueue = newQueue;

    renderKitchenQueue();
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Failed to load kitchen queue</div>
        <p class="empty-desc">${escapeHTML(err.message)}</p>
        <button class="btn btn-outline" onclick="loadKitchenQueue()">Retry</button>
      </div>
    `;
  }
}

function renderKitchenQueue() {
  const grid = document.getElementById('kitchenQueueGrid');
  const countEl = document.getElementById('kitchenActiveCount');
  if (!grid) return;

  let filtered = [...kitchenQueue];

  // Status Filter
  if (kitchenStatusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === kitchenStatusFilter);
  }

  // Search Filter
  if (kitchenSearchTerm) {
    filtered = filtered.filter(o => {
      const matchToken = (o.pickup_token || '').toLowerCase().includes(kitchenSearchTerm);
      const matchNumber = (o.public_order_number || '').toLowerCase().includes(kitchenSearchTerm);
      const matchItems = (o.items || []).some(i => (i.item_name_snapshot || '').toLowerCase().includes(kitchenSearchTerm));
      return matchToken || matchNumber || matchItems;
    });
  }

  // Sort
  if (kitchenSort === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (kitchenSort === 'newest') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (countEl) countEl.textContent = `${filtered.length} active orders`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🍳</div>
        <div class="empty-title">Queue is clear!</div>
        <p class="empty-desc">${kitchenSearchTerm ? 'No orders match your search query.' : 'No orders currently awaiting preparation in this category.'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(order => {
    const timeReceived = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000));
    
    let waitBadge = '';
    if (elapsedMin >= 12) {
      waitBadge = `<span class="badge" style="background:#FEE2E2; color:#B91C1C; font-weight:700;">⚠️ ${elapsedMin}m ago (Rush)</span>`;
    } else if (elapsedMin >= 5) {
      waitBadge = `<span class="badge" style="background:#FEF3C7; color:#B45309; font-weight:700;">⏱️ ${elapsedMin}m ago</span>`;
    } else {
      waitBadge = `<span class="badge" style="background:#E0E7FF; color:#3730A3; font-weight:700;">✨ ${elapsedMin}m ago</span>`;
    }

    let windowTime = 'Standard Window';
    if (order.pickup_window) {
      const start = new Date(order.pickup_window.starts_at);
      const end = new Date(order.pickup_window.ends_at);
      windowTime = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    const itemsHtml = (order.items || []).map(item => `
      <li class="kitchen-item-row">
        <span><strong>${escapeHTML(item.item_name_snapshot)}</strong></span>
        <span class="kitchen-item-qty" style="background:var(--color-cream); padding:2px 8px; border-radius:4px; font-weight:700;">&times; ${item.quantity}</span>
      </li>
    `).join('');

    let actionButtons = '';
    if (order.status === 'confirmed') {
      actionButtons = `
        <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="advanceKitchenStatus('${escapeHTML(order.id)}', 'preparing')">
          👩‍🍳 Start Preparing
        </button>
      `;
    } else if (order.status === 'preparing') {
      actionButtons = `
        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="advanceKitchenStatus('${escapeHTML(order.id)}', 'ready')">
          🔔 Mark Ready for Pickup
        </button>
      `;
    } else if (order.status === 'ready') {
      actionButtons = `
        <button class="btn btn-outline btn-sm" style="flex:1; border-color:var(--color-basil); color:var(--color-basil); font-weight:700;" onclick="advanceKitchenStatus('${escapeHTML(order.id)}', 'collected')">
          ✅ Handed to Student (Collected)
        </button>
      `;
    }

    return `
      <div class="kitchen-card status-${order.status}">
        <div class="kitchen-card-header">
          <div>
            <div class="kitchen-token">${escapeHTML(order.pickup_token)}</div>
            <div style="font-size: 0.78rem; font-family: monospace; color: var(--color-muted);">
              #${escapeHTML(order.public_order_number)} &bull; Placed: ${escapeHTML(timeReceived)}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <span class="badge badge-${order.status}">${escapeHTML(order.status)}</span>
            ${waitBadge}
          </div>
        </div>

        <div class="kitchen-window-time">
          🕒 Target Pickup Window: <strong>${escapeHTML(windowTime)}</strong>
        </div>

        <ul class="kitchen-items-list">
          ${itemsHtml}
        </ul>

        ${order.notes ? `
          <div style="font-size: 0.82rem; background: var(--color-pale-yellow); padding: 8px 10px; border-radius: 4px; color: #78350F; margin-bottom: 12px;">
            📝 <strong>Student Note:</strong> ${escapeHTML(order.notes)}
          </div>
        ` : ''}

        <div class="kitchen-card-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  }).join('');
}

async function advanceKitchenStatus(orderId, nextStatus) {
  try {
    await api.patch(`/staff/orders/${orderId}/status`, {
      status: nextStatus,
      note: `Kitchen updated status to ${nextStatus}`,
    });

    showToast(`Order updated to ${nextStatus.toUpperCase()}`, 'success');
    loadKitchenQueue();
  } catch (err) {
    showToast(`Failed to update status: ${err.message}`, 'error');
  }
}

function startKitchenPolling() {
  if (kitchenPollTimer) clearInterval(kitchenPollTimer);
  kitchenPollTimer = setInterval(() => {
    if (!document.hidden) {
      loadKitchenQueue();
    }
  }, 6000);
}

window.loadKitchenQueue = loadKitchenQueue;
window.advanceKitchenStatus = advanceKitchenStatus;
window.toggleKitchenSound = toggleKitchenSound;
window.onKitchenSearch = onKitchenSearch;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('kitchenQueueGrid')) {
    loadKitchenQueue();
    startKitchenPolling();

    document.querySelectorAll('.kitchen-filter-tab')?.forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.kitchen-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        kitchenStatusFilter = tab.getAttribute('data-status') || 'all';
        renderKitchenQueue();
      });
    });

    document.getElementById('kitchenSortSelect')?.addEventListener('change', (e) => {
      kitchenSort = e.target.value;
      renderKitchenQueue();
    });
  }
});
