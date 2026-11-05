const API = 'https://dummyjson.com';
let products = [];
let visibleProducts = [];
let toastTimer;
const $ = (selector) => document.querySelector(selector);
const list = $('#product-list');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

async function loadProducts() {
  $('#loading-state').hidden = false;
  $('#empty-state').hidden = true;
  try {
    const response = await fetch(`${API}/products?limit=100`);
    if (!response.ok) throw new Error('Could not load the catalog.');
    const data = await response.json();
    products = data.products || [];
    populateCategories();
    updateStats();
    renderProducts();
  } catch (error) {
    list.innerHTML = `<tr><td colspan="6" class="error-cell">${escapeHtml(error.message)} Check your connection and refresh.</td></tr>`;
    $('#result-count').textContent = 'Unable to load products';
    showToast('Could not connect to DummyJSON. Please try again.');
  } finally {
    $('#loading-state').hidden = true;
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
  list.innerHTML = visibleProducts.map(product => {
    const stockClass = product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : '';
    const stockLabel = product.stock === 0 ? 'Out of stock' : `${product.stock} units`;
    const image = product.thumbnail || product.images?.[0] || '';
    return `<tr>
      <td><div class="product-info"><img class="product-thumb" src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div><div class="product-name" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</div><div class="product-brand">${escapeHtml(product.brand || '—')}</div></div></div></td>
      <td><span class="category-pill">${escapeHtml((product.category || 'other').replaceAll('-', ' '))}</span></td>
      <td class="price">$${Number(product.price).toFixed(2)}</td>
      <td><span class="stock ${stockClass}"><i class="stock-dot"></i>${stockLabel}</span></td>
      <td class="rating"><span>★</span>${Number(product.rating || 0).toFixed(1)}</td>
      <td class="actions"><button class="row-action" data-action="edit" data-id="${product.id}" aria-label="Edit ${escapeHtml(product.title)}" title="Edit">✎</button><button class="row-action" data-action="delete" data-id="${product.id}" aria-label="Delete ${escapeHtml(product.title)}" title="Delete">⌫</button></td>
    </tr>`;
  }).join('');
  $('#empty-state').hidden = visibleProducts.length > 0;
  $('#result-count').textContent = `Showing ${visibleProducts.length} of ${products.length} products`;
  $('#loading-state').hidden = true;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

const dialog = $('#product-dialog');
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

$('#add-product').addEventListener('click', () => openDialog());
$('#close-dialog').addEventListener('click', () => dialog.close());
$('#cancel-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
$('#search').addEventListener('input', renderProducts);
$('#category-filter').addEventListener('change', renderProducts);
$('#sort-filter').addEventListener('change', renderProducts);
$('#refresh-button').addEventListener('click', loadProducts);
$('#clear-filters').addEventListener('click', () => { $('#search').value = ''; $('#category-filter').value = 'all'; $('#sort-filter').value = 'featured'; renderProducts(); });
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
    updateStats(); populateCategories(); renderProducts();
    showToast('Product deleted.');
  } catch { showToast('Could not delete this product. Try again.'); }
});

$('#product-form').addEventListener('submit', async event => {
  event.preventDefault();
  const id = $('#product-id').value;
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
    updateStats(); populateCategories(); renderProducts(); dialog.close();
    showToast(id ? 'Product updated.' : 'Product added.');
  } catch { showToast('Could not save this product. Try again.'); }
  finally { button.disabled = false; button.textContent = id ? 'Save changes' : 'Add product'; }
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search').focus(); }
});

loadProducts();
