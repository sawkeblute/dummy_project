
// Application entry point: shared navigation and initial data load.
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  setView(link.dataset.view);
}));
$('.brand').addEventListener('click', event => { event.preventDefault(); setView('products'); });
$('#notifications-button').addEventListener('click', () => {
  $('.notification-dot').hidden = true;
  showToast(activity.length ? `You have ${activity.length} catalog update${activity.length === 1 ? '' : 's'} this session.` : 'You’re all caught up.');
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
