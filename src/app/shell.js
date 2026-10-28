// The app shell: icon rail (desktop), top bar and tab bar (phone), wallet menu, toast and sheets.
import * as ledger from '../chain/ledger.js';
import { config, txHref } from '../config.js';
import { avatar, esc, shortAddr, shortHash } from '../lib/format.js';

export const ICONS = {
  browse: '<path d="M3 4h7v7H3zM14 4h7v7h-7zM3 15h7v5H3zM14 15h7v5h-7z"/>',
  list: '<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="3"/>',
  offers: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.4-6 8-6s6.8 2 8 6"/>',
  event: '<path d="M5 20V11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v9"/><path d="M3 20h18M8 8V5h8v3"/>',
  flight: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
  train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4"/><circle cx="9" cy="14" r=".5"/><circle cx="15" cy="14" r=".5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const MARK = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 28V14a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v14z" fill="#111"/><path d="M17 22V8a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v14z" fill="#1a4be0"/></svg>';

const NAV = [
  { id: 'browse', href: '/browse.html', label: 'Browse' },
  { id: 'list', href: '/list.html', label: 'List a seat' },
  { id: 'offers', href: '/offers.html', label: 'Offers' },
  { id: 'profile', href: '/profile.html', label: 'Profile' },
];

// Open offers on seats this wallet holds: the queue that needs action.
export const waitingCount = () => ledger.getOffers({ to: ledger.account() }).filter((o) => o.status === 'open').length;

export function mount(active) {
  const app = document.querySelector('.app');
  const count = waitingCount();
  const badge = (cls) => (count ? `<span class="${cls}" aria-label="${count} waiting">${count}</span>` : '');
  app.insertAdjacentHTML('afterbegin', `
    <nav class="rail" aria-label="Komuta">
      <a class="rail__mark" href="/" aria-label="Komuta home">${MARK}</a>
      ${NAV.map((n) => `<a class="rail__item" href="${n.href}" aria-label="${n.label}" ${n.id === active ? 'aria-current="page"' : ''}>
        ${icon(n.id)}${n.id === 'offers' ? badge('count') : ''}<span class="rail__tip" aria-hidden="true">${n.label}</span></a>`).join('')}
      <div class="rail__bottom"><button class="wallet-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Wallet ${shortAddr(ledger.account())}">${avatar(ledger.account())}</button></div>
    </nav>`);
  document.body.insertAdjacentHTML('afterbegin', `
    <header class="topbar"><a href="/" class="mark">${MARK}<span class="title">Komuta</span></a>
      <button class="wallet-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Wallet ${shortAddr(ledger.account())}">${avatar(ledger.account())}</button></header>`);
  document.body.insertAdjacentHTML('beforeend', `
    <nav class="tabbar" aria-label="Komuta">${NAV.map((n) => `<a href="${n.href}" ${n.id === active ? 'aria-current="page"' : ''}>${icon(n.id)}${n.label === 'List a seat' ? 'List' : n.label}${n.id === 'offers' ? badge('count') : ''}</a>`).join('')}</nav>
    <div class="menu" role="menu" hidden id="wallet-menu"></div>
    <div class="toast" role="status" aria-live="polite" id="toast"></div>`);
  document.querySelector('.canvas').insertAdjacentHTML('beforeend', `
    <p class="notice app-foot">Demo ledger: this runs in your browser with the genesis seats. The contract address, RPC and explorer are set from BOT Chain's Builder Docs at deploy. Open a second window to watch swaps settle live.</p>`);
  wireWallet();
  ledger.subscribe(() => document.querySelectorAll('.rail__item .count, .tabbar .count').forEach((el) => {
    const n = waitingCount();
    el.textContent = n; el.hidden = !n;
  }));
  if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
}

function wireWallet() {
  const menu = document.getElementById('wallet-menu');
  const buttons = document.querySelectorAll('.wallet-btn');
  const close = () => { menu.hidden = true; buttons.forEach((b) => b.setAttribute('aria-expanded', 'false')); };
  const render = () => {
    const me = ledger.account();
    menu.innerHTML = `<h3>Connected wallet</h3>
      <button type="button" role="menuitem" data-copy="${me}">${avatar(me)}<span class="addr">${shortAddr(me)}</span><span class="muted" style="margin-left:auto">Copy</span></button>
      <hr><h3>Act as another genesis wallet</h3>
      ${ledger.wallets().map((w) => `<button type="button" role="menuitemradio" aria-checked="${w === me}" data-as="${w}">${avatar(w)}<span class="addr">${shortAddr(w)}</span></button>`).join('')}
      <hr><button type="button" role="menuitem" data-reset>Reset demo ledger</button>`;
  };
  buttons.forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!menu.hidden) return close();
    render();
    menu.hidden = false;
    b.setAttribute('aria-expanded', 'true');
    menu.querySelector('button')?.focus();
  }));
  menu.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.copy) { navigator.clipboard?.writeText(t.dataset.copy); toast('Address copied'); }
    if (t.dataset.as) { ledger.setAccount(t.dataset.as); location.reload(); }
    if ('reset' in t.dataset) { ledger.reset(); location.reload(); }
    close();
  });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

// ---------- toast ----------
let toastTimer;
export function toast(html, { kind = '', sticky = false } = {}) {
  const el = document.getElementById('toast');
  el.className = `toast show ${kind}`;
  el.innerHTML = html;
  clearTimeout(toastTimer);
  if (!sticky) toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

// Send a transaction with visible states: signing, then settled (with its hash) or reverted (with the reason).
export async function run(label, send, { seatId } = {}) {
  toast(`<span class="spin" aria-hidden="true"></span>${esc(label)}…`, { sticky: true });
  try {
    const r = await send();
    const href = txHref(r.tx, r.seatId ?? seatId ?? 0);
    toast(`Settled in ${(r.ms / 1000).toFixed(2)} s · <a href="${href}">${shortHash(r.tx)}</a>`);
    return r;
  } catch (err) {
    toast(`Reverted: ${esc(err.message)}`, { kind: 'err' });
    throw err;
  }
}

// ---------- sheet ----------
export function sheet({ title, body, foot }) {
  const d = document.createElement('dialog');
  d.className = 'sheet';
  d.setAttribute('aria-label', title);
  d.innerHTML = `<form method="dialog" class="sheet__inner">
    <div class="sheet__head"><h2>${esc(title)}</h2><button class="icon-btn" value="cancel" aria-label="Close">${icon('close')}</button></div>
    <div class="sheet__body">${body}</div>
    <div class="sheet__foot">${foot}</div></form>`;
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.showModal();
  return d;
}

export const symbol = config.symbol;
