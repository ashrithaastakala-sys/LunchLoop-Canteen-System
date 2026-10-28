/**
 * LunchLoop Shopping Cart & Pre-Order Checkout
 */

let cart = [];
let availableWindows = [];

function loadCart() {
  try {
    const saved = localStorage.getItem('lunchloop_cart');
    cart = saved ? JSON.parse(saved) : [];
  } catch (e) {
    cart = [];
  }
  updateCartBadge();
  renderCartDrawer();
}

function saveCart() {
  localStorage.setItem('lunchloop_cart', JSON.stringify(cart));
  updateCartBadge();
  renderCartDrawer();
}

function addToCart(item, quantity = 1) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    if (existing.quantity + quantity > 10) {
      showToast('Maximum 10 portions per item allowed', 'warning');
      return;
    }
    existing.quantity += quantity;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: quantity,
      is_vegetarian: item.is_vegetarian,
    });
  }
  saveCart();
  showToast(`Added ${escapeHTML(item.name)} to your tray!`, 'success');
  openCartDrawer();
}

function updateCartItemQty(itemId, newQty) {
  if (newQty <= 0) {
    cart = cart.filter(i => i.id !== itemId);
  } else if (newQty > 10) {
    showToast('Maximum 10 portions allowed', 'warning');
    return;
  } else {
    const item = cart.find(i => i.id === itemId);
    if (item) item.quantity = newQty;
  }
  saveCart();
}

function clearCart() {
  cart = [];
  saveCart();
}

function calculateSubtotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartBadge() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartCountPill');
  const floatingCount = document.getElementById('floatingCartCount');

  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (floatingCount) {
    floatingCount.textContent = count;
    const floatingBtn = document.getElementById('floatingCartBtn');
    if (floatingBtn) {
      floatingBtn.style.display = count > 0 ? 'flex' : 'none';
    }
  }
}

async function loadPickupWindows() {
  try {
    const res = await api.get('/pickup-windows');
    availableWindows = res.data?.windows || [];
    renderPickupWindowSelect();
  } catch (err) {
    console.warn('Could not load pickup windows:', err.message);
  }
}

function renderPickupWindowSelect() {
  const select = document.getElementById('cartPickupWindowSelect');
  if (!select) return;

  if (availableWindows.length === 0) {
    select.innerHTML = `<option value="">No pickup windows currently open</option>`;
    return;
  }

  select.innerHTML = availableWindows.map(w => {
    const start = new Date(w.starts_at);
    const end = new Date(w.ends_at);
    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const isFull = w.reserved_count >= w.capacity;
    const slotsLeft = w.capacity - w.reserved_count;

    return `
      <option value="${escapeHTML(w.id)}" ${isFull ? 'disabled' : ''}>
        ${timeStr} (${isFull ? 'FULL' : `${slotsLeft} slots remaining`})
      </option>
    `;
  }).join('');
}

function renderCartDrawer() {
  const itemsContainer = document.getElementById('cartDrawerItems');
  const subtotalEl = document.getElementById('cartSubtotalAmount');
  const checkoutBtn = document.getElementById('btnConfirmOrder');

  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-state" style="padding: 40px 10px;">
        <div class="empty-icon">🥗</div>
        <div class="empty-title">Your tray is empty</div>
        <p class="empty-desc">Explore today's menu to add food items for pre-order.</p>
        <a href="menu.html" class="btn btn-primary btn-sm">Browse Today's Menu</a>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₹0.00';
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  itemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">
          <span class="badge ${item.is_vegetarian ? 'badge-veg' : 'badge-nonveg'}" style="padding: 2px 6px; font-size: 0.65rem; margin-right: 4px;">
            ${item.is_vegetarian ? 'VEG' : 'NON-VEG'}
          </span>
          ${escapeHTML(item.name)}
        </div>
        <div class="cart-item-price">₹${item.price.toFixed(2)} each</div>
      </div>
      <div class="qty-stepper">
        <button class="qty-btn" onclick="updateCartItemQty('${escapeHTML(item.id)}', ${item.quantity - 1})" aria-label="Decrease quantity">&minus;</button>
        <span class="qty-val">${item.quantity}</span>
        <button class="qty-btn" onclick="updateCartItemQty('${escapeHTML(item.id)}', ${item.quantity + 1})" aria-label="Increase quantity">&plus;</button>
      </div>
      <div style="font-weight: 800; min-width: 65px; text-align: right;">
        ₹${(item.price * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');

  const subtotal = calculateSubtotal();
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
  if (checkoutBtn) checkoutBtn.disabled = false;
}

function openCartDrawer() {
  loadPickupWindows();
  document.getElementById('cartDrawerBackdrop')?.classList.add('open');
  document.getElementById('cartDrawer')?.classList.add('open');
}

function closeCartDrawer() {
  document.getElementById('cartDrawerBackdrop')?.classList.remove('open');
  document.getElementById('cartDrawer')?.classList.remove('open');
}

async function handleCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty', 'warning');
    return;
  }

  const windowSelect = document.getElementById('cartPickupWindowSelect');
  const pickupWindowId = windowSelect ? windowSelect.value : null;

  if (!pickupWindowId) {
    showToast('Please select a pickup time window', 'warning');
    return;
  }

  const notesInput = document.getElementById('cartOrderNotes');
  const notes = notesInput ? notesInput.value.trim() : '';

  const checkoutBtn = document.getElementById('btnConfirmOrder');
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = `Reserving Order...`;
  }

  try {
    // Generate client idempotency key to prevent accidental double submission
    const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      pickup_window_id: pickupWindowId,
      items: cart.map(i => ({ menu_item_id: i.id, quantity: i.quantity })),
      notes: notes || null,
      idempotency_key: idempotencyKey,
    };

    const res = await api.post('/orders', payload);
    const orderData = res.data?.order;

    // Clear cart on successful order confirmation
    clearCart();
    closeCartDrawer();

    showToast(`Order Confirmed! Your Pickup Token is ${orderData.pickup_token}`, 'success', 6000);

    // Redirect to Token Tracker page
    setTimeout(() => {
      window.location.href = `order-tracker.html?id=${orderData.order_id}`;
    }, 600);
  } catch (err) {
    showToast(`Order failed: ${err.message}`, 'error', 6000);
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = `Confirm Pre-Order (Pay at Pickup)`;
    }
  }
}

// Global exposure & event listeners
window.addToCart = addToCart;
window.updateCartItemQty = updateCartItemQty;
window.clearCart = clearCart;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.handleCheckout = handleCheckout;

document.addEventListener('DOMContentLoaded', () => {
  loadCart();

  // Attach drawer openers/closers
  document.getElementById('navCartBtn')?.addEventListener('click', openCartDrawer);
  document.getElementById('floatingCartBtn')?.addEventListener('click', openCartDrawer);
  document.getElementById('closeCartDrawerBtn')?.addEventListener('click', closeCartDrawer);
  document.getElementById('cartDrawerBackdrop')?.addEventListener('click', closeCartDrawer);
  document.getElementById('btnConfirmOrder')?.addEventListener('click', handleCheckout);
});
