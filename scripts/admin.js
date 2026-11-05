
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
