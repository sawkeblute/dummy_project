const API = 'https://dummyjson.com';
const PAGE_SIZE = 10;
let products = [];
let visibleProducts = [];
let currentPage = 1;
let activity = [];
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
    const image = product.thumbnail || product.images?.[0] || '';
    return `<tr>
      <td><div class="product-info"><img class="product-thumb" src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div><div class="product-name" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</div><div class="product-brand">${escapeHtml(product.brand || '—')}</div></div></div></td>
      <td><span class="category-pill">${escapeHtml((product.category || 'other').replaceAll('-', ' '))}</span></td>
      <td class="price">$${Number(product.price).toFixed(2)}</td>
      <td><span class="stock ${stockClass}"><i class="stock-dot"></i>${stockLabel}</span></td>
      <td class="rating"><span>★</span>${Number(product.rating || 0).toFixed(1)}</td>
      <td class="actions"><button class="row-action" data-action="edit" data-id="${escapeHtml(product.id)}" aria-label="Edit ${escapeHtml(product.title)}" title="Edit">✎</button><button class="row-action" data-action="delete" data-id="${escapeHtml(product.id)}" aria-label="Delete ${escapeHtml(product.title)}" title="Delete">⌫</button></td>
    </tr>`;
  }).join('');
  $('#empty-state').hidden = visibleProducts.length > 0;
  const shownEnd = Math.min(start + PAGE_SIZE, visibleProducts.length);
  $('#result-count').textContent = visibleProducts.length ? `Showing ${start + 1}–${shownEnd} of ${visibleProducts.length} products` : 'Showing 0 products';
  $('#page-current').textContent = `${currentPage} / ${pageCount}`;
  $('#previous-page').disabled = currentPage <= 1;
  $('#next-page').disabled = currentPage >= pageCount;
  $('#loading-state').hidden = true;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
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
$('#notifications-button').addEventListener('click', () => {
  $('.notification-dot').hidden = true;
  showToast(activity.length ? `You have ${activity.length} catalog update${activity.length === 1 ? '' : 's'} this session.` : 'You’re all caught up.');
});

$('#product-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const product = products.find(item => String(item.id) === button.dataset.id);
  if (!product) return;
  if (button.dataset.action === 'edit') return openDialog(product);
  if (!confirm(`Delete “${product.title}” from the catalog?`)) return;
  try {
    const response = await fetch(`${API}/products/${product.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error();
    products = products.filter(item => item.id !== product.id);
    updateStats(); populateCategories(); currentPage = 1; renderProducts();
    addActivity('Product deleted', product.title);
    showToast('Product deleted.');
  } catch { showToast('Could not delete this product. Try again.'); }
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
setView(location.hash === '#activity' ? 'activity' : 'products');
loadProducts();
