/**
 * LunchLoop Staff Operations: Inventory & Pickup Window Management
 */

let staffMenuItems = [];
let staffWindows = [];
let staffCategories = [];

async function initStaffDashboard() {
  await Promise.all([
    loadOverviewMetrics(),
    loadStaffMenu(),
    loadStaffWindows(),
  ]);
}

async function loadOverviewMetrics() {
  try {
    const res = await api.get('/staff/analytics/overview');
    const stats = res.data?.overview;
    if (!stats) return;

    document.getElementById('statTotalOrders').textContent = stats.total_orders || 0;
    document.getElementById('statActiveQueue').textContent = stats.active_queue_count || 0;
    document.getElementById('statReady').textContent = stats.ready_count || 0;
    document.getElementById('statCollected').textContent = stats.collected_count || 0;
    document.getElementById('statCancelled').textContent = stats.cancelled_count || 0;
    document.getElementById('statLowStock').textContent = stats.low_stock_count || 0;
    document.getElementById('statSoldOut').textContent = stats.sold_out_count || 0;
  } catch (err) {
    console.warn('Could not load overview metrics:', err.message);
  }
}

async function loadStaffMenu() {
  const tableBody = document.getElementById('staffInventoryTableBody');
  if (!tableBody) return;

  try {
    const [menuRes, catsRes] = await Promise.all([
      api.get('/staff/menu'),
      api.get('/menu/categories'),
    ]);

    staffMenuItems = menuRes.data?.items || [];
    staffCategories = catsRes.data?.categories || [];

    renderInventoryTable();
    populateCategorySelect();
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px; color: var(--color-tomato);">
          Failed to load inventory: ${escapeHTML(err.message)}
        </td>
      </tr>
    `;
  }
}

function renderInventoryTable() {
  const tableBody = document.getElementById('staffInventoryTableBody');
  if (!tableBody) return;

  if (staffMenuItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px;">No menu items found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = staffMenuItems.map(item => {
    const isSoldOut = !item.is_available || item.available_quantity <= 0;
    const isLowStock = !isSoldOut && item.available_quantity <= item.low_stock_threshold;

    return `
      <tr>
        <td>
          <strong>${escapeHTML(item.name)}</strong>
          <div style="font-size:0.75rem; color:var(--color-muted);">${escapeHTML(item.category?.name || 'General')}</div>
        </td>
        <td>
          <span class="badge ${item.is_vegetarian ? 'badge-veg' : 'badge-nonveg'}">
            ${item.is_vegetarian ? 'VEG' : 'NON-VEG'}
          </span>
        </td>
        <td>₹${Number(item.price).toFixed(2)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <input 
              type="number" 
              class="form-input" 
              id="stockInput_${item.id}" 
              value="${item.available_quantity}" 
              min="0" 
              max="999" 
              style="width: 75px; padding: 6px 8px;"
            />
            <button class="btn btn-outline btn-sm" onclick="saveStockChange('${escapeHTML(item.id)}')">
              Save
            </button>
          </div>
        </td>
        <td>
          ${isSoldOut ? '<span class="badge badge-sold-out">Sold Out</span>' : (isLowStock ? '<span class="badge badge-low-stock">Low Stock</span>' : '<span class="badge badge-ready">In Stock</span>')}
        </td>
        <td>
          <button 
            class="btn btn-sm ${item.is_available ? 'btn-danger' : 'btn-secondary'}" 
            onclick="toggleItemAvailability('${escapeHTML(item.id)}', ${!item.is_available})">
            ${item.is_available ? 'Mark Sold Out' : 'Mark Available'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function saveStockChange(itemId) {
  const input = document.getElementById(`stockInput_${itemId}`);
  if (!input) return;

  const newQty = parseInt(input.value, 10);
  if (isNaN(newQty) || newQty < 0) {
    showToast('Please enter a valid stock quantity', 'warning');
    return;
  }

  try {
    await api.patch(`/staff/menu/${itemId}/stock`, {
      quantity: newQty,
      reason: 'Staff inventory adjustment',
    });
    showToast('Stock quantity updated successfully', 'success');
    loadStaffMenu();
    loadOverviewMetrics();
  } catch (err) {
    showToast(`Failed to update stock: ${err.message}`, 'error');
  }
}

async function toggleItemAvailability(itemId, newStatus) {
  try {
    await api.patch(`/staff/menu/${itemId}/availability`, {
      is_available: newStatus,
    });
    showToast(`Item marked as ${newStatus ? 'available' : 'sold out'}`, 'success');
    loadStaffMenu();
    loadOverviewMetrics();
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

function populateCategorySelect() {
  const select = document.getElementById('newItemCategorySelect');
  if (!select) return;

  select.innerHTML = staffCategories.map(cat => `
    <option value="${escapeHTML(cat.id)}">${escapeHTML(cat.name)}</option>
  `).join('');
}

async function handleCreateMenuItem(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  const category_id = form.category_id.value;
  const price = parseFloat(form.price.value);
  const available_quantity = parseInt(form.available_quantity.value, 10);
  const low_stock_threshold = parseInt(form.low_stock_threshold.value, 10);
  const is_vegetarian = form.is_vegetarian.checked;
  const description = form.description.value.trim();

  try {
    await api.post('/staff/menu', {
      name,
      category_id,
      price,
      available_quantity,
      low_stock_threshold,
      is_vegetarian,
      description,
    });

    showToast(`Created new menu item: ${name}`, 'success');
    form.reset();
    document.getElementById('createItemModal')?.classList.remove('open');
    loadStaffMenu();
  } catch (err) {
    showToast(`Failed to create item: ${err.message}`, 'error');
  }
}

// Pickup Windows Management
async function loadStaffWindows() {
  const container = document.getElementById('staffWindowsList');
  if (!container) return;

  try {
    const res = await api.get('/staff/pickup-windows');
    staffWindows = res.data?.windows || [];
    renderWindowsList();
  } catch (err) {
    console.warn('Could not load pickup windows:', err.message);
  }
}

function renderWindowsList() {
  const container = document.getElementById('staffWindowsList');
  if (!container) return;

  if (staffWindows.length === 0) {
    container.innerHTML = `<p style="color:var(--color-muted);">No pickup windows configured.</p>`;
    return;
  }

  container.innerHTML = staffWindows.map(w => {
    const start = new Date(w.starts_at);
    const end = new Date(w.ends_at);
    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const percent = w.capacity > 0 ? Math.round((w.reserved_count / w.capacity) * 100) : 0;

    return `
      <div style="background:var(--color-cream); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:14px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:700;">🕒 ${escapeHTML(timeStr)}</div>
          <div style="font-size:0.82rem; color:var(--color-muted);">
            Bookings: <strong>${w.reserved_count} / ${w.capacity}</strong> (${percent}% full)
          </div>
        </div>
        <button class="btn btn-sm ${w.is_active ? 'btn-outline' : 'btn-secondary'}" onclick="toggleWindowActive('${escapeHTML(w.id)}', ${!w.is_active})">
          ${w.is_active ? 'Pause Window' : 'Activate Window'}
        </button>
      </div>
    `;
  }).join('');
}

async function toggleWindowActive(windowId, is_active) {
  try {
    await api.patch(`/staff/pickup-windows/${windowId}`, { is_active });
    showToast(`Window ${is_active ? 'activated' : 'paused'}`, 'success');
    loadStaffWindows();
  } catch (err) {
    showToast(`Failed: ${err.message}`, 'error');
  }
}

window.initStaffDashboard = initStaffDashboard;
window.saveStockChange = saveStockChange;
window.toggleItemAvailability = toggleItemAvailability;
window.handleCreateMenuItem = handleCreateMenuItem;
window.toggleWindowActive = toggleWindowActive;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('staffInventoryTableBody')) {
    initStaffDashboard();

    document.getElementById('btnOpenCreateItemModal')?.addEventListener('click', () => {
      document.getElementById('createItemModal')?.classList.add('open');
    });

    document.getElementById('closeCreateItemModal')?.addEventListener('click', () => {
      document.getElementById('createItemModal')?.classList.remove('open');
    });

    document.getElementById('createItemForm')?.addEventListener('submit', handleCreateMenuItem);
  }
});
