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


$('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light')));
$('#profile-button').addEventListener('click', () => $('#profile-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$('#mode-toggle').addEventListener('click', () => setMode(true));
$('#admin-mode-toggle').addEventListener('click', () => setMode(false));
