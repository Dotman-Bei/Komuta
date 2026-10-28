// Profile: what do I hold, and how am I trusted?
import * as ledger from '../chain/ledger.js';
import { txHref } from '../config.js';
import { mount, icon, run, toast } from './shell.js';
import { esc, day, shortAddr, shortHash, avatar, price, priceHtml, stars, isoDay } from '../lib/format.js';

mount('profile');
const main = document.getElementById('main');

function render() {
  const me = ledger.account();
  const rep = ledger.getReputation(me);
  const seats = ledger.getSeats().filter((s) => s.holder === me).sort((a, b) => new Date(a.date) - new Date(b.date));
  const listed = seats.filter((s) => s.listed);
  const pending = ledger.pendingRatings(me);
  const mineEvents = ledger.allEvents().filter((e) => e.from === me || e.to === me);
  const swaps = mineEvents.filter((e) => e.type === 'Komutaped');
  const first = mineEvents[0];
  const settlements = new Set(swaps.map((e) => e.tx)).size;
  console.assert(settlements === rep.swaps, 'profile: completed swaps match the reputation counter');

  main.innerHTML = `
    <div class="title-row">
      <div style="display:flex;gap:14px;align-items:center">${avatar(me, 'lg')}
        <div><h1 class="num">${shortAddr(me)} <button class="icon-btn" data-copy="${me}" aria-label="Copy address">${icon('copy')}</button></h1>
        <p class="sub">${first ? `First on Komuta ${isoDay(first.ts)}` : 'New wallet'} · reputation is computed in the contract and can't be transferred</p></div>
      </div>
    </div>

    <div class="kpis" style="margin-bottom:var(--gap)">
      <div class="kpi"><div class="kpi-label">Average rating</div><div class="kpi-value lead num">${stars(rep.avgX100)}</div>
        <div class="delta">${rep.ratings ? `out of 5, from ${rep.ratings} ${rep.ratings === 1 ? 'rating' : 'ratings'}` : 'no ratings yet'}</div></div>
      <div class="kpi"><div class="kpi-label">Completed swaps</div><div class="kpi-value num">${rep.swaps}</div><div class="delta">as buyer or seller</div></div>
      <div class="kpi"><div class="kpi-label">Seats held</div><div class="kpi-value num">${seats.length}</div><div class="delta">${seats.length - listed.length} not listed</div></div>
      <div class="kpi"><div class="kpi-label">Seats listed</div><div class="kpi-value num">${listed.length}</div><div class="delta">${listed.reduce((n, s) => n + s.offersOpen, 0)} open offers</div></div>
    </div>

    <div class="six">
      <section class="panel span-3" aria-labelledby="rate-title">
        <header><h2 id="rate-title">Swaps to rate</h2><span class="meta">once per side, 1 to 5 stars</span></header>
        ${pending.length ? `<div class="rows">${pending.map((e) => {
          const seat = ledger.getSeat(e.seatId);
          return `<div class="row" style="justify-content:space-between;flex-wrap:wrap">
            <span class="who">${avatar(e.counterparty)}<span><span class="addr">${shortAddr(e.counterparty)}</span>
              <span class="cell-sub">${esc(seat.seatRef)} · ${e.withSeat ? 'swapped' : price(e.price)} · ${isoDay(e.ts)}</span></span></span>
            <span class="stars" role="radiogroup" aria-label="Rate ${shortAddr(e.counterparty)}">${[1, 2, 3, 4, 5].map((n) =>
              `<button type="button" role="radio" aria-checked="false" aria-label="${n} ${n === 1 ? 'star' : 'stars'}" data-rate="${e.tx}" data-stars="${n}">${icon('star')}</button>`).join('')}</span>
          </div>`;
        }).join('')}</div>` : '<div class="empty">Every swap you took part in is rated.</div>'}
      </section>

      <section class="panel flush span-3" aria-labelledby="held-title">
        <header><h2 id="held-title">Seats you hold</h2><a class="card-link" href="/list.html">List a seat</a></header>
        ${seats.length ? `<table class="seat-table"><colgroup><col style="width:62%"><col style="width:38%"></colgroup><tbody>${seats.map((s) => `<tr data-id="${s.id}">
          <td><div class="seat-cell"><span class="glyph">${icon(s.category)}</span><span style="min-width:0"><a class="name" href="/seat.html?id=${s.id}">${esc(s.venue)}</a>
            <span class="ref">${esc(s.seatRef)} · ${day(s.date)}</span></span></div></td>
          <td class="n">${s.listed ? (s.swapOnly ? '<span class="swap-only">Swap only</span>' : `<span class="ask num">${priceHtml(s.price)}</span>`) : '<span class="muted">Not listed</span>'}
            <span class="cell-sub">${s.listed ? `${s.offersOpen} ${s.offersOpen === 1 ? 'offer' : 'offers'}` : `<a class="btn link" href="/seat.html?id=${s.id}">List again</a>`}</span></td>
        </tr>`).join('')}</tbody></table>` : '<div class="empty" style="margin:0 20px 20px">You hold no seats. <a class="btn link" href="/browse.html">Browse seats</a></div>'}
      </section>

      <section class="panel flush span-6" aria-labelledby="swaps-title">
        <header><h2 id="swaps-title">Swap history</h2><span class="meta">${swaps.length} ${swaps.length === 1 ? 'swap' : 'swaps'} · newest first</span></header>
        <div class="table-wrap"><table class="seat-table">
          <colgroup><col style="width:36%"><col style="width:22%"><col style="width:14%"><col style="width:14%"><col style="width:14%"></colgroup>
          <thead><tr><th>Seat</th><th>Counterparty</th><th class="n">Paid or received</th><th class="n">Date</th><th class="n">Transaction</th></tr></thead>
          <tbody>${[...swaps].reverse().map((e) => {
            const seat = ledger.getSeat(e.seatId);
            const gave = e.from === me;
            const other = gave ? e.to : e.from;
            const amount = e.withSeat ? `<span class="muted">for ${esc(ledger.getSeat(e.withSeat).seatRef)}</span>` : `${gave ? '+' : '−'}${priceHtml(e.price)}`;
            return `<tr data-id="${seat.id}">
              <td><div class="seat-cell"><span class="glyph">${icon(seat.category)}</span><span style="min-width:0"><a class="name" href="/seat.html?id=${seat.id}">${esc(seat.venue)}</a><span class="ref">${esc(seat.seatRef)} · ${gave ? 'sold' : 'bought'}</span></span></div></td>
              <td class="hide-sm"><span class="who">${avatar(other)}<span class="addr">${shortAddr(other)}</span></span></td>
              <td class="n num ask" style="font-weight:500">${amount}</td>
              <td class="n num hide-sm">${isoDay(e.ts)}</td>
              <td class="n hash hide-sm"><a href="${txHref(e.tx, seat.id)}">${shortHash(e.tx)}</a></td>
              <td class="line2">${gave ? 'To' : 'From'} ${shortAddr(other)} · ${isoDay(e.ts)}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="5"><div class="empty">No swaps yet.</div></td></tr>'}</tbody>
        </table></div>
      </section>
    </div>`;
}

main.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-copy]');
  if (c) { navigator.clipboard?.writeText(c.dataset.copy); return toast('Address copied'); }
  const r = e.target.closest('[data-rate]');
  if (r) {
    const group = r.parentElement;
    group.querySelectorAll('button').forEach((b) => { const on = Number(b.dataset.stars) <= Number(r.dataset.stars); b.classList.toggle('on', on); b.setAttribute('aria-checked', b === r); });
    await run(`Rating ${r.dataset.stars} of 5`, () => ledger.rateCounterparty(r.dataset.rate, Number(r.dataset.stars))).catch(() => {});
  }
});
main.addEventListener('mouseover', (e) => {
  const r = e.target.closest('[data-rate]');
  if (!r) return;
  r.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.stars) <= Number(r.dataset.stars)));
});
main.addEventListener('mouseout', (e) => {
  const g = e.target.closest('.stars');
  if (g && !g.contains(e.relatedTarget)) g.querySelectorAll('button').forEach((b) => b.classList.remove('on'));
});

ledger.subscribe(render);
render();
