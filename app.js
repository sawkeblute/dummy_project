const API = 'https://dummyjson.com';
const PAGE_SIZE = 10;
let products = [];
let visibleProducts = [];
let currentPage = 1;
let activity = [];
let cart = new Map();
let layout = 'list';
let storeCategory = 'all';
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const list = $('#product-list');
const dialog = $('#product-dialog');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function addActivity(action, detail) {
  activity.unshift({ action, detail, time: new Date() });
  renderActivity();
}

function renderActivity() {
  const container = $('#activity-list');
  if (!activity.length) {
    container.innerHTML = '<div class="activity-empty">No catalog activity yet. Add, edit, or remove a product to see updates here.</div>';
    return;
  }
  container.innerHTML = activity.map(item => `<article class="activity-item"><span class="activity-marker"></span><div class="activity-copy"><b>${escapeHtml(item.action)}</b><span>${escapeHtml(item.detail)}</span></div><time>${item.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></article>`).join('');
}

function setView(view) {
  const isActivity = view === 'activity';
  document.querySelectorAll('[data-view]').forEach(link => {
    const selected = link.dataset.view === view;
    link.classList.toggle('active', selected);
    link.classList.toggle('muted', !selected);
    link.setAttribute('aria-current', selected ? 'page' : 'false');
  });
  document.querySelectorAll('[data-products-only]').forEach(element => { element.hidden = isActivity; });
  $('#activity-view').hidden = !isActivity;
  $('#breadcrumb-current').textContent = isActivity ? 'Activity' : 'Products';
  $('#page-eyebrow').textContent = isActivity ? 'STORE UPDATES' : 'YOUR INVENTORY';
  $('#page-title').textContent = isActivity ? 'Activity' : 'Products';
  $('#page-subtitle').textContent = isActivity ? 'A timeline of changes made to your catalog.' : 'Manage and organize your store catalog.';
  $('#heading-count').hidden = isActivity;
  $('#add-product').hidden = isActivity;
  history.replaceState(null, '', isActivity ? '#activity' : '#catalog');
}

async function loadProducts() {
  $('#loading-state').hidden = false;
  $('#empty-state').hidden = true;
  $('#refresh-button').disabled = true;
  try {
    const response = await fetch(`${API}/products?limit=100`);
    if (!response.ok) throw new Error('Could not load the catalog.');
    const data = await response.json();
    products = data.products || [];
    currentPage = 1;
    populateCategories();
    updateStats();
    renderProducts();
    addActivity('Catalog refreshed', `${products.length} products loaded from DummyJSON.`);
  } catch (error) {
    list.innerHTML = `<tr><td colspan="6" class="error-cell">${escapeHtml(error.message)} Check your connection and refresh.</td></tr>`;
    $('#result-count').textContent = 'Unable to load products';
    showToast('Could not connect to DummyJSON. Please try again.');
  } finally {
    $('#loading-state').hidden = true;
    $('#refresh-button').disabled = false;
  }
}

function populateCategories() {
  const select = $('#category-filter');
  const current = select.value;
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All categories</option>' + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category.replaceAll('-', ' '))}</option>`).join('');
  if (categories.includes(current)) select.value = current;
}

function updateStats() {
  const categories = new Set(products.map(p => p.category));
  const average = products.length ? products.reduce((sum, p) => sum + (Number(p.rating) || 0), 0) / products.length : 0;
  $('#side-count').textContent = products.length;
  $('#heading-count').textContent = products.length;
  $('#stat-total').textContent = products.length.toLocaleString();
  $('#stat-categories').textContent = categories.size;
  $('#stat-rating').textContent = average ? average.toFixed(1) : '—';
  $('#stat-stock').textContent = products.filter(p => p.stock < 10).length;
}

function icon(name) {
  const paths = {
    view: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
    bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function renderProducts() {
  const query = $('#search').value.trim().toLowerCase();
  const category = $('#category-filter').value;
  const sort = $('#sort-filter').value;
  visibleProducts = products.filter(product => {
    const matchesText = !query || `${product.title} ${product.brand || ''} ${product.category}`.toLowerCase().includes(query);
    return matchesText && (category === 'all' || product.category === category);
  });
  if (sort === 'title-asc') visibleProducts.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'price-asc') visibleProducts.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') visibleProducts.sort((a, b) => b.price - a.price);
  if (sort === 'rating-desc') visibleProducts.sort((a, b) => b.rating - a.rating);

  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageProducts = visibleProducts.slice(start, start + PAGE_SIZE);
  list.innerHTML = pageProducts.map(product => {
    const stockClass = product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : '';
    const stockLabel = product.stock === 0 ? 'Out of stock' : `${product.stock} units`;
    const image = product.images?.[0] || product.thumbnail || '';
    return `<tr>
      <td><button class="product-info product-open" data-action="view" data-id="${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.title)}"><img class="product-thumb" src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span><span class="product-name" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</span><span class="product-brand">${escapeHtml(product.brand || '—')}</span></span></button></td>
      <td><span class="category-pill">${escapeHtml((product.category || 'other').replaceAll('-', ' '))}</span></td>
      <td class="price">$${Number(product.price).toFixed(2)}</td>
      <td><span class="stock ${stockClass}"><i class="stock-dot"></i>${stockLabel}</span></td>
      <td class="rating"><span>★</span>${Number(product.rating || 0).toFixed(1)}</td>
      <td class="actions"><button class="row-action" data-action="view" data-id="${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.title)}" title="View">${icon('view')}</button><button class="row-action" data-action="edit" data-id="${escapeHtml(product.id)}" aria-label="Edit ${escapeHtml(product.title)}" title="Edit">${icon('edit')}</button><button class="row-action delete-action" data-action="delete" data-id="${escapeHtml(product.id)}" aria-label="Delete ${escapeHtml(product.title)}" title="Delete">${icon('trash')}</button></td>
    </tr>`;
  }).join('');
  $('#product-grid').innerHTML = pageProducts.length ? pageProducts.map(product => {
    const image = product.images?.[0] || product.thumbnail || '';
    const stockClass = product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : '';
    return `<article class="product-card">
      <button class="grid-image-button" data-action="view" data-id="${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.title)}"><img class="grid-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.style.visibility='hidden'"><span class="grid-category">${escapeHtml((product.category || 'other').replaceAll('-', ' '))}</span></button>
      <div class="grid-card-body"><div class="grid-card-meta"><span>${escapeHtml(product.brand || 'Stable collection')}</span><span class="stock ${stockClass}"><i class="stock-dot"></i>${product.stock} in stock</span></div>
      <button class="grid-title" data-action="view" data-id="${escapeHtml(product.id)}">${escapeHtml(product.title)}</button><div class="grid-rating"><span>★</span> ${Number(product.rating || 0).toFixed(1)} <span class="grid-reviews">· ${Number(product.reviews?.length || 0)} reviews</span></div>
      <div class="grid-card-bottom"><strong>$${Number(product.price).toFixed(2)}</strong><button class="grid-view-link" data-action="view" data-id="${escapeHtml(product.id)}">View details <span>↗</span></button></div></div>
    </article>`;
  }).join('') : '<div class="grid-empty"><b>No products found</b><span>Try adjusting your search or filters.</span><button class="text-button" id="clear-grid-filters">Clear filters</button></div>';
  $('#table-wrap').hidden = layout === 'grid';
  $('#product-grid').hidden = layout !== 'grid';
  $('#empty-state').hidden = visibleProducts.length > 0;
  const shownEnd = Math.min(start + PAGE_SIZE, visibleProducts.length);
  $('#result-count').textContent = visibleProducts.length ? `Showing ${start + 1}–${shownEnd} of ${visibleProducts.length} products` : 'Showing 0 products';
  $('#page-current').textContent = `${currentPage} / ${pageCount}`;
  $('#previous-page').disabled = currentPage <= 1;
  $('#next-page').disabled = currentPage >= pageCount;
  $('#loading-state').hidden = true;
  renderStorefront();
}

function renderStorefront() {
  const container = $('#store-product-grid');
  if (!container) return;
  const query = $('#store-search').value.trim().toLowerCase();
  const sort = $('#store-sort').value;
  const categories = [...new Set(products.map(product => product.category).filter(Boolean))].sort();
  $('#store-categories').innerHTML = `<button class="category-chip ${storeCategory === 'all' ? 'active' : ''}" data-store-category="all">All pieces</button>` + categories.map(category => `<button class="category-chip ${storeCategory === category ? 'active' : ''}" data-store-category="${escapeHtml(category)}">${escapeHtml(category.replaceAll('-', ' '))}</button>`).join('');
  let collection = products.filter(product => {
    const matchesQuery = !query || `${product.title} ${product.brand || ''} ${product.category} ${product.description || ''}`.toLowerCase().includes(query);
    return matchesQuery && (storeCategory === 'all' || product.category === storeCategory);
  });
  if (sort === 'title-asc') collection.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'price-asc') collection.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') collection.sort((a, b) => b.price - a.price);
  if (sort === 'rating-desc') collection.sort((a, b) => b.rating - a.rating);
  container.innerHTML = collection.map((product, index) => {
    const image = product.images?.[0] || product.thumbnail || '';
    return `<article class="store-product-card ${index === 0 ? 'store-featured-card' : ''}"><button class="store-card-image" data-action="view" data-id="${escapeHtml(product.id)}" aria-label="View ${escapeHtml(product.title)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.style.visibility='hidden'"><span class="store-card-category">${escapeHtml((product.category || 'collection').replaceAll('-', ' '))}</span>${index < 3 ? '<span class="store-card-new">CURATED</span>' : ''}</button><div class="store-card-info"><div class="store-card-title-row"><div><button class="store-card-title" data-action="view" data-id="${escapeHtml(product.id)}">${escapeHtml(product.title)}</button><span class="store-card-brand">${escapeHtml(product.brand || 'Stable collection')}</span></div><span class="store-card-rating">★ ${Number(product.rating || 0).toFixed(1)}</span></div><div class="store-card-purchase"><strong>$${Number(product.price).toFixed(2)}</strong><button class="store-add-button" data-action="add-cart" data-id="${escapeHtml(product.id)}" ${product.stock < 1 ? 'disabled' : ''}>Add to bag <span>＋</span></button></div></div></article>`;
  }).join('');
  $('#store-empty').hidden = collection.length > 0;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  $('#theme-icon').textContent = light ? '☾' : '☼';
  document.querySelectorAll('[data-theme-icon]').forEach(icon => { icon.textContent = light ? '☾' : '☼'; });
  document.querySelectorAll('[data-theme-toggle]').forEach(button => button.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`));
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
  try { localStorage.setItem('stable-theme', light ? 'light' : 'dark'); } catch { /* Theme still applies when storage is unavailable. */ }
}

function setMode(customerMode) {
  const shell = $('.app-shell');
  shell.classList.toggle('customer-mode', customerMode);
  if (customerMode) setView('products');
  document.querySelectorAll('[data-admin-only]').forEach(element => { element.hidden = customerMode; });
  document.querySelectorAll('[data-customer-only]').forEach(element => { element.hidden = !customerMode; });
  $('#storefront-view').hidden = !customerMode;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openDialog(product = null) {
  $('#product-form').reset();
  $('#product-id').value = product?.id ?? '';
  $('#dialog-title').textContent = product ? 'Edit product' : 'Add product';
  $('#save-product').textContent = product ? 'Save changes' : 'Add product';
  if (product) {
    $('#input-title').value = product.title || '';
    $('#input-price').value = product.price ?? '';
    $('#input-stock').value = product.stock ?? '';
    $('#input-category').value = product.category || '';
    $('#input-description').value = product.description || '';
  }
  dialog.showModal();
  $('#input-title').focus();
}

function openDetails(product) {
  const image = product.images?.[0] || product.thumbnail || '';
  const stockLabel = product.stock > 0 ? `${product.stock} available` : 'Out of stock';
  const purchase = $('.app-shell').classList.contains('customer-mode') ? `<div class="detail-purchase"><label for="detail-quantity">Quantity</label><input id="detail-quantity" type="number" min="1" max="${Math.max(1, Number(product.stock) || 0)}" value="1" ${product.stock < 1 ? 'disabled' : ''}><button class="primary-button" data-action="add-cart" data-id="${escapeHtml(product.id)}" ${product.stock < 1 ? 'disabled' : ''}>${icon('bag')} Add to bag</button></div><p class="purchase-note">Demo checkout · No payment details required</p>` : '';
  $('#details-content').innerHTML = `<div class="dialog-head details-top"><span class="eyebrow">PRODUCT DETAILS</span><button type="button" class="close-button" data-close="details-dialog" aria-label="Close">×</button></div><div class="details-layout"><div class="details-image-wrap"><img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" class="details-image" onerror="this.style.visibility='hidden'"></div><div class="details-info"><span class="category-pill">${escapeHtml((product.category || 'other').replaceAll('-', ' '))}</span><h2>${escapeHtml(product.title)}</h2><p class="details-brand">${escapeHtml(product.brand || 'Stable collection')}</p><div class="details-rating"><span>★</span> ${Number(product.rating || 0).toFixed(1)} <span>·</span> ${escapeHtml(stockLabel)}</div><strong class="details-price">$${Number(product.price).toFixed(2)}</strong><p class="details-description">${escapeHtml(product.description || 'A considered addition to your collection.')}</p>${purchase}</div></div>`;
  $('#details-dialog').showModal();
}

function addToCart(product, quantity = 1) {
  const current = cart.get(product.id)?.quantity || 0;
  const amount = Math.max(1, Math.floor(Number(quantity) || 1));
  if (current + amount > product.stock) return showToast(`Only ${product.stock} available.`);
  cart.set(product.id, { product, quantity: current + amount });
  renderCart();
  addActivity('Added to bag', `${product.title} · ${amount} item${amount === 1 ? '' : 's'}`);
  showToast(`${product.title} added to your bag.`);
}

function renderCart() {
  const entries = [...cart.values()];
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  $('#cart-count').textContent = count;
  document.querySelectorAll('.bag-count').forEach(badge => { badge.textContent = count; });
  $('#cart-items').innerHTML = entries.length ? entries.map(({ product, quantity }) => `<article class="cart-item"><img src="${escapeHtml(product.images?.[0] || product.thumbnail || '')}" alt="" onerror="this.style.visibility='hidden'"><div class="cart-item-copy"><b>${escapeHtml(product.title)}</b><span>$${Number(product.price).toFixed(2)}</span><div class="quantity-control"><button data-cart-action="decrease" data-id="${escapeHtml(product.id)}" aria-label="Decrease quantity">−</button><span>${quantity}</span><button data-cart-action="increase" data-id="${escapeHtml(product.id)}" aria-label="Increase quantity">+</button><button class="cart-remove" data-cart-action="remove" data-id="${escapeHtml(product.id)}">Remove</button></div></div><strong class="cart-line-total">$${(product.price * quantity).toFixed(2)}</strong></article>`).join('') : '<div class="cart-empty"><span>♧</span><b>Your bag is empty</b><small>Explore the catalog and add something you like.</small></div>';
  const subtotal = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  $('#cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  $('#checkout-button').disabled = !entries.length;
}

document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  setView(link.dataset.view);
}));
$('.brand').addEventListener('click', event => { event.preventDefault(); setView('products'); });
$('#add-product').addEventListener('click', () => openDialog());
$('#close-dialog').addEventListener('click', () => dialog.close());
$('#cancel-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
$('#search').addEventListener('input', () => { currentPage = 1; renderProducts(); });
$('#category-filter').addEventListener('change', () => { currentPage = 1; renderProducts(); });
$('#sort-filter').addEventListener('change', () => { currentPage = 1; renderProducts(); });
$('#refresh-button').addEventListener('click', loadProducts);
$('#previous-page').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderProducts(); } });
$('#next-page').addEventListener('click', () => { if (currentPage < Math.ceil(visibleProducts.length / PAGE_SIZE)) { currentPage++; renderProducts(); } });
$('#clear-filters').addEventListener('click', () => { $('#search').value = ''; $('#category-filter').value = 'all'; $('#sort-filter').value = 'featured'; currentPage = 1; renderProducts(); });
$('#product-grid').addEventListener('click', event => {
  if (event.target.closest('#clear-grid-filters')) $('#clear-filters').click();
});
$('#notifications-button').addEventListener('click', () => {
  $('.notification-dot').hidden = true;
  showToast(activity.length ? `You have ${activity.length} catalog update${activity.length === 1 ? '' : 's'} this session.` : 'You’re all caught up.');
});

$('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light')));
$('#profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$('#list-view-button').addEventListener('click', () => setLayout('list'));
$('#grid-view-button').addEventListener('click', () => setLayout('grid'));
function setLayout(value) {
  layout = value;
  $('#list-view-button').classList.toggle('active', value === 'list');
  $('#grid-view-button').classList.toggle('active', value === 'grid');
  $('#list-view-button').setAttribute('aria-pressed', String(value === 'list'));
  $('#grid-view-button').setAttribute('aria-pressed', String(value === 'grid'));
  renderProducts();
}
$('#cart-button').addEventListener('click', () => { renderCart(); $('#cart-dialog').showModal(); });
document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', () => { renderCart(); $('#cart-dialog').showModal(); }));
$('#mode-toggle').addEventListener('click', () => setMode(true));
$('#admin-mode-toggle').addEventListener('click', () => setMode(false));
$('#store-search').addEventListener('input', renderStorefront);
$('#store-sort').addEventListener('change', renderStorefront);
$('#store-categories').addEventListener('click', event => {
  const chip = event.target.closest('[data-store-category]');
  if (!chip) return;
  storeCategory = chip.dataset.storeCategory;
  renderStorefront();
});
$('#store-clear').addEventListener('click', () => {
  $('#store-search').value = '';
  storeCategory = 'all';
  $('#store-sort').value = 'featured';
  renderStorefront();
});

async function handleProductAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const product = products.find(item => String(item.id) === button.dataset.id);
  if (!product) return;
  if (button.dataset.action === 'view') return openDetails(product);
  if (button.dataset.action === 'edit') return openDialog(product);
  if (button.dataset.action === 'add-cart') {
    const quantity = button.closest('.detail-purchase') ? $('#detail-quantity').value : 1;
    addToCart(product, quantity);
    if ($('#details-dialog').open) $('#details-dialog').close();
    return;
  }
  if (button.dataset.action !== 'delete') return;
  if (!confirm(`Delete “${product.title}” from the catalog?`)) return;
  try {
    const response = await fetch(`${API}/products/${product.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error();
    products = products.filter(item => item.id !== product.id);
    cart.delete(product.id); renderCart();
    updateStats(); populateCategories(); currentPage = 1; renderProducts();
    addActivity('Product deleted', product.title);
    showToast('Product deleted.');
  } catch { showToast('Could not delete this product. Try again.'); }
}

$('#product-list').addEventListener('click', handleProductAction);
$('#product-grid').addEventListener('click', handleProductAction);
$('#store-product-grid').addEventListener('click', handleProductAction);
$('#details-content').addEventListener('click', event => {
  if (event.target.closest('[data-close]')) return $('#details-dialog').close();
  handleProductAction(event);
});

$('#cart-items').addEventListener('click', event => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const id = products.find(product => String(product.id) === button.dataset.id)?.id;
  const entry = cart.get(id);
  if (!entry) return;
  const action = button.dataset.cartAction;
  if (action === 'remove' || (action === 'decrease' && entry.quantity <= 1)) cart.delete(id);
  else if (action === 'decrease') entry.quantity--;
  else if (action === 'increase') {
    if (entry.quantity >= entry.product.stock) return showToast(`Only ${entry.product.stock} available.`);
    entry.quantity++;
  }
  renderCart();
});

$('#checkout-button').addEventListener('click', () => {
  if (!cart.size) return;
  const purchased = [...cart.values()];
  const subtotal = purchased.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  purchased.forEach(({ product, quantity }) => { product.stock = Math.max(0, product.stock - quantity); });
  cart.clear(); renderCart(); updateStats(); renderProducts();
  $('#cart-dialog').close();
  addActivity('Demo checkout completed', `${purchased.length} product type(s) · $${subtotal.toFixed(2)}. No payment was processed.`);
  showToast('Demo checkout complete. No payment was processed.');
});

$('#product-form').addEventListener('submit', async event => {
  event.preventDefault();
  const id = $('#product-id').value;
  const original = id ? products.find(product => String(product.id) === id) : null;
  const payload = {
    title: $('#input-title').value.trim(),
    price: Number($('#input-price').value),
    stock: Number($('#input-stock').value),
    category: $('#input-category').value.trim().toLowerCase().replace(/\s+/g, '-'),
    description: $('#input-description').value.trim()
  };
  const button = $('#save-product');
  button.disabled = true; button.textContent = 'Saving…';
  try {
    const response = await fetch(`${API}/products/${id ? id : 'add'}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error();
    const saved = await response.json();
    if (id) {
      const index = products.findIndex(product => String(product.id) === id);
      if (index >= 0) products[index] = { ...products[index], ...payload };
    } else {
      products.unshift({ ...payload, ...saved, id: `local-${Date.now()}`, rating: 0, thumbnail: '' });
    }
    updateStats(); populateCategories(); currentPage = 1; renderProducts(); dialog.close();
    addActivity(id ? 'Product updated' : 'Product added', id ? `${original?.title || 'Product'} → ${payload.title}` : payload.title);
    showToast(id ? 'Product updated.' : 'Product added.');
  } catch { showToast('Could not save this product. Try again.'); }
  finally { button.disabled = false; button.textContent = id ? 'Save changes' : 'Add product'; }
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search').focus(); setView('products'); }
});

renderActivity();
let savedTheme = 'dark';
try { savedTheme = localStorage.getItem('stable-theme') || 'dark'; } catch { /* Use the default theme when storage is unavailable. */ }
setTheme(savedTheme);
renderCart();
setView(location.hash === '#activity' ? 'activity' : 'products');
loadProducts();
