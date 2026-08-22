/* Small, dependency-free. HTMX does the fetching; this handles polish. */

// Live clock in the hero chart bar
const clock = document.getElementById('clock');
if (clock) {
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }); };
  tick(); setInterval(tick, 1000);
}

// Flash a cell green/red when its value changes after an HTMX swap.
document.body.addEventListener('htmx:beforeSwap', (e) => {
  const t = e.detail.target;
  t.querySelectorAll?.('[data-watch]').forEach((el) => {
    el.dataset.prev = el.textContent.trim();
  });
});
document.body.addEventListener('htmx:afterSwap', (e) => {
  e.detail.target.querySelectorAll?.('[data-watch]').forEach((el) => {
    const prev = parseFloat((el.dataset.prev || '').replace(/[^0-9.-]/g, ''));
    const now = parseFloat(el.textContent.replace(/[^0-9.-]/g, ''));
    if (!isNaN(prev) && !isNaN(now) && prev !== now) {
      el.classList.add(now > prev ? 'flash-up' : 'flash-down');
      setTimeout(() => el.classList.remove('flash-up', 'flash-down'), 700);
    }
  });
});

// Sidebar on mobile
const side = document.querySelector('.side');
document.querySelector('[data-side-toggle]')?.addEventListener('click', () => {
  side.classList.add('open');
  const s = document.createElement('div');
  s.className = 'scrim';
  s.onclick = () => { side.classList.remove('open'); s.remove(); };
  document.body.appendChild(s);
});

// Confirm destructive actions without a library
document.body.addEventListener('click', (e) => {
  const el = e.target.closest('[data-confirm]');
  if (el && !confirm(el.dataset.confirm)) { e.preventDefault(); e.stopPropagation(); }
}, true);

// Copy-to-clipboard buttons: <button data-copy="#selector">
document.body.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const target = document.querySelector(btn.dataset.copy);
  if (!target) return;
  const text = target.textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  const label = btn.textContent;
  btn.textContent = 'Copied';
  setTimeout(() => { btn.textContent = label; }, 1200);
});

// Deposit: reveal the wallet address for the selected payment method
const methodSel = document.querySelector('select[data-wallets]');
if (methodSel) {
  const box = document.getElementById('wallet-box');
  const addr = document.getElementById('wallet-addr');
  let wallets = {};
  try { wallets = JSON.parse(methodSel.dataset.wallets || '{}'); } catch { /* keep empty */ }
  const showWallet = () => {
    const v = (wallets[methodSel.value] || '').trim();
    if (!box || !addr) return;
    addr.textContent = v || 'Not configured yet — please contact support before sending funds.';
    box.style.display = '';
  };
  methodSel.addEventListener('change', showWallet);
  showWallet();
}
// deploy trigger 2026-08-12T09:25:23Z
// trigger Wed Aug 12 09:30:19 UTC 2026
