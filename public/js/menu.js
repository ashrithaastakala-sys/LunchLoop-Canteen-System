/**
 * LunchLoop Menu Catalog & Filter Controller
 */

let allMenuItems = [];
let categories = [];
let selectedCategoryId = 'all';
let isVegOnly = false;
let searchQuery = '';
let currentSort = 'name';

// Visual food icons lookup for Indian cuisine items & Gen-Z munchies
const foodEmojiMap = {
  'Maggi': '🍜',
  'Fries': '🍟',
  'Momos': '🥟',
  'Frappe': '🧋',
  'Boba': '🧋',
  'Fizz': '🍹',
  'Nachos': '🧀',
  'Baguette': '🥖',
  'Corn': '🌽',
  'Masala Dosa': '🥞',
  'Idli': '🥟',
  'Chole Bhature': '🫓',
  'Poha': '🍚',
  'Biryani': '🍛',
  'Fried Rice': '🥡',
  'Curd Rice': '🥣',
  'Lemon Rice': '🍋',
  'Roll': '🌯',
  'Samosa': '🥟',
  'Sandwich': '🥪',
  'Chai': '☕',
  'Coffee': '☕',
  'Lime Soda': '🥤',
};

function getFoodEmoji(name) {
  for (const [key, emoji] of Object.entries(foodEmojiMap)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🍲';
}

async function loadMenuData() {
  const grid = document.getElementById('menuItemsGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="skeleton" style="height: 280px;"></div>
      <div class="skeleton" style="height: 280px;"></div>
      <div class="skeleton" style="height: 280px;"></div>
    `;
  }

  try {
    const [catsRes, menuRes] = await Promise.all([
      api.get('/menu/categories'),
      api.get('/menu'),
    ]);

    categories = catsRes.data?.categories || [];
    allMenuItems = menuRes.data?.items || [];

    renderCategoryTabs();
    applyFiltersAndRender();
  } catch (err) {
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load menu</div>
          <p class="empty-desc">${escapeHTML(err.message)}</p>
          <button class="btn btn-outline" onclick="loadMenuData()">Try Again</button>
        </div>
      `;
    }
  }
}

function renderCategoryTabs() {
  const container = document.getElementById('categoryTabsContainer');
  if (!container) return;

  let html = `
    <button class="cat-tab ${selectedCategoryId === 'all' ? 'active' : ''}" data-cat="all">
      All Items (${allMenuItems.length})
    </button>
  `;

  categories.forEach(cat => {
    const count = allMenuItems.filter(i => i.category_id === cat.id).length;
    html += `
      <button class="cat-tab ${selectedCategoryId === cat.id ? 'active' : ''}" data-cat="${escapeHTML(cat.id)}">
        ${escapeHTML(cat.name)} (${count})
      </button>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCategoryId = btn.getAttribute('data-cat');
      applyFiltersAndRender();
    });
  });
}

function applyFiltersAndRender() {
  let filtered = [...allMenuItems];

  // Category filter
  if (selectedCategoryId !== 'all') {
    filtered = filtered.filter(item => item.category_id === selectedCategoryId);
  }

  // Veg only filter
  if (isVegOnly) {
    filtered = filtered.filter(item => item.is_vegetarian);
  }

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.description && item.description.toLowerCase().includes(q))
    );
  }

  // Sort
  if (currentSort === 'price_asc') {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (currentSort === 'price_desc') {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (currentSort === 'prep_time') {
    filtered.sort((a, b) => (a.prep_time_minutes || 5) - (b.prep_time_minutes || 5));
  } else {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderMenuGrid(filtered);
}

function renderMenuGrid(items) {
  const grid = document.getElementById('menuItemsGrid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No matching canteen items</div>
        <p class="empty-desc">Try clearing your search filters or selecting another category.</p>
        <button class="btn btn-outline btn-sm" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => {
    const isSoldOut = !item.is_available || item.available_quantity <= 0;
    const isLowStock = !isSoldOut && item.available_quantity <= (item.low_stock_threshold || 5);
    const emoji = getFoodEmoji(item.name);

    return `
      <article class="food-card ${isSoldOut ? 'sold-out' : ''}" data-id="${escapeHTML(item.id)}">
        <div class="food-thumb">
          <div class="food-thumb-placeholder">${emoji}</div>
          <div class="food-badge-overlay">
            <span class="badge ${item.is_vegetarian ? 'badge-veg' : 'badge-nonveg'}">
              ${item.is_vegetarian ? 'VEG' : 'NON-VEG'}
            </span>
            ${isSoldOut ? '<span class="badge badge-sold-out">SOLD OUT</span>' : ''}
            ${isLowStock ? `<span class="badge badge-low-stock">ONLY ${item.available_quantity} LEFT</span>` : ''}
          </div>
        </div>
        <div class="food-body">
          <h3 class="food-name">${escapeHTML(item.name)}</h3>
          <p class="food-desc">${escapeHTML(item.description || 'Prepared fresh at the campus kitchen.')}</p>
          <div class="food-meta">
            <span>⏱️ ${item.prep_time_minutes || 5} mins prep</span>
            <span>📦 Stock: ${item.available_quantity}</span>
          </div>
          <div class="food-footer">
            <div class="food-price"><span>₹</span>${Number(item.price).toFixed(2)}</div>
            <button 
              class="btn ${isSoldOut ? 'btn-outline' : 'btn-primary'} btn-sm" 
              ${isSoldOut ? 'disabled aria-disabled="true"' : ''}
              onclick='addToCart(${JSON.stringify({ id: item.id, name: item.name, price: item.price, is_vegetarian: item.is_vegetarian })})'>
              ${isSoldOut ? 'Sold Out' : '+ Add to Tray'}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function resetFilters() {
  selectedCategoryId = 'all';
  isVegOnly = false;
  searchQuery = '';
  currentSort = 'name';

  const searchInput = document.getElementById('menuSearchInput');
  if (searchInput) searchInput.value = '';

  const vegCheckbox = document.getElementById('vegFilterCheckbox');
  if (vegCheckbox) vegCheckbox.checked = false;

  const sortSelect = document.getElementById('menuSortSelect');
  if (sortSelect) sortSelect.value = 'name';

  renderCategoryTabs();
  applyFiltersAndRender();
}

window.loadMenuData = loadMenuData;
window.resetFilters = resetFilters;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('menuItemsGrid')) {
    loadMenuData();

    // Event listeners
    document.getElementById('menuSearchInput')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      applyFiltersAndRender();
    });

    document.getElementById('vegFilterCheckbox')?.addEventListener('change', (e) => {
      isVegOnly = e.target.checked;
      applyFiltersAndRender();
    });

    document.getElementById('menuSortSelect')?.addEventListener('change', (e) => {
      currentSort = e.target.value;
      applyFiltersAndRender();
    });
  }
});
