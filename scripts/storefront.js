
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
$('#store-product-grid').addEventListener('click', handleProductAction);
$('#deal-feature').addEventListener('click', handleProductAction);
$('#deal-product-grid').addEventListener('click', handleProductAction);
