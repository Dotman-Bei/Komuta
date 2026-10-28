// Browse: which seat can I get, for when, at what price?
import * as ledger from '../chain/ledger.js';
import { mount, icon } from './shell.js';
import { esc, day, time, shortAddr, avatar, priceHtml, price, stars, CATEGORY } from '../lib/format.js';

mount('browse', 'Seats');
const main = document.getElementById('main');
const url = new URL(location.href);
const DAY = 864e5;
const state = { cat: url.searchParams.get('cat') ?? 'all', when: 'any', q: url.searchParams.get('q') ?? '', min: '', max: '', sort: 'soonest' };
const CATS = [['all', 'All seats'], ['event', 'Events'], ['flight', 'Flights'], ['train', 'Trains'], ['swap', 'Swap only']];

main.insertAdjacentHTML('afterbegin', `
  <div class="title-row">
    <div><h1>Seats</h1><p class="sub" id="summary"></p></div>
    <div class="actions"><a class="btn primary" href="/list.html">List a seat</a></div>
  </div>
  <div class="counts" id="counts" role="group" aria-label="Filter by kind of seat"></div>
  <div class="filters">
    <div class="segmented" role="group" aria-label="Date">
      <button type="button" data-when="any" aria-pressed="true">Any date</button>
      <button type="button" data-when="week" aria-pressed="false">This week</button>
      <button type="button" data-when="month" aria-pressed="false">Next 30 days</button>
    </div>
    <label class="search">${icon('search')}<span class="sr-only">Venue or route</span>
      <input class="input" id="q" type="search" placeholder="Venue, route or seat" value="${esc(state.q)}" autocomplete="off"></label>
    <span class="price-range"><label class="sr-only" for="min">Lowest price</label><input class="input num" id="min" inputmode="numeric" placeholder="Min">
      <span aria-hidden="true">–</span><label class="sr-only" for="max">Highest price</label><input class="input num" id="max" inputmode="numeric" placeholder="Max"></span>
    <span class="spacer"></span>
    <label class="sr-only" for="sort">Sort</label>
    <select class="input" id="sort"><option value="soonest">Soonest first</option><option value="cheapest">Lowest ask first</option><option value="swaps">Most swaps first</option></select>
  </div>
  <section class="panel flush" aria-labelledby="list-title">
    <header><h2 id="list-title">Listed now</h2><span class="meta" id="shown"></span></header>
    <div class="table-wrap"><table class="seat-table">
      <colgroup><col style="width:38%"><col style="width:14%"><col style="width:20%"><col style="width:10%"><col style="width:10%"><col style="width:8%"></colgroup>
      <thead><tr><th>Seat</th><th>When</th><th>Held by</th><th class="n">Swaps</th><th class="n">Ask</th><th class="n"><span class="sr-only">Action</span></th></tr></thead>
      <tbody id="rows"></tbody>
    </table></div>
  </section>`);

const listed = () => ledger.getSeats().filter((s) => s.listed);
const now = Date.now();
const inWhen = (s) => {
  const t = new Date(s.date).getTime();
  if (t < now) return false;
  return state.when === 'any' || t - now <= (state.when === 'week' ? 7 : 30) * DAY;
};
const inQuery = (s) => !state.q || `${s.venue} ${s.seatRef}`.toLowerCase().includes(state.q.trim().toLowerCase());
const inPrice = (s) => {
  if (s.swapOnly) return state.min === '' && state.max === '';
  return (state.min === '' || s.price >= +state.min) && (state.max === '' || s.price <= +state.max);
};
const inCat = (s, cat = state.cat) => cat === 'all' || (cat === 'swap' ? s.swapOnly : s.category === cat);

// past holders of a seat in order, from its settlements
function holders(id) {
  const ev = ledger.getHistory(id).filter((e) => e.type === 'Komutaped');
  const first = ledger.getHistory(id).find((e) => e.type === 'SeatListed')?.from;
  return [first, ...ev.map((e) => e.to)].filter(Boolean);
}

function render() {
  const base = listed().filter((s) => inWhen(s) && inQuery(s) && inPrice(s));
  // counts follow the view: every filter but the kind applies to them
  document.getElementById('counts').innerHTML = CATS.map(([id, label]) =>
    `<button type="button" class="count-card" data-cat="${id}" aria-pressed="${state.cat === id}"><span>${label}</span><b>${base.filter((s) => inCat(s, id)).length}</b></button>`).join('');

  const rows = base.filter((s) => inCat(s));
  rows.sort((a, b) => state.sort === 'cheapest' ? (a.swapOnly - b.swapOnly) || a.price - b.price
    : state.sort === 'swaps' ? b.swaps - a.swaps : new Date(a.date) - new Date(b.date));
  const priced = rows.filter((s) => !s.swapOnly);
  const lowest = priced.length ? Math.min(...priced.map((s) => s.price)) : null;

  const all = listed().filter((s) => new Date(s.date).getTime() >= now);
  const week = all.filter((s) => new Date(s.date).getTime() - now <= 7 * DAY).length;
  const allPriced = all.filter((s) => !s.swapOnly);
  document.getElementById('summary').textContent =
    `${all.length} listed · ${week} this week · lowest ask ${allPriced.length ? price(Math.min(...allPriced.map((s) => s.price))) : '—'}`;
  document.getElementById('shown').textContent = `${rows.length} of ${all.length}`;

  const me = ledger.account();
  document.getElementById('rows').innerHTML = rows.length ? rows.map((s) => {
    const rep = ledger.getReputation(s.holder);
    const chain = holders(s.id).slice(-4);
    const mine = s.holder === me;
    return `<tr data-id="${s.id}">
      <td><div class="seat-cell"><span class="glyph" title="${CATEGORY[s.category]}">${icon(s.category)}</span>
        <span style="min-width:0"><a class="name" href="/seat.html?id=${s.id}">${esc(s.venue)}</a><span class="ref">${esc(s.seatRef)}</span></span></div></td>
      <td class="hide-sm">${day(s.date)}<span class="sub num">${time(s.date)}</span></td>
      <td class="hide-sm"><span class="who">${avatar(s.holder)}<span><span class="addr">${mine ? 'You' : shortAddr(s.holder)}</span>
        <span class="sub">${rep.swaps} ${rep.swaps === 1 ? 'swap' : 'swaps'} · ${stars(rep.avgX100)} avg</span></span></span></td>
      <td class="n hide-sm"><span class="stack" aria-hidden="true">${chain.length > 1 ? chain.map((a) => avatar(a, 'ring')).join('') : ''}</span>
        <span class="num" style="margin-left:6px">${s.swaps}</span></td>
      <td class="n">${s.swapOnly ? '<span class="swap-only">Swap only</span>' : `<span class="ask num ${s.price === lowest ? 'best' : ''}">${priceHtml(s.price)}</span>`}</td>
      <td class="n hide-sm">${mine ? '<span class="muted">Yours</span>' : `<a class="btn link" href="/seat.html?id=${s.id}#offer">Offer</a>`}</td>
      <td class="line2">${day(s.date)} ${time(s.date)} · ${mine ? 'You' : shortAddr(s.holder)} · ${s.swaps} ${s.swaps === 1 ? 'swap' : 'swaps'}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty">No seats match these filters. <button class="btn link" type="button" id="clear">Clear filters</button></div></td></tr>`;
}

main.addEventListener('click', (e) => {
  const card = e.target.closest('[data-cat]');
  if (card) { state.cat = card.dataset.cat; return render(); }
  const w = e.target.closest('[data-when]');
  if (w) {
    state.when = w.dataset.when;
    main.querySelectorAll('[data-when]').forEach((b) => b.setAttribute('aria-pressed', b === w));
    return render();
  }
  if (e.target.id === 'clear') {
    Object.assign(state, { cat: 'all', when: 'any', q: '', min: '', max: '' });
    ['q', 'min', 'max'].forEach((id) => { document.getElementById(id).value = ''; });
    main.querySelectorAll('[data-when]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.when === 'any'));
    return render();
  }
  const row = e.target.closest('tr[data-id]');
  if (row && !e.target.closest('a, button')) location.href = `/seat.html?id=${row.dataset.id}`;
});
for (const id of ['q', 'min', 'max']) document.getElementById(id).addEventListener('input', (e) => { state[id] = e.target.value.trim(); render(); });
document.getElementById('sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
ledger.subscribe(render);
render();
