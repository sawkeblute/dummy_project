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
$('#details-content').addEventListener('click', event => {
  if (event.target.closest('[data-close]')) return $('#details-dialog').close();
  handleProductAction(event);
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

