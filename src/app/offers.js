// Offers: which offer should I accept now?
import * as ledger from '../chain/ledger.js';
import { txHref } from '../config.js';
import { mount, icon, run, sheet } from './shell.js';
import { esc, day, shortAddr, shortHash, avatar, price, priceHtml, stars, left, ago, isoDay } from '../lib/format.js';

mount('offers');
const main = document.getElementById('main');
let tab = location.hash === '#sent' ? 'sent' : 'received';
const SOON = 3 * 3600e3;

const seatName = (s) => `${esc(s.venue)}`;
const offerWhat = (o) => o.offeredSeatId
  ? `<span class="what swap">${esc(ledger.getSeat(o.offeredSeatId).seatRef)}<span class="cell-sub">${esc(ledger.getSeat(o.offeredSeatId).venue)}</span></span>`
  : `<span class="what">${priceHtml(o.price)}</span>`;

function render() {
  const me = ledger.account();
  const received = ledger.getOffers({ to: me }).filter((o) => ['open', 'expired'].includes(o.status) && ledger.getSeat(o.seatId).listed);
  const sent = ledger.getOffers({ from: me }).filter((o) => ['open', 'expired'].includes(o.status));
  const openReceived = received.filter((o) => o.status === 'open');
  const bestOpen = openReceived.filter((o) => o.price).sort((a, b) => b.price - a.price)[0];
  const sub = openReceived.length
    ? `${openReceived.length} waiting on your seats${bestOpen ? ` · best ${price(bestOpen.price)} for ${esc(ledger.getSeat(bestOpen.seatId).seatRef)}, ${left(bestOpen.expires).replace(' left', '')} left` : ''}`
    : 'No offers are waiting on your seats.';

  const bySeat = Map.groupBy ? Map.groupBy(received, (o) => o.seatId) : received.reduce((m, o) => m.set(o.seatId, [...(m.get(o.seatId) ?? []), o]), new Map());
  const receivedHtml = received.length ? [...bySeat].map(([seatId, list]) => {
    const seat = ledger.getSeat(seatId);
    list.sort((a, b) => (a.status === 'expired') - (b.status === 'expired') || b.price - a.price);
    const top = list.find((o) => o.status === 'open' && o.price);
    return `<section class="panel flush offer-group" aria-label="Offers on ${esc(seat.seatRef)}">
      <div class="group-head"><div class="seat-cell"><span class="glyph">${icon(seat.category)}</span><span style="min-width:0">
        <a class="name" href="/seat.html?id=${seat.id}">${seatName(seat)}</a><span class="ref">${esc(seat.seatRef)} · ${day(seat.date)} · ${seat.swapOnly ? 'swap only' : `ask ${price(seat.price)}`}</span></span></div>
        <span class="meta">${list.filter((o) => o.status === 'open').length} open</span></div>
      ${list.map((o) => {
        const rep = ledger.getReputation(o.from);
        const expired = o.status === 'expired';
        return `<div class="offer-row ${o === top ? 'is-best' : ''}">
          <span class="who">${avatar(o.from)}<span><span class="addr">${shortAddr(o.from)}</span><span class="cell-sub">${rep.swaps} swaps · ${stars(rep.avgX100)} avg</span></span></span>
          <span class="from muted">${o.offeredSeatId ? 'Offers a swap' : 'Offers to pay'} · ${ago(o.ts)}</span>
          ${offerWhat(o)}
          <span class="left ${!expired && o.expires - Date.now() < SOON ? 'soon' : ''}">${expired ? '<span class="pill neg">Expired</span>' : left(o.expires)}</span>
          <span class="acts">${expired ? '<span class="muted">Can\'t be accepted</span>' : `<button class="btn sm ${o === bestOpen ? 'primary' : ''}" data-accept="${o.id}" data-seat="${seat.id}">Accept</button>`}</span>
        </div>`;
      }).join('')}
    </section>`;
  }).join('') : '<div class="empty">No offers on your seats yet. Listed seats get offers for 24 hours at a time.</div>';

  const sentHtml = sent.length ? `<section class="panel flush" aria-label="Offers you made">${sent.map((o) => {
    const seat = ledger.getSeat(o.seatId);
    const expired = o.status === 'expired';
    return `<div class="offer-row">
      <div class="seat-cell"><span class="glyph">${icon(seat.category)}</span><span style="min-width:0"><a class="name" href="/seat.html?id=${seat.id}">${seatName(seat)}</a><span class="ref">${esc(seat.seatRef)}</span></span></div>
      <span class="from muted">${seat.swapOnly ? 'Swap only' : `Ask ${price(seat.price)}`} · held by ${shortAddr(seat.holder)}</span>
      ${offerWhat(o)}
      <span class="left">${expired ? '<span class="pill neg">Expired</span>' : left(o.expires)}</span>
      <span class="acts">${expired ? '' : `<button class="btn sm" data-retract="${o.id}" data-seat="${seat.id}">Retract</button>`}</span>
    </div>`;
  }).join('')}</section>` : '<div class="empty">You have no open offers. <a class="btn link" href="/browse.html">Browse seats</a></div>';

  // the last settlements this wallet was part of, so a swap is seen landing
  const settled = ledger.allEvents().filter((e) => e.type === 'Komutaped' && (e.from === me || e.to === me)).slice(-3).reverse();

  main.innerHTML = `
    <div class="title-row"><div><h1>Offers</h1><p class="sub">${sub}</p></div></div>
    <nav class="tabs" role="tablist" aria-label="Offers">
      <a href="#received" role="tab" aria-selected="${tab === 'received'}" data-tab="received">Received <span class="num muted">${openReceived.length}</span></a>
      <a href="#sent" role="tab" aria-selected="${tab === 'sent'}" data-tab="sent">Sent <span class="num muted">${sent.filter((o) => o.status === 'open').length}</span></a>
    </nav>
    <div role="tabpanel">${tab === 'received' ? receivedHtml : sentHtml}</div>
    <section class="panel flush" style="margin-top:var(--gap)" aria-labelledby="settled-title">
      <header><h2 id="settled-title">Recently settled</h2><span class="meta">your last ${settled.length} swaps</span></header>
      ${settled.map((e) => {
        const seat = ledger.getSeat(e.seatId);
        const gave = e.from === me;
        return `<div class="offer-row">
          <div class="seat-cell"><span class="glyph">${icon(seat.category)}</span><span style="min-width:0"><a class="name" href="/seat.html?id=${seat.id}">${seatName(seat)}</a><span class="ref">${esc(seat.seatRef)}</span></span></div>
          <span class="from muted">${gave ? `To ${shortAddr(e.to)}` : `From ${shortAddr(e.from)}`}</span>
          <span class="what">${e.withSeat ? `<span class="swap">for ${esc(ledger.getSeat(e.withSeat).seatRef)}</span>` : `${gave ? '+' : '−'}${priceHtml(e.price)}`}</span>
          <span class="left">${isoDay(e.ts)}</span>
          <span class="acts hash"><a href="${txHref(e.tx, seat.id)}">${shortHash(e.tx)}</a></span>
        </div>`;
      }).join('') || '<div class="empty">No swaps yet.</div>'}
    </section>`;
}

function acceptSheet(seatId, offerId) {
  const seat = ledger.getSeat(seatId);
  const o = ledger.getOffers({ seatId }).find((x) => x.id === offerId);
  const get = o.offeredSeatId ? `${esc(ledger.getSeat(o.offeredSeatId).venue)}<br><span class="muted" style="font-weight:400">${esc(ledger.getSeat(o.offeredSeatId).seatRef)}</span>` : price(o.price);
  const d = sheet({
    title: 'Accept offer',
    body: `<dl class="give-get">
        <div><dt>You give</dt><dd>${esc(seat.venue)}<br><span class="muted" style="font-weight:400">${esc(seat.seatRef)}</span></dd></div>
        <div><dt>You receive</dt><dd>${get}</dd></div>
        <div><dt>From</dt><dd style="font-weight:400"><span class="who">${avatar(o.from)}${shortAddr(o.from)}</span></dd></div>
        <div><dt>Offer expires</dt><dd style="font-weight:400">${left(o.expires)}</dd></div>
      </dl>
      <p class="muted">One transaction. Both sides change hands together, or nothing moves. The other ${ledger.getOffers({ seatId }).filter((x) => x.status === 'open').length - 1} open offers on this seat are voided.</p>`,
    foot: `<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="send" id="confirm">Accept and settle</button>`,
  });
  d.querySelector('#confirm').addEventListener('click', async (e) => {
    e.preventDefault();
    d.close();
    await run('Settling', () => ledger.acceptOffer(seatId, offerId), { seatId }).catch(() => {});
  });
}

main.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-tab], [data-accept], [data-retract]');
  if (!t) return;
  if (t.dataset.tab) { e.preventDefault(); tab = t.dataset.tab; history.replaceState(null, '', `#${tab}`); return render(); }
  if (t.dataset.accept) return acceptSheet(Number(t.dataset.seat), Number(t.dataset.accept));
  if (t.dataset.retract) await run('Retracting offer', () => ledger.retractOffer(Number(t.dataset.seat), Number(t.dataset.retract))).catch(() => {});
});

ledger.subscribe(render);
render();
setInterval(render, 60e3);   // the 24-hour clocks tick
