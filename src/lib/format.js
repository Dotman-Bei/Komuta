import { config } from '../config.js';

const lang = document.documentElement.lang || 'en-GB';
const nf0 = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
const dayFmt = new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false });
const isoFmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const price = (v) => `${nf0.format(v)} ${config.symbol}`;
export const priceHtml = (v) => `${nf0.format(v)}<small> ${config.symbol}</small>`;
export const day = (iso) => dayFmt.format(new Date(iso));
export const time = (iso) => timeFmt.format(new Date(iso));
export const isoDay = (ts) => isoFmt(new Date(ts));
export const when = (ts) => `${isoFmt(new Date(ts))} ${timeFmt.format(new Date(ts))}`;
export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');
export const shortHash = (h) => `${h.slice(0, 10)}…`;
export const seatNo = (id) => `#${String(id).padStart(4, '0')}`;
export const stars = (avgX100) => (avgX100 ? (avgX100 / 100).toFixed(2) : '—');

// Relative age: "12 min", "3 h", "2 days".
export function ago(ts, now = Date.now()) {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

// Time left on a 24-hour offer: "9 h 12 m left".
export function left(expires, now = Date.now()) {
  const m = Math.max(0, Math.round((expires - now) / 60000));
  if (m === 0) return 'Expired';
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')} m left` : `${m} m left`;
}

// Pale identity tints; the violet band (230–320) is left out.
const HUES = [8, 32, 52, 88, 128, 160, 186, 205, 340, 20, 70, 145];

// A stable identity for a wallet: two hex characters and a pale tint of its own hue.
export function who(addr) {
  if (!addr) return { tag: '—', hue: 0 };
  const hue = HUES[parseInt(addr.slice(2, 8), 16) % HUES.length];
  return { tag: addr.slice(2, 4).toUpperCase(), hue };
}
export const avatar = (addr, extra = '') => {
  const { tag, hue } = who(addr);
  return `<span class="avatar ${extra}" style="--hue:${hue}" aria-hidden="true">${tag}</span>`;
};

export const CATEGORY = { event: 'Event', flight: 'Flight', train: 'Train' };
