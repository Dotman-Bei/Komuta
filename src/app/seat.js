// Seat detail: is this seat real, who held it, and what did they pay?
import '../vendor/charts.js';
import * as ledger from '../chain/ledger.js';
import { config, txHref } from '../config.js';
import { mount, icon, run, sheet, toast } from './shell.js';
import { esc, day, time, when, isoDay, shortAddr, shortHash, avatar, price, priceHtml, seatNo, stars, CATEGORY } from '../lib/format.js';

mount('browse');
const main = document.getElementById('main');
const id = Number(new URL(location.href).searchParams.get('id')) || 1;
let seenEvents = null;

const EVENT = { SeatListed: 'Listed', Komutaped: 'Swapped', OfferMade: 'Offer made', OfferRetracted: 'Offer retracted',
  ListingCancelled: 'Listing cancelled', Rated: 'Rated' };

function render() {
  const seat = ledger.getSeat(id);
  if (!seat) {
    main.innerHTML = `<div class="title-row"><div><h1>Seat ${seatNo(id)}</h1><p class="sub">No seat with this number has been listed.</p></div></div>
      <a class="btn" href="/browse.html">Browse seats</a>`;
    return;
  }
  document.title = `${seat.venue} · ${seat.seatRef} · Komuta`;
  const me = ledger.account();
  const mine = seat.holder === me;
  const history = ledger.getHistory(id);
  const swaps = history.filter((e) => e.type === 'Komutaped');
  const priced = swaps.filter((e) => !e.withSeat);
  const lastSwap = swaps.at(-1);
  const firstListing = history.find((e) => e.type === 'SeatListed');
  const chain = [firstListing.from, ...swaps.map((e) => e.to)];
  const rep = ledger.getReputation(seat.holder);
  const offers = ledger.getOffers({ seatId: id }).filter((o) => o.status === 'open');
  const best = offers.filter((o) => o.price).sort((a, b) => b.price - a.price)[0];

  const finding = swaps.length
    ? `Changed hands ${swaps.length === 1 ? 'once' : `${swaps.length} times`}; last swap ${lastSwap.withSeat ? `for ${esc(ledger.getSeat(lastSwap.withSeat).seatRef)}` : price(lastSwap.price)} on ${isoDay(lastSwap.ts)}.`
      + (seat.listed && !seat.swapOnly && priced.length ? ` The ask is ${price(seat.price)}, ${seat.price >= priced.at(-1).price ? '+' : '−'}${price(Math.abs(seat.price - priced.at(-1).price))} on the last price paid.` : '')
    : `Never swapped. Listed by its first holder on ${isoDay(firstListing.ts)}.`;

  let actions;
  if (mine) {
    actions = seat.listed
      ? `<a class="btn" href="/offers.html">Offers (${offers.length})</a><button class="btn danger" data-act="cancel">Cancel listing</button>`
      : `<button class="btn primary" data-act="relist">List again</button>`;
  } else if (!seat.listed) {
    actions = `<button class="btn" disabled>Not listed</button>`;
  } else if (seat.swapOnly) {
    actions = `<button class="btn primary" data-act="swap">Offer a swap</button>`;
  } else {
    actions = `<button class="btn primary" data-act="buy">Buy at ${price(seat.price)}</button><button class="btn" data-act="offer">Make offer</button><button class="btn" data-act="swap">Offer a swap</button>`;
  }

  const rows = [...history].reverse().map((e) => {
    const what = e.type === 'Komutaped' ? (e.withSeat ? `for ${esc(ledger.getSeat(e.withSeat).seatRef)}` : priceHtml(e.price))
      : e.type === 'SeatListed' ? (e.swapOnly ? 'Swap only' : priceHtml(e.price))
      : e.type === 'OfferMade' ? (e.withSeat ? `${esc(ledger.getSeat(e.withSeat).seatRef)}` : priceHtml(e.price))
      : e.type === 'Rated' ? `${e.price} of 5` : '<span class="muted">—</span>';
    const parties = e.to ? `<span class="who">${avatar(e.from)}<span class="addr">${shortAddr(e.from)}</span><span class="muted">→</span>${avatar(e.to)}<span class="addr">${shortAddr(e.to)}</span></span>`
      : `<span class="who">${avatar(e.from)}<span class="addr">${shortAddr(e.from)}</span></span>`;
    const fresh = seenEvents && !seenEvents.has(e.tx + e.type) ? 'is-new' : '';
    return `<tr id="tx-${e.tx.slice(2, 10)}" class="${fresh}">
      <td><span class="event-type">${EVENT[e.type]}</span></td>
      <td class="hide-sm">${parties}</td>
      <td class="n num">${what}</td>
      <td class="n num hide-sm">${e.block.toLocaleString('en-GB')}</td>
      <td class="n num hide-sm">${when(e.ts)}</td>
      <td class="n hash"><a href="${txHref(e.tx, id)}" ${config.explorerTxUrl ? 'target="_blank" rel="noopener"' : ''}>${shortHash(e.tx)}</a></td>
      <td class="line2">${shortAddr(e.from)}${e.to ? ` → ${shortAddr(e.to)}` : ''} · ${when(e.ts)}</td>
    </tr>`;
  }).join('');
  seenEvents = new Set(history.map((e) => e.tx + e.type));

  main.innerHTML = `
    <section class="object" aria-labelledby="seat-title">
      <div class="object__cover">${seat.photo ? `<img src="/img/${seat.photo}" alt="" width="50" height="62">` : icon(seat.category)}</div>
      <div class="object__main">
        <h1 id="seat-title">${esc(seat.venue)} <button class="icon-btn" data-copy="${seatNo(id)}" aria-label="Copy seat number">${icon('copy')}</button></h1>
        <p class="meta">${esc(seat.seatRef)} · ${day(seat.date)}, ${time(seat.date)} · ${CATEGORY[seat.category]} · Seat ${seatNo(id)}</p>
        <p class="finding">${finding}</p>
      </div>
      <div class="actions">${actions}</div>
    </section>

    <div class="six">
      <section class="panel span-6" aria-labelledby="chain-title">
        <header><h2 id="chain-title">Holders</h2><span class="meta">${chain.length} ${chain.length === 1 ? 'holder' : 'holders'} since ${isoDay(firstListing.ts)}, rebuilt from SeatListed and Komutaped events</span></header>
        <div class="chain">${chain.map((addr, i) => {
          const node = `<div class="chain__node ${i === chain.length - 1 ? 'now' : ''}">${avatar(addr, 'lg')}<span class="addr">${addr === me ? 'You' : shortAddr(addr)}</span></div>`;
          if (!i) return node;
          const e = swaps[i - 1];
          const paid = e.withSeat ? `↔ ${esc(ledger.getSeat(e.withSeat).seatRef.replace(/^Seat /, ''))}` : price(e.price);
          return `<div class="chain__link ${i === chain.length - 1 ? 'latest' : ''}"><span class="px">${paid}</span><i></i><span class="d">${isoDay(e.ts)}</span></div>${node}`;
        }).join('')}</div>
      </section>

      <section class="panel span-4" aria-labelledby="price-title">
        <header><h2 id="price-title">Price paid at each swap</h2><span class="meta">${priced.length} priced ${priced.length === 1 ? 'swap' : 'swaps'}${seat.listed && !seat.swapOnly ? ` · ask ${price(seat.price)}` : ''}</span></header>
        ${priced.length ? '<div class="chart" id="price-chart"></div>' : `<div class="empty">No priced swaps yet${swaps.length ? ': this seat has only been swapped for another seat' : ''}.</div>`}
      </section>

      <section class="panel span-2" aria-labelledby="facts-title">
        <header><h2 id="facts-title">On-chain record</h2></header>
        <dl class="facts">
          <div><dt>Holder</dt><dd><span class="who">${avatar(seat.holder)}${mine ? 'You' : shortAddr(seat.holder)}</span></dd></div>
          <div><dt>Holder's swaps</dt><dd>${rep.swaps}</dd></div>
          <div><dt>Holder's rating</dt><dd>${stars(rep.avgX100)}${rep.ratings ? ` <span class="muted">of 5 · ${rep.ratings}</span>` : ''}</dd></div>
          <div><dt>Status</dt><dd>${seat.listed ? (seat.swapOnly ? 'Listed, swap only' : `Listed at ${price(seat.price)}`) : 'Held, not listed'}</dd></div>
          <div><dt>Open offers</dt><dd>${offers.length}${best ? ` <span class="muted">· best ${price(best.price)}</span>` : ''}</dd></div>
          <div><dt>Venue hash</dt><dd class="hash" title="${seat.venueHash}">${shortHash(seat.venueHash)}</dd></div>
        </dl>
      </section>

      <section class="panel flush span-6" aria-labelledby="history-title">
        <header><h2 id="history-title">History</h2><span class="meta">${history.length} events · newest first</span></header>
        <div class="table-wrap"><table class="seat-table">
          <colgroup><col style="width:14%"><col style="width:30%"><col style="width:14%"><col style="width:11%"><col style="width:17%"><col style="width:14%"></colgroup>
          <thead><tr><th>Event</th><th>From → to</th><th class="n">Price</th><th class="n">Block</th><th class="n">Time</th><th class="n">Transaction</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </section>
    </div>`;

  if (priced.length) {
    Charts.bars(document.getElementById('price-chart'), {
      labels: priced.map((e) => isoDay(e.ts).slice(5)),
      values: priced.map((e) => e.price),
      highlight: priced.length - 1,
      height: 180,
      format: (v) => price(v),
      tickFormat: (v) => String(v),
      reference: seat.listed && !seat.swapOnly ? { value: seat.price, label: `Ask ${price(seat.price)}` } : undefined,
    });
  }
  if (location.hash.startsWith('#tx-')) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' });
}

// ---------- offer, swap and buy sheets ----------
function offerSheet(seat) {
  const d = sheet({
    title: 'Make an offer',
    body: `<p>${esc(seat.venue)} · ${esc(seat.seatRef)}<br><span class="muted">Ask ${price(seat.price)} · ${day(seat.date)}</span></p>
      <div class="field"><label for="offer-price">Your price (${config.symbol})</label>
        <input class="input num" id="offer-price" inputmode="numeric" value="${Math.max(1, seat.price - 2)}" aria-describedby="offer-hint">
        <span class="hint" id="offer-hint">The offer stays open for ${config.offerTtlHours} hours. Nothing leaves your wallet until the holder accepts, and then seat and payment move together.</span></div>`,
    foot: `<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="send" id="send-offer">Send offer</button>`,
  });
  d.querySelector('#send-offer').addEventListener('click', async (e) => {
    e.preventDefault();
    const v = Number(d.querySelector('#offer-price').value);
    d.close();
    await run('Sending offer', () => ledger.makeOffer(seat.id, v), { seatId: seat.id }).catch(() => {});
  });
}

function swapSheet(seat) {
  const me = ledger.account();
  const mine = ledger.getSeats().filter((s) => s.holder === me && s.id !== seat.id);
  const d = sheet({
    title: 'Offer a swap',
    body: `<p>${esc(seat.venue)} · ${esc(seat.seatRef)}<br><span class="muted">${day(seat.date)}. If the holder accepts, both seats change hands in one transaction.</span></p>
      ${mine.length ? `<fieldset class="choice" style="border:0;padding:0;margin:0"><legend class="sr-only">Seat to offer</legend>${mine.map((s, i) => `<label><input type="radio" name="give" value="${s.id}" ${i ? '' : 'checked'}>
        <span><b style="font-weight:500">${esc(s.venue)}</b><br><span class="muted">${esc(s.seatRef)} · ${day(s.date)}</span></span></label>`).join('')}</fieldset>`
        : '<div class="empty">You hold no other seat to offer. <a class="btn link" href="/list.html">List a seat</a></div>'}`,
    foot: `<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="send" id="send-swap" ${mine.length ? '' : 'disabled'}>Send swap offer</button>`,
  });
  d.querySelector('#send-swap').addEventListener('click', async (e) => {
    e.preventDefault();
    const give = Number(d.querySelector('input[name=give]:checked')?.value);
    d.close();
    await run('Sending swap offer', () => ledger.makeSwapOffer(seat.id, give), { seatId: seat.id }).catch(() => {});
  });
}

function buySheet(seat) {
  const d = sheet({
    title: 'Buy at ask',
    body: `<dl class="give-get">
        <div><dt>You receive</dt><dd>${esc(seat.venue)}<br><span class="muted" style="font-weight:400">${esc(seat.seatRef)}</span></dd></div>
        <div><dt>You pay</dt><dd>${price(seat.price)}</dd></div>
        <div><dt>Network fee</dt><dd><span class="muted" style="font-weight:400">a fraction of a cent</span></dd></div>
      </dl>
      <p class="muted">One transaction: the seat moves to you and the payment to ${shortAddr(seat.holder)} together, or neither moves. Entry is decided by the venue, airline or railway.</p>`,
    foot: `<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="send" id="confirm-buy">Buy for ${price(seat.price)}</button>`,
  });
  d.querySelector('#confirm-buy').addEventListener('click', async (e) => {
    e.preventDefault();
    d.close();
    await run('Settling', () => ledger.buyAtAsk(seat.id), { seatId: seat.id }).catch(() => {});
  });
}

function relistSheet(seat) {
  const last = ledger.getHistory(seat.id).filter((e) => e.type === 'Komutaped' && !e.withSeat).at(-1);
  const d = sheet({
    title: 'List again',
    body: `<p>${esc(seat.venue)} · ${esc(seat.seatRef)}</p>
      <div class="field"><label for="relist-price">Asking price (${config.symbol})</label>
        <input class="input num" id="relist-price" inputmode="numeric" value="${last?.price ?? ''}"><span class="hint">${last ? `You paid ${price(last.price)}.` : ''}</span></div>
      <div class="switch-row"><div><b>Swap only</b><p>Take seats in exchange, not payment.</p></div><input type="checkbox" class="switch" id="relist-swap" aria-label="Swap only"></div>`,
    foot: `<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="send" id="send-relist">List seat</button>`,
  });
  d.querySelector('#send-relist').addEventListener('click', async (e) => {
    e.preventDefault();
    const v = Number(d.querySelector('#relist-price').value);
    const swap = d.querySelector('#relist-swap').checked;
    d.close();
    await run('Listing', () => ledger.relistSeat(seat.id, v, swap), { seatId: seat.id }).catch(() => {});
  });
}

main.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act], [data-copy]');
  if (!b) return;
  const seat = ledger.getSeat(id);
  if (b.dataset.copy) { navigator.clipboard?.writeText(b.dataset.copy); return toast(`Copied ${b.dataset.copy}`); }
  const act = b.dataset.act;
  if (act === 'offer') offerSheet(seat);
  if (act === 'swap') swapSheet(seat);
  if (act === 'buy') buySheet(seat);
  if (act === 'relist') relistSheet(seat);
  if (act === 'cancel') await run('Cancelling listing', () => ledger.cancelListing(id), { seatId: id }).catch(() => {});
});

ledger.subscribe(render);
render();
if (location.hash === '#offer') {
  const seat = ledger.getSeat(id);
  if (seat?.listed && seat.holder !== ledger.account()) (seat.swapOnly ? swapSheet : offerSheet)(seat);
}
