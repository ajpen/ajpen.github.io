import { categoriesFor, categoryFor, categoryKey, normalizeCategory, localDay, localInput, addDays, amountToCents, periodRange, previousRange, daysInRange, inRange, totalCents, trendBuckets, exportCSV, importCSV } from './core.js';
import * as db from './storage.js';
import { installURLTransactions } from './url-entry.js';

const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  overview: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  transactions: '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M8 8h11m-4-4 4 4-4 4M16 16H5m4-4-4 4 4 4"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  settings: '<path d="m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3z"/><circle cx="12" cy="11" r="3"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  right: '<path d="m9 5 7 7-7 7"/>', left: '<path d="m15 5-7 7 7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M8 15h2m4 0h2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  coffee: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 9h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"/>',
  bag: '<path d="M5 7h14l2 14H3zM8 8V6a4 4 0 0 1 8 0v2"/>',
  car: '<path d="m5 8 2-4h10l2 4M3 15V9l3-1h12l3 1v6H3zm2 0v4m14-4v4M6 11h2m8 0h2"/>',
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  play: '<rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 8 6 4-6 4z"/>',
  heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 1 11 8 16 7-5 13-11 8-16z"/>',
  grid: '<circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7m0 5h-6v5h6M17 14.5h.1"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const app = document.querySelector('#app');
const dialogs = document.querySelector('#dialogs');
let transactions = [];
let settings = { currency: 'USD', reminderDays: 14, lastExport: null, reminderSnooze: null, quickLaunch: false, created: new Date().toISOString() };
let state = { page: 'overview', period: 'monthly', anchor: new Date(), custom: null, search: '', category: '', demo: false };
let demoTransactions = [];
let persistent = false;
let toastTimer;
let urlNotice = null;
let channel = 'BroadcastChannel' in window ? new BroadcastChannel('penny-changes') : null;
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency }).format(cents / 100);
const records = () => state.demo ? demoTransactions : transactions;
const range = () => periodRange(state.period, state.anchor, state.custom);
const currentRecords = () => inRange(records(), range()).sort((a, b) => new Date(b.date) - new Date(a.date));
const shortDate = date => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function rangeLabel() {
  const r = range();
  if (state.period === 'monthly') return r.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if (state.period === 'daily') return r.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${shortDate(r.start)} – ${shortDate(addDays(r.end, -1))}, ${r.start.getFullYear()}`;
}
function navItem(page, label, symbol) { return `<button class="nav-item ${state.page === page ? 'active' : ''}" data-page="${page}" ${state.page === page ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${page === 'overview' ? '<span class="nav-dot"></span>' : ''}</button>`; }
function render() {
  const titles = { overview: ['Your spending, at a glance.', 'A little clarity goes a long way.'], transactions: ['The little things add up.', 'All your everyday spending, in one place.'], insights: ['Find your spending rhythm.', 'A closer look at where your money goes.'], settings: ['Make yourself at home.', 'Your preferences. Your data. Your control.'] };
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="./" aria-label="Penny home"><span class="brand-icon">p<span>•</span></span>penny<span class="brand-period">.</span></a><div class="workspace-label">YOUR MONEY, SIMPLIFIED</div><nav aria-label="Main navigation">${navItem('overview', 'Overview', 'overview')}${navItem('transactions', 'Transactions', 'transactions')}${navItem('insights', 'Insights', 'chart')}${navItem('settings', 'Settings', 'settings')}</nav><div class="sidebar-bottom"><div class="local-card">${icon('shield')}<strong>Just you and your money.</strong><p>Your data stays on this device.<br>No accounts. No cloud. All yours.</p><span><i></i> Private by design</span></div><div class="sidebar-footer"><span class="mini-logo">p.</span> A little more peace of mind.</div></div></aside>
  <div class="main-shell"><header class="topbar"><div class="breadcrumb">My workspace <span>/</span> <strong>${state.page[0].toUpperCase() + state.page.slice(1)}</strong></div><span class="device-label">${icon('shield')} On-device storage</span><button class="avatar" data-page="settings" aria-label="Open settings">P</button></header><main id="main"><section class="page-heading"><div><div class="eyebrow">${state.page === 'overview' ? 'A PENNY FOR YOUR PEACE OF MIND' : 'A LITTLE MORE CLARITY'}</div><h1>${titles[state.page][0]}</h1><p>${titles[state.page][1]}</p></div><button class="button primary desktop-add" data-action="add">${icon('plus')} Add transaction</button></section>
  ${state.demo ? `<div class="demo-banner">${icon('spark')}<span>You’re exploring sample data. Your own records are separate.</span><button data-action="demo-exit">Exit preview ${icon('close')}</button></div>` : ''}
  ${backupDue() ? `<div class="backup-banner">${icon('download')}<span><strong>A little backup goes a long way.</strong> It’s time to export your transactions.</span><button data-action="export">Export CSV</button><button class="icon-button" data-action="snooze" aria-label="Remind me tomorrow">${icon('close')}</button></div>` : ''}
  ${urlNotice ? `<div class="url-entry-notice ${urlNotice.error ? 'error' : ''}" role="${urlNotice.error ? 'alert' : 'status'}">${icon(urlNotice.error ? 'close' : 'check')}<span>${escape(urlNotice.message)}</span><button class="icon-button" data-action="dismiss-url-notice" aria-label="Dismiss URL entry result">${icon('close')}</button></div>` : ''}
  ${state.page !== 'settings' ? periodControls() : ''}
  ${state.page === 'overview' ? overview() : state.page === 'transactions' ? transactionPage() : state.page === 'insights' ? insights() : settingsPage()}
  <footer class="main-footer"><span>${icon('shield')} A private space for your everyday spending.</span><span>Made for a little more clarity <span class="footer-spark">✧</span></span></footer></main></div>
  <button class="mobile-add" data-action="add" aria-label="Add transaction">${icon('plus')}<span>Add transaction</span></button><nav class="mobile-nav" aria-label="Mobile navigation">${navItem('overview', 'Overview', 'overview')}${navItem('transactions', 'Activity', 'transactions')}${navItem('insights', 'Insights', 'chart')}${navItem('settings', 'Settings', 'settings')}</nav>`;
}
function backupDue() {
  if (state.demo || !transactions.length) return false;
  const since = new Date(settings.lastExport || settings.created);
  return Date.now() - since.getTime() >= settings.reminderDays * 86400000 && (!settings.reminderSnooze || Date.now() >= new Date(settings.reminderSnooze).getTime());
}
function periodControls() {
  return `<section class="period-toolbar" aria-label="Spending period"><div class="segmented" role="group" aria-label="Period">${[['monthly', 'Monthly'], ['biweekly', 'Biweekly'], ['weekly', 'Weekly'], ['daily', 'Daily']].map(([key, label]) => `<button data-period="${key}" aria-pressed="${state.period === key}" class="${state.period === key ? 'selected' : ''}">${label}</button>`).join('')}</div><div class="date-controls"><button class="icon-button" data-action="previous" aria-label="Previous period">${icon('left')}</button><button class="date-range ${state.period === 'custom' ? 'custom-active' : ''}" data-action="range">${icon('calendar')}<span>${rangeLabel()}</span>${icon('down')}</button><button class="icon-button" data-action="next" aria-label="Next period">${icon('right')}</button></div></section>`;
}
function summaryCards() {
  const items = currentRecords(), total = totalCents(items), prior = totalCents(inRange(records(), previousRange(state.period, range())));
  const change = prior ? Math.round((total - prior) / prior * 100) : null;
  const activeDays = Math.max(1, Math.min(daysInRange(range()), daysInRange({ start: range().start, end: addDays(new Date(), 1) })));
  const average = total / (range().start > new Date() ? daysInRange(range()) : activeDays);
  const groups = categoriesFor(records()).map(c => ({ ...c, total: totalCents(items.filter(t => categoryKey(t.category) === categoryKey(c.id))) })).sort((a, b) => b.total - a.total);
  return `<section class="summary-grid" aria-label="Spending summary"><article class="summary-card total-card"><div class="metric-label">Total spent <span class="metric-icon">${icon('wallet')}</span></div><div class="metric-value">${money(total)}</div><div class="metric-foot">${change !== null ? `<span class="change ${change > 0 ? 'up' : ''}">${icon(change > 0 ? 'arrow' : 'down')} ${Math.abs(change)}%</span><span>vs. previous period</span>` : `<span class="neutral-pill">${icon('clock')} ${items.length ? 'A fresh perspective' : 'A fresh start'}</span><span>${items.length ? 'Your spending so far' : 'Your story starts here'}</span>`}</div></article>
  <article class="summary-card"><div class="metric-label">Daily average <span class="metric-icon soft">${icon('chart')}</span></div><div class="metric-value">${money(average)}</div><div class="metric-foot"><span>Across ${range().start <= new Date() && range().end > new Date() ? 'elapsed days this period' : 'the selected period'}</span></div></article>
  <article class="summary-card"><div class="metric-label">Top category <span class="metric-icon soft">${icon(groups[0].total ? groups[0].icon : 'grid')}</span></div><div class="metric-value category-value">${groups[0].total ? groups[0].name : 'Room to discover'}</div><div class="metric-foot">${groups[0].total ? `<i class="color-dot" style="--dot:${groups[0].color}"></i><strong>${money(groups[0].total)}</strong><span>· ${Math.round(groups[0].total / total * 100)}% of spending</span>` : '<span>Add a transaction to find your patterns</span>'}</div></article></section>`;
}
function overview() { return `${summaryCards()}<section class="chart-grid">${trendCard()}${categoryCard()}</section>${transactionCard(true)}<div class="gentle-note">${icon('spark')}<span>Small moments. Clearer money habits. <strong>One penny at a time.</strong></span></div>`; }
function trendCard() {
  const buckets = trendBuckets(records(), range());
  const max = Math.max(...buckets.map(b => b.value), 10000);
  const filled = buckets.some(b => b.value);
  return `<article class="panel trend-panel"><div class="panel-heading"><div><h2>Spending over time</h2><p>Your everyday expenses, in perspective.</p></div><span class="chart-key"><i></i> Spending</span></div><div class="bar-chart ${filled ? '' : 'chart-empty'}" role="group" aria-label="Spending chart for ${escape(rangeLabel())}. Total ${escape(money(totalCents(currentRecords())))}. Each bar has a date and amount on focus."><div class="y-labels"><span>${money(max)}</span><span>${money(max / 2)}</span><span>${money(0)}</span></div><div class="plot"><div class="grid-lines"><i></i><i></i><i></i></div><div class="bars">${buckets.map((b, i) => `<button class="bar-slot" data-tip="${escape((daysInRange(range()) === 1 ? b.start.toLocaleTimeString('en-US', { hour: 'numeric' }) : shortDate(b.start)) + ': ' + money(b.value))}" aria-label="${escape(shortDate(b.start) + ', ' + b.start.getHours() + ':00, ' + money(b.value))}" style="--height:${b.value ? Math.max(2, b.value / max * 100) : 0.8}%;--delay:${i * 8}ms"><span></span></button>`).join('')}</div>${!filled ? '<div class="chart-empty-message">A clearer picture starts with your first expense.</div>' : ''}<div class="x-labels">${[0, Math.floor((buckets.length - 1) / 3), Math.floor((buckets.length - 1) * 2 / 3), buckets.length - 1].map(i => `<span>${daysInRange(range()) === 1 ? buckets[i].start.toLocaleTimeString('en-US', { hour: 'numeric' }) : shortDate(buckets[i].start)}</span>`).join('')}</div></div></div><div class="chart-bottom"><span>${icon('calendar')} ${daysInRange(range()) === 1 ? 'Hourly' : daysInRange(range()) <= 31 ? 'Daily' : 'Grouped daily'} spending</span><span>${currentRecords().length} transactions this period</span></div></article>`;
}
function categoryCard() {
  const items = currentRecords(), total = totalCents(items);
  const groups = categoriesFor(records()).map(c => ({ ...c, total: totalCents(items.filter(t => categoryKey(t.category) === categoryKey(c.id))) })).filter(c => c.total).sort((a, b) => b.total - a.total);
  let offset = 0;
  const stops = groups.map(c => { const start = offset; offset += c.total / total * 100; return `${c.color} ${start}% ${offset}%`; });
  return `<article class="panel category-panel"><div class="panel-heading"><div><h2>Where it goes</h2><p>The little pieces of your spending.</p></div>${icon('grid', 'muted')}</div><div class="donut-area"><div class="donut" style="--ring:${total ? `conic-gradient(${stops.join(',')})` : '#eeecf5'}" role="img" aria-label="Spending by category"><div><span>${total ? 'Total spent' : 'All yours'}</span><strong>${money(total)}</strong><small>${groups.length} ${groups.length === 1 ? 'category' : 'categories'}</small></div></div></div><div class="category-legend">${groups.length ? groups.map(c => `<div><span><i class="color-dot" style="--dot:${c.color}"></i>${escape(c.name)}</span><strong>${money(c.total)}</strong><small>${Math.round(c.total / total * 100)}%</small></div>`).join('') : `<p class="legend-empty">From your morning coffee to the big things.<br>See where every penny goes.</p>`}</div></article>`;
}
function rowMarkup(t) {
  const c = categoryFor(t.category), date = new Date(t.date);
  return `<button class="transaction-row" data-edit="${escape(t.id)}" aria-label="Edit ${escape(t.name)}, ${escape(money(t.amount))}"><span class="transaction-icon" style="--cat-bg:${c.bg};--cat-color:${c.color}">${icon(c.icon)}</span><span class="transaction-name"><strong>${escape(t.name)}</strong><small><span class="desktop-time">${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><span class="mobile-category">${shortDate(date)} · ${escape(c.name)}</span></small></span><span class="category-badge" style="--cat-bg:${c.bg};--cat-color:${c.color}">${escape(c.name)}</span><span class="transaction-date">${shortDate(date)}<small>${date.getFullYear()}</small></span><strong class="transaction-amount">−${money(t.amount)}</strong><span class="row-chevron">${icon('right')}</span></button>`;
}
function filteredTransactions() { return currentRecords().filter(t => t.name.toLowerCase().includes(state.search.toLowerCase()) && (state.category === '' || categoryKey(t.category) === categoryKey(state.category))); }
function emptyTransactions() {
  const filtered = state.search || state.category !== '';
  return `<div class="empty-state"><span class="empty-art">${icon(filtered ? 'search' : 'wallet')}<span>✧</span></span><h3>${filtered ? 'No matching transactions' : 'Make room for a little clarity.'}</h3><p>${filtered ? 'Try a different name or category.' : 'Your coffee, your groceries, your everyday.<br>Add your first expense and start seeing the bigger picture.'}</p><button class="button ${filtered ? 'secondary' : 'primary'}" data-action="${filtered ? 'reset-search' : 'add'}">${icon(filtered ? 'search' : 'plus')}${filtered ? 'Clear filters' : 'Add your first transaction'}</button>${!filtered && !records().length ? '<button class="text-button sample-button" data-action="demo">Or take a peek with sample data '+icon('right')+'</button>' : ''}</div>`;
}
function transactionCard(recent = false) {
  const items = recent ? currentRecords().slice(0, 5) : filteredTransactions();
  return `<section class="panel transactions-panel"><div class="panel-heading"><div><h2>${recent ? 'Recent transactions' : 'Your transactions'} <span class="count-pill">${recent ? currentRecords().length : items.length}</span></h2><p>${recent ? 'A little look at your latest spending.' : 'Select a transaction to edit its details.'}</p></div>${recent ? `<button class="text-button" data-page="transactions">View all ${icon('right')}</button>` : `<button class="text-button" data-action="export">${icon('download')} Export</button>`}</div>${!recent ? `<div class="filter-row"><label class="search-field">${icon('search')}<input id="search" type="search" placeholder="Search transactions…" aria-label="Search transactions" value="${escape(state.search)}"></label><select id="category-filter" aria-label="Filter by category"><option value="">All categories</option>${categoriesFor(records()).map(c => `<option value="${escape(c.id)}" ${state.category && categoryKey(state.category) === categoryKey(c.id) ? 'selected' : ''}>${escape(c.name)}</option>`).join('')}</select></div>` : ''}<div id="transaction-results">${items.length ? `<div class="table-heading"><span>TRANSACTION</span><span>CATEGORY</span><span>DATE</span><span>AMOUNT</span></div><div class="transaction-list">${items.map(rowMarkup).join('')}</div>` : emptyTransactions()}</div>${items.length ? `<div class="table-footer"><span>${recent ? 'Your latest' : 'Showing'} ${items.length} transaction${items.length === 1 ? '' : 's'}</span><span>${recent ? 'Every penny accounted for.' : 'Total: ' + money(totalCents(items))}</span></div>` : ''}</section>`;
}
function transactionPage() { return transactionCard(); }
function insights() {
  const items = currentRecords(), sorted = [...items].sort((a, b) => b.amount - a.amount);
  return `${summaryCards()}<section class="chart-grid">${trendCard()}${categoryCard()}</section><section class="panel insights-note"><span class="insight-illustration">${icon('spark')}</span><div><div class="eyebrow">THE BIGGER PICTURE</div><h2>${items.length ? `${items.length} little moments, one clear picture.` : 'Your habits have a story to tell.'}</h2><p>${items.length ? `Your largest expense this period is ${escape(sorted[0].name)} at ${money(sorted[0].amount)}. Keep logging the everyday things to understand your spending over time.` : 'Log your everyday expenses to discover your top categories, daily average, and how your spending changes from one period to the next.'}</p></div></section>`;
}
function settingsPage() {
  return `<div class="settings-grid"><section class="panel settings-panel"><div class="panel-heading"><div><h2>Your preferences</h2><p>Little details that make Penny yours.</p></div>${icon('settings', 'muted')}</div><div class="setting-row"><div><label for="currency">Currency</label><p>Applies to all transactions. No conversion.</p></div><select id="currency" ${transactions.length ? 'disabled title="Currency is fixed while you have transactions to prevent relabeling amounts."' : ''}>${['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => `<option ${settings.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="setting-row"><div><label for="quick-launch">Start with a new transaction</label><p>Open the entry form when Penny launches.</p></div><input class="switch" type="checkbox" role="switch" id="quick-launch" ${settings.quickLaunch ? 'checked' : ''}></div><div class="setting-row"><div><label for="reminder-days">Backup reminder</label><p>A gentle reminder while you use the app.</p></div><select id="reminder-days">${[7, 14, 30].map(n => `<option value="${n}" ${settings.reminderDays === n ? 'selected' : ''}>Every ${n} days</option>`).join('')}</select></div></section>
  <section class="panel settings-panel"><div class="panel-heading"><div><h2>Your data, in your hands</h2><p>A small backup. A little peace of mind.</p></div>${icon('download', 'muted')}</div><div class="backup-status">${icon('clock')}<div><strong>${settings.lastExport ? 'Last export: ' + new Date(settings.lastExport).toLocaleDateString() : 'Your first backup is waiting'}</strong><p>${transactions.length} transaction${transactions.length === 1 ? '' : 's'} stored on this device</p></div></div><div class="settings-buttons"><button class="button primary" data-action="export">${icon('download')} Export CSV</button><button class="button secondary" data-action="import">${icon('upload')} Import CSV</button></div><p class="settings-help">Import adds records and skips matching IDs. Exported files include all your transactions. Keep a copy somewhere safe.</p><input type="file" id="csv-file" accept=".csv,text/csv" hidden></section>
  <section class="panel settings-panel"><div class="panel-heading"><div><h2>At home on your iPhone</h2><p>Less tapping. More living.</p></div>${icon('home', 'muted')}</div><ol class="install-steps"><li><span>1</span><div>Open Penny in <strong>Safari</strong>.</div></li><li><span>2</span><div>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</div></li><li><span>3</span><div>Open Penny from its icon. You’re home.</div></li></ol><div class="shortcut-box"><strong>${icon('spark')} A shortcut to your next penny</strong><p>Use this link with the “Open URLs” action in Apple Shortcuts to go straight to the form. On iOS, the link may open Safari; for entry in the installed app, enable “Start with a new transaction” above.</p><button class="button secondary" data-action="copy-link">Copy quick-entry link ${icon('arrow')}</button></div></section>
  <section class="panel settings-panel privacy-panel"><div class="privacy-icon">${icon('shield')}</div><h2>Personal finance.<br>Actually personal.</h2><p>No sign-up. No bank connections. No analytics. Your transactions are stored only in this browser’s storage on this device.</p><div class="storage-status"><i></i>${persistent ? 'Persistent storage granted' : 'Local storage active'}</div><p class="settings-help">${persistent ? 'Your browser has granted persistent storage. ' : 'Penny requests persistent storage when supported. '}Clearing website data, removing the app, or device storage policies can still remove records. Install Penny, use it regularly, and export backups. Safari and the installed app may have separate storage; use CSV to move records between them.</p><button class="text-button" data-action="persist">Check storage protection ${icon('right')}</button></section></div>`;
}
function showDialog(content, cls = '') {
  const prior = document.activeElement;
  dialogs.innerHTML = `<dialog class="modal ${cls}">${content}</dialog>`;
  const dialog = dialogs.querySelector('dialog');
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); prior?.focus(); });
  document.body.classList.add('modal-open');
  dialog.showModal();
  return dialog;
}
function closeDialog() { dialogs.querySelector('dialog')?.close(); }
function openTransaction(id) {
  if (state.demo) { toast('Exit the sample preview to add or edit your own transactions.'); return; }
  const item = transactions.find(t => t.id === id);
  showDialog(`<div class="modal-heading"><div><span class="eyebrow">EVERY PENNY HAS A PLACE</span><h2>${item ? 'A little adjustment.' : 'What did you spend?'}</h2><p>${item ? 'Keep the details just right.' : 'The everyday things count, too.'}</p></div><button class="icon-button" data-action="close" aria-label="Close form">${icon('close')}</button></div><form id="transaction-form" data-id="${escape(item?.id || '')}"><label class="amount-label" for="amount">Amount <span>${settings.currency}</span></label><div class="amount-input"><span>${new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency }).formatToParts(0).find(p => p.type === 'currency').value}</span><input id="amount" name="amount" inputmode="decimal" placeholder="0.00" value="${item ? (item.amount / 100).toFixed(2) : ''}" required autocomplete="off" maxlength="12" aria-label="Transaction amount" autofocus></div><label class="field-label" for="name">What was it for?</label><input class="text-input" id="name" name="name" placeholder="Coffee, groceries, a little treat…" value="${escape(item?.name || '')}" required maxlength="100" autocomplete="off"><fieldset class="category-picker"><legend>Category <span>optional</span></legend><div>${categoriesFor(records()).map(c => `<label class="category-option"><input type="radio" name="category" value="${escape(c.id)}" ${categoryKey(item?.category) === categoryKey(c.id) ? 'checked' : ''}><span>${icon(c.icon)}${escape(c.name)}</span></label>`).join('')}</div><label class="field-label" for="custom-category">Or add a category</label><input class="text-input" id="custom-category" name="customCategory" placeholder="e.g. Pets or Travel" maxlength="40" autocomplete="off"></fieldset><details class="date-details" ${item ? 'open' : ''}><summary>${icon('calendar')}<span>${item ? 'Transaction date' : 'Today, right now'}</span><small>Change date</small>${icon('down')}</summary><label class="field-label" for="date">Date & time <span>optional · defaults to now</span></label><input class="text-input" id="date" name="date" type="datetime-local" value="${item ? localInput(new Date(item.date)) : ''}"></details><p id="form-error" class="form-error" role="alert"></p><button class="button primary save-button" type="submit">${icon(item ? 'check' : 'plus')}${item ? 'Save changes' : 'Add transaction'}</button>${item ? `<button type="button" class="text-button danger delete-button" data-delete="${escape(item.id)}">Delete transaction</button>` : '<p class="form-privacy">'+icon('shield')+' Saved only on this device. Always.</p>'}</form>`);
}
function openRange() {
  const r = range();
  showDialog(`<div class="modal-heading"><div><span class="eyebrow">A DIFFERENT PERSPECTIVE</span><h2>Choose your dates.</h2></div><button class="icon-button" data-action="close" aria-label="Close date picker">${icon('close')}</button></div><div class="preset-dates"><button class="button secondary" data-preset="today">Today</button><button class="button secondary" data-preset="7">Last 7 days</button><button class="button secondary" data-preset="30">Last 30 days</button><button class="button secondary" data-preset="month">This month</button></div><form id="range-form"><div class="date-inputs"><label>From<input class="text-input" type="date" name="start" value="${localDay(r.start)}" required></label><label>To<input class="text-input" type="date" name="end" value="${localDay(addDays(r.end, -1))}" required></label></div><p class="form-error" id="range-error" role="alert"></p><button class="button primary save-button">Apply date range</button></form>`);
}
function toast(message, undo) {
  clearTimeout(toastTimer);
  const node = document.querySelector('#toast');
  node.innerHTML = `${icon('check')}<span>${escape(message)}</span>${undo ? '<button id="undo">Undo</button>' : ''}`;
  node.classList.add('visible');
  if (undo) node.querySelector('button').onclick = async () => { try { await undo(); node.classList.remove('visible'); } catch { toast('Could not restore the transaction. Please try again.'); } };
  toastTimer = setTimeout(() => node.classList.remove('visible'), undo ? 12000 : 5000);
}
async function refresh() { transactions = await db.getTransactions(); channel?.postMessage('changed'); render(); }
async function updateSettings(patch) { const next = { ...settings, ...patch }; await db.saveSettings(next); settings = next; channel?.postMessage('changed'); }
async function exportData() {
  if (state.demo) { toast('Exit the sample preview to export your own data.'); return; }
  const csv = exportCSV(transactions, settings.currency);
  const file = new File([csv], `penny-backup-${localDay(new Date())}.csv`, { type: 'text/csv;charset=utf-8' });
  try {
    if (navigator.canShare?.({ files: [file] }) && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      await navigator.share({ files: [file], title: 'Penny backup' });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    await updateSettings({ lastExport: new Date().toISOString(), reminderSnooze: null }); render();
    toast('CSV export prepared. Keep the file somewhere safe.');
  } catch (error) { if (error.name !== 'AbortError') toast('Export could not finish. Please try again.'); }
}
async function importFile(file) {
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('Please choose a CSV file smaller than 5 MB.');
    const items = importCSV(await file.text(), settings.currency);
    const existing = new Set(transactions.map(t => t.id));
    let duplicates = 0;
    for (const item of items) { if (existing.has(item.id)) duplicates++; existing.add(item.id); }
    showDialog(`<div class="modal-heading"><div><span class="eyebrow">BRING YOUR PENNIES HOME</span><h2>Ready to import.</h2><p>${items.length - duplicates} new transactions · ${duplicates} matching IDs skipped</p></div><button class="icon-button" data-action="close" aria-label="Cancel import">${icon('close')}</button></div><p class="import-description">These records will be added to this device. Existing transactions stay as they are. Files without IDs receive new IDs, so importing them again creates duplicates.</p><div class="import-preview">${items.slice(0, 3).map(t => `<div><span>${escape(t.name)}</span><strong>${money(t.amount)}</strong></div>`).join('')}</div><p class="form-error" id="import-error" role="alert"></p><button class="button primary save-button" id="confirm-import">${icon('upload')} Import ${items.length - duplicates} transactions</button>`);
    document.querySelector('#confirm-import').onclick = async event => {
      event.target.disabled = true;
      try { const added = await db.mergeTransactions(items); closeDialog(); await refresh(); toast(`${added} transactions imported.`); }
      catch { document.querySelector('#import-error').textContent = 'Import failed. No partial import was saved. Please try again.'; event.target.disabled = false; }
    };
  } catch (error) { toast(error.message); }
}
function startDemo() {
  const examples = [['Neighborhood coffee', 575, 'food', 0], ['Weekly groceries', 8240, 'food', 1], ['A little retail therapy', 6490, 'shopping', 2], ['Train to the city', 1275, 'transport', 3], ['Movie night', 2400, 'fun', 4], ['Internet', 6500, 'home', 6], ['Sunday brunch', 3850, 'food', 7], ['Fresh flowers', 1800, 'shopping', 8], ['Corner deli', 1425, 'food', 10], ['Electricity', 7240, 'home', 12], ['Pharmacy', 1980, 'health', 14], ['Dinner with friends', 6850, 'food', 17], ['New running shoes', 9500, 'shopping', 19], ['Bus pass', 3300, 'transport', 21], ['Morning coffee', 525, 'food', 23]];
  const now = new Date();
  demoTransactions = examples.map(([name, amount, category, offset], i) => ({ id: `sample-${i}`, name, amount, category, date: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - offset), 9 + i % 10, 15).toISOString() }));
  state = { ...state, demo: true, period: 'monthly', anchor: now, page: 'overview' }; render();
}
document.addEventListener('click', async event => {
  const target = event.target.closest('button');
  if (!target) return;
  try {
    if (target.dataset.page) { state.page = target.dataset.page; state.search = ''; state.category = ''; render(); window.scrollTo({ top: 0 }); }
    if (target.dataset.period) { state.period = target.dataset.period; state.anchor = new Date(); render(); }
    if (target.dataset.edit) openTransaction(target.dataset.edit);
    if (target.dataset.delete) {
      const item = transactions.find(t => t.id === target.dataset.delete);
      if (!item) return;
      await db.deleteTransaction(item.id); closeDialog(); await refresh();
      toast('Transaction deleted.', async () => { await db.saveTransaction(item); await refresh(); });
    }
    if (target.dataset.preset) {
      const key = target.dataset.preset, today = new Date();
      if (key === 'today' || key === 'month') { state.period = key === 'today' ? 'daily' : 'monthly'; state.anchor = today; }
      else { state.period = 'custom'; state.custom = { start: localDay(addDays(today, -Number(key) + 1)), end: localDay(today) }; }
      closeDialog(); render();
    }
    switch (target.dataset.action) {
      case 'dismiss-url-notice': urlNotice = null; render(); break;
      case 'add': openTransaction(); break;
      case 'close': closeDialog(); break;
      case 'range': openRange(); break;
      case 'previous': case 'next': {
        const direction = target.dataset.action === 'previous' ? -1 : 1, r = range();
        if (state.period === 'custom') { const delta = daysInRange(r) * direction; state.custom = { start: localDay(addDays(r.start, delta)), end: localDay(addDays(r.end, delta - 1)) }; }
        else state.anchor = state.period === 'monthly' ? new Date(r.start.getFullYear(), r.start.getMonth() + direction, 1) : addDays(r.start, daysInRange(r) * direction);
        render(); break;
      }
      case 'export': await exportData(); break;
      case 'import': if (state.demo) toast('Exit sample preview before importing.'); else document.querySelector('#csv-file').click(); break;
      case 'snooze': await updateSettings({ reminderSnooze: new Date(Date.now() + 86400000).toISOString() }); render(); break;
      case 'demo': startDemo(); break;
      case 'demo-exit': state.demo = false; render(); break;
      case 'reset-search': state.search = ''; state.category = ''; render(); break;
      case 'persist': persistent = await navigator.storage?.persist?.() || false; render(); toast(persistent ? 'Persistent storage is granted.' : 'Your browser decides storage protection. Regular CSV backups help keep records safe.'); break;
      case 'copy-link': {
        const url = new URL('./?add=1', location.href).href;
        try { await navigator.clipboard.writeText(url); toast('Quick-entry link copied.'); }
        catch { showDialog(`<div class="modal-heading"><h2>Your quick-entry link</h2><button class="icon-button" data-action="close" aria-label="Close">${icon('close')}</button></div><input class="text-input" readonly value="${escape(url)}" aria-label="Copy this quick-entry URL">`); }
        break;
      }
    }
  } catch { toast('That couldn’t be saved. Check device storage and try again.'); }
});
document.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'transaction-form') {
    const data = new FormData(form), submit = form.querySelector('[type="submit"]');
    try {
      const amount = amountToCents(data.get('amount').replace(',', '.'));
      const name = data.get('name').trim();
      if (!name) throw new Error('Give this transaction a name.');
      const date = data.get('date') ? new Date(data.get('date')) : new Date();
      if (Number.isNaN(date.getTime())) throw new Error('Choose a valid date and time.');
      submit.disabled = true;
      const item = { id: form.dataset.id || crypto.randomUUID(), name, amount, category: normalizeCategory(data.get('customCategory').trim() || data.get('category') || 'misc'), date: date.toISOString() };
      await db.saveTransaction(item);
      closeDialog(); await refresh(); toast(form.dataset.id ? 'Transaction updated.' : 'A penny accounted for. Transaction added.');
    } catch (error) { form.querySelector('#form-error').textContent = error.name === 'QuotaExceededError' ? 'Device storage is full. Export a backup and free up space.' : error.message; submit.disabled = false; }
  }
  if (form.id === 'range-form') {
    const data = new FormData(form), start = data.get('start'), end = data.get('end');
    if (end < start) { document.querySelector('#range-error').textContent = 'The end date must be on or after the start date.'; return; }
    state.period = 'custom'; state.custom = { start, end }; closeDialog(); render();
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'search') {
    const position = event.target.selectionStart;
    state.search = event.target.value;
    const old = document.querySelector('.transactions-panel');
    old.outerHTML = transactionCard();
    const input = document.querySelector('#search'); input.focus();
    try { input.setSelectionRange(position, position); } catch { /* search input selection support varies */ }
  }
});
document.addEventListener('change', async event => {
  if (event.target.matches('#transaction-form input[name="category"]')) {
    document.querySelector('#custom-category').value = '';
  }
  try {
    switch (event.target.id) {
      case 'category-filter': state.category = event.target.value; render(); break;
      case 'currency': await updateSettings({ currency: event.target.value }); render(); break;
      case 'quick-launch': await updateSettings({ quickLaunch: event.target.checked }); toast('Launch preference saved.'); break;
      case 'reminder-days': await updateSettings({ reminderDays: Number(event.target.value) }); render(); toast('Backup reminder updated.'); break;
      case 'csv-file': await importFile(event.target.files[0]); event.target.value = ''; break;
    }
  } catch { toast('Couldn’t save this preference. Please try again.'); render(); }
});
async function sync() {
  if (dialogs.querySelector('dialog[open]')) return;
  try { transactions = await db.getTransactions(); settings = { ...settings, ...await db.getSettings() }; render(); } catch { /* Keep last successfully loaded view. */ }
}
channel?.addEventListener('message', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
async function init() {
  try {
    await db.openDatabase();
    transactions = await db.getTransactions();
    const saved = await db.getSettings();
    if (saved) settings = { ...settings, ...saved }; else await db.saveSettings(settings);
    persistent = await navigator.storage?.persisted?.() || false;
    render();
    const urlEntries = installURLTransactions({
      save: db.insertURLTransaction,
      onResult: async result => {
        state.demo = false;
        urlNotice = { message: `Added ${result.transaction.name} · ${money(result.transaction.amount)}. Saved on this device.` };
        try { transactions = await db.getTransactions(); }
        catch { urlNotice.message += ' Reload to refresh the transaction list.'; }
        render();
        channel?.postMessage('changed');
      },
      onError: error => {
        urlNotice = { error: true, message: `Transaction not added. ${error.message}` };
        render();
      },
    });
    const urlResult = await urlEntries.ready;
    if (!urlResult && (new URLSearchParams(location.search).get('add') === '1' || settings.quickLaunch)) openTransaction();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => toast('Offline setup couldn’t finish. Reopen Penny online to try again.'));
    if (!persistent) navigator.storage?.persist?.().then(value => { persistent = value; }).catch(() => {});
  } catch (error) {
    app.innerHTML = `<main class="storage-error"><span class="brand-icon">p.</span><h1>Your pennies need a safe home.</h1><p>Penny couldn’t open storage on this device. Enable website storage, leave private browsing, or free up device space, then reload.</p><p>${escape(error.message)}</p><button class="button primary" id="retry">Try again</button></main>`;
    document.querySelector('#retry').onclick = () => location.reload();
  }
}
init();
