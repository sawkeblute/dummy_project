
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

