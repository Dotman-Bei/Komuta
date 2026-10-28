// List a seat: what exactly am I listing, and what will buyers see?
import * as ledger from '../chain/ledger.js';
import { config, txHref } from '../config.js';
import { mount, icon, run } from './shell.js';
import { esc, day, time, shortAddr, shortHash, avatar, priceHtml, seatNo, CATEGORY } from '../lib/format.js';

mount('list');
const main = document.getElementById('main');
const params = new URL(location.href).searchParams;
const form = { category: 'event', date: '', time: '20:00', venue: params.get('venue') ?? '', seatRef: '', price: '', swapOnly: false };

const COPY = {
  event: { where: 'Venue', wherePh: 'Ziggo Dome, Amsterdam', seatPh: 'Ring 2 · Row 6 · Seat 31', seatHelp: 'Block or ring, row and seat, as printed on the ticket.' },
  flight: { where: 'Route and flight', wherePh: 'IST → AMS · KT 1951', seatPh: 'Seat 14C', seatHelp: 'The seat number on the boarding pass.' },
  train: { where: 'Route and train', wherePh: 'Paris Est → Stuttgart · ICE 9574', seatPh: 'Coach 12 · Seat 45', seatHelp: 'Coach and seat from the reservation.' },
};

main.insertAdjacentHTML('afterbegin', `
  <div class="title-row"><div><h1>List a seat</h1><p class="sub">One transaction. Fees are a fraction of a cent.</p></div></div>
  <div class="form-grid" id="form-grid">
    <form id="list-form" novalidate>
      <section class="setting" aria-labelledby="s-cat">
        <div><h2 id="s-cat">Kind of seat</h2><p class="help">Decides where buyers find it.</p></div>
        <div class="well"><div class="segmented" role="group" aria-labelledby="s-cat">
          ${Object.entries(CATEGORY).map(([k, v]) => `<button type="button" data-cat="${k}" aria-pressed="${k === form.category}">${v}</button>`).join('')}
        </div></div>
      </section>
      <section class="setting" aria-labelledby="s-when">
        <div><h2 id="s-when">When</h2><p class="help">The date and start, departure or doors time. Stored on-chain as a timestamp.</p></div>
        <div class="well row-fields">
          <div class="field"><label for="f-date">Date</label><input class="input num" id="f-date" type="date" required></div>
          <div class="field"><label for="f-time">Time</label><input class="input num" id="f-time" type="time" value="${form.time}" required></div>
        </div>
      </section>
      <section class="setting" aria-labelledby="s-where">
        <div><h2 id="s-where">Where</h2><p class="help">Kept off-chain in the listing's metadata. Only its hash goes on-chain, so your itinerary stays yours.</p></div>
        <div class="well">
          <div class="field"><label for="f-venue" id="l-venue">${COPY.event.where}</label><input class="input" id="f-venue" value="${esc(form.venue)}" placeholder="${COPY.event.wherePh}" autocomplete="off" required></div>
          <div class="field"><label for="f-seat">Seat</label><input class="input" id="f-seat" placeholder="${COPY.event.seatPh}" autocomplete="off" required aria-describedby="seat-help">
            <span class="hint" id="seat-help">${COPY.event.seatHelp}</span></div>
        </div>
      </section>
      <section class="setting" aria-labelledby="s-price">
        <div><h2 id="s-price">Price</h2><p class="help">A fixed price in ${config.symbol}, or swap-only to take another seat in exchange. No auctions in v1.</p></div>
        <div class="well">
          <div class="switch-row"><div><b>Swap only</b><p>Buyers offer one of their seats instead of payment.</p></div>
            <input type="checkbox" class="switch" id="f-swap" aria-label="Swap only"></div>
          <div class="field" id="price-field"><label for="f-price">Asking price (${config.symbol})</label>
            <input class="input num" id="f-price" inputmode="numeric" placeholder="40" aria-describedby="price-help"><span class="hint" id="price-help">Whole ${config.symbol}. Offers below it can still come in.</span></div>
        </div>
      </section>
      <div class="form-foot"><span class="muted" id="foot-note"></span><button class="btn primary" type="submit" id="submit">List seat</button></div>
    </form>
    <aside class="preview" aria-label="Preview">
      <section class="panel flush" aria-labelledby="p-title">
        <header><h2 id="p-title">How buyers will see it</h2></header>
        <table class="seat-table"><tbody id="preview-row"></tbody></table>
      </section>
      <section class="panel" aria-labelledby="c-title">
        <header><h2 id="c-title">What goes on-chain</h2></header>
        <dl class="onchain" id="onchain"></dl>
      </section>
    </aside>
  </div>`);

const $ = (id) => document.getElementById(id);
const tomorrow = new Date(Date.now() + 864e5);
$('f-date').min = tomorrow.toISOString().slice(0, 10);

function errors() {
  const e = {};
  if (!form.date) e.date = 'Pick the date';
  else if (new Date(`${form.date}T${form.time}`) <= new Date()) e.date = 'This date has passed';
  if (!form.venue.trim()) e.venue = `Add the ${COPY[form.category].where.toLowerCase()}`;
  if (!form.seatRef.trim()) e.seatRef = 'Add the seat';
  if (!form.swapOnly && !(Number(form.price) > 0)) e.price = 'Set a price above zero, or make it swap-only';
  return e;
}

function renderPreview() {
  const c = COPY[form.category];
  $('l-venue').textContent = c.where;
  $('f-venue').placeholder = c.wherePh;
  $('f-seat').placeholder = c.seatPh;
  $('seat-help').textContent = c.seatHelp;
  $('price-field').hidden = form.swapOnly;

  const iso = form.date ? `${form.date}T${form.time || '00:00'}` : null;
  const venue = form.venue.trim() || c.wherePh;
  const ref = form.seatRef.trim() || c.seatPh;
  const dup = form.venue.trim() && form.seatRef.trim() ? ledger.findDuplicate(form.venue, form.seatRef) : null;
  const me = ledger.account();
  $('preview-row').innerHTML = `<tr>
    <td><div class="seat-cell"><span class="glyph">${icon(form.category)}</span><span style="min-width:0">
      <span class="name">${esc(venue)}</span><span class="ref">${esc(ref)} · ${iso ? `${day(iso)}, ${time(iso)}` : 'date to set'}</span></span></div></td>
    <td class="n">${form.swapOnly ? '<span class="swap-only">Swap only</span>' : `<span class="ask num">${form.price ? priceHtml(Number(form.price)) : '—'}</span>`}</td></tr>`;
  const hash = ledger.hash32(`${venue.trim().toLowerCase()}|${ref.trim().toLowerCase()}`);
  $('onchain').innerHTML = `
    <div><dt>Seller</dt><dd><span class="who">${avatar(me)}${shortAddr(me)}</span></dd></div>
    <div><dt>Category</dt><dd>${CATEGORY[form.category]}</dd></div>
    <div><dt>Date</dt><dd>${iso ? Math.floor(new Date(iso).getTime() / 1000) : '—'}</dd></div>
    <div><dt>Price</dt><dd>${form.swapOnly ? '0 · swap only' : form.price || '—'}</dd></div>
    <div><dt>Venue hash</dt><dd class="hash" title="${hash}">${shortHash(hash)}</dd></div>
    <div class="off"><dt>Off-chain</dt><dd>venue and seat text</dd></div>`;
  const seatField = $('f-seat');
  seatField.setAttribute('aria-invalid', dup ? 'true' : 'false');
  $('seat-help').innerHTML = dup
    ? `<span class="err">This seat is already listed as <a href="/seat.html?id=${dup.id}">${seatNo(dup.id)}</a>. The contract allows one active listing per seat.</span>`
    : esc(c.seatHelp);
  $('foot-note').textContent = dup ? 'Already listed' : '';
}

main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  form.category = b.dataset.cat;
  main.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  renderPreview();
});
const bind = (id, key, read = (el) => el.value) => $(id).addEventListener('input', (e) => { form[key] = read(e.target); clearError(id); renderPreview(); });
bind('f-date', 'date'); bind('f-time', 'time'); bind('f-venue', 'venue'); bind('f-seat', 'seatRef'); bind('f-price', 'price', (el) => el.value.replace(/[^\d]/g, ''));
$('f-swap').addEventListener('change', (e) => { form.swapOnly = e.target.checked; renderPreview(); });

const FIELD = { date: 'f-date', venue: 'f-venue', seatRef: 'f-seat', price: 'f-price' };
function clearError(id) {
  const el = $(id);
  el.removeAttribute('aria-invalid');
  el.parentElement.querySelector('.err.inline')?.remove();
}
function showErrors(errs) {
  for (const [key, msg] of Object.entries(errs)) {
    const el = $(FIELD[key]);
    el.setAttribute('aria-invalid', 'true');
    el.parentElement.querySelector('.err.inline')?.remove();
    el.insertAdjacentHTML('afterend', `<span class="err inline" role="alert">${esc(msg)}</span>`);
  }
  $(FIELD[Object.keys(errs)[0]])?.focus();
}

$('list-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errs = errors();
  if (Object.keys(errs).length) return showErrors(errs);
  const btn = $('submit');
  btn.disabled = true;
  btn.textContent = 'Signing…';
  try {
    const r = await run('Listing seat', () => ledger.listSeat({ category: form.category, date: `${form.date}T${form.time}`, venue: form.venue.trim(),
      seatRef: form.seatRef.trim(), price: Number(form.price), swapOnly: form.swapOnly }));
    $('form-grid').innerHTML = `<section class="panel" aria-labelledby="done-title" style="grid-column:1/-1">
      <header><h2 id="done-title">Listed as ${seatNo(r.seatId)}</h2><span class="meta">Settled in ${(r.ms / 1000).toFixed(2)} s</span></header>
      <dl class="facts">
        <div><dt>Seat</dt><dd>${esc(form.venue)} · ${esc(form.seatRef)}</dd></div>
        <div><dt>Ask</dt><dd>${form.swapOnly ? 'Swap only' : priceHtml(Number(form.price))}</dd></div>
        <div><dt>Transaction</dt><dd class="hash"><a href="${txHref(r.tx, r.seatId)}">${shortHash(r.tx)}</a></dd></div>
      </dl>
      <div class="form-foot"><a class="btn" href="/list.html">List another</a><a class="btn primary" href="/seat.html?id=${r.seatId}">Open the seat</a></div>
    </section>`;
  } catch {
    btn.disabled = false;
    btn.textContent = 'List seat';
  }
});

renderPreview();
