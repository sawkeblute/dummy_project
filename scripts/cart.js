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


$('#cart-button').addEventListener('click', () => { renderCart(); $('#cart-dialog').showModal(); });
document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', () => { renderCart(); $('#cart-dialog').showModal(); }));
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

