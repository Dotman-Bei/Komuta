// The demo ledger: an in-browser stand-in for Komuta.sol with the same calls, the same reverts and the
// same events. State is rebuilt from events where the contract would replay them (history, swap counts)
// and kept as counters where the contract keeps counters (reputation). Persisted in localStorage and
// shared live between tabs, so two windows act as the two parties of a swap.
import { config } from '../config.js';
import { WALLETS, SEATS, STEPS, OFFERS, RATINGS } from '../data/genesis.js';

const KEY = 'komuta.ledger.v2';
const HOUR = 3600e3;
const TTL = config.offerTtlHours * HOUR;
const channel = 'BroadcastChannel' in self ? new BroadcastChannel('komuta') : null;
const listeners = new Set();

// Deterministic 32-byte hex from a string (stands in for keccak256 in demo mode).
export function hash32(input) {
  let h1 = 0x811c9dc5, h2 = 0x01000193, out = '';
  for (let round = 0; round < 8; round++) {
    for (let i = 0; i < input.length; i++) {
      h1 = Math.imul(h1 ^ input.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ (h1 >>> 7), 2246822507) >>> 0;
    }
    h1 = Math.imul(h1 ^ round ^ h2, 3266489909) >>> 0;
    out += ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  }
  return `0x${out}`;
}

const venueKey = (venue, seatRef) => `${venue.trim().toLowerCase()}|${seatRef.trim().toLowerCase()}`;

function seed() {
  const now = Date.now();
  const s = { version: 1, seededAt: now, block: 4_812_300, seats: {}, events: [], offers: [], ratings: [],
    reputation: {}, nextSeat: SEATS.length + 1, nextOffer: 1, account: null };
  for (const meta of SEATS) {
    s.seats[meta.id] = { ...meta, venueHash: hash32(venueKey(meta.venue, meta.seatRef)), holder: null, listed: false,
      price: 0, swapOnly: false };
  }
  let n = 0;
  const tx = (tag) => hash32(`genesis:${tag}:${n++}`);
  for (const step of STEPS) {
    const ts = new Date(step.at).getTime();
    const seat = s.seats[step.seat];
    if (step.do === 'list') {
      const holder = WALLETS[step.by];
      if (seat.holder == null) seat.holder = holder;
      Object.assign(seat, { listed: true, price: step.price ?? 0, swapOnly: !!step.swapOnly });
      emit(s, { type: 'SeatListed', seatId: seat.id, from: holder, price: seat.price, swapOnly: seat.swapOnly, tx: tx('list'), ts });
    } else if (step.do === 'sell') {
      settle(s, seat, WALLETS[step.to], seat.price, tx('sell'), ts);
    } else if (step.do === 'swap') {
      settleSwap(s, seat, s.seats[step.with], tx('swap'), ts);
    }
  }
  for (const o of OFFERS) {
    const ts = now - o.hoursAgo * HOUR;
    const offer = { id: s.nextOffer++, seatId: o.seat, from: WALLETS[o.from], price: o.price ?? 0,
      offeredSeatId: o.offeredSeat ?? null, ts, expires: ts + TTL, state: 'open' };
    s.offers.push(offer);
    emit(s, { type: 'OfferMade', seatId: o.seat, from: offer.from, price: offer.price, offerId: offer.id,
      withSeat: offer.offeredSeatId, tx: tx('offer'), ts });
  }
  for (const r of RATINGS) {
    const settlement = s.events.filter((e) => e.type === 'Komutaped' && e.seatId === r.seat)[r.swapIndex];
    const ts = settlement.ts + 2 * HOUR;
    rate(s, settlement.tx, WALLETS[r.by], WALLETS[r.of], r.stars, ts);
    emit(s, { type: 'Rated', seatId: r.seat, from: WALLETS[r.by], to: WALLETS[r.of], price: r.stars, tx: tx('rate'), ts });
  }
  s.events.sort((a, b) => a.ts - b.ts);
  // blocks follow time: about one block a second since the first genesis event
  const t0 = s.events[0].ts;
  s.events.forEach((e) => { e.block = 4_812_300 + Math.round((e.ts - t0) / 1000); });
  s.block = s.events.at(-1).block;
  s.account = WALLETS.me;
  check(s);
  return s;
}

function emit(s, event) {
  s.block = Math.max(s.block + 1, s.events.length ? s.events[0].block + Math.round((event.ts - s.events[0].ts) / 1000) : s.block + 1);
  s.events.push({ ...event, block: s.block });
}

function bump(s, addr) {
  s.reputation[addr] ??= { swaps: 0, ratings: 0, stars: 0 };
  return s.reputation[addr];
}

function settle(s, seat, buyer, price, hash, ts) {
  const seller = seat.holder;
  Object.assign(seat, { holder: buyer, listed: false, lastPrice: price });
  bump(s, seller).swaps++;
  bump(s, buyer).swaps++;
  emit(s, { type: 'Komutaped', seatId: seat.id, from: seller, to: buyer, price, tx: hash, ts });
}

function settleSwap(s, a, b, hash, ts) {
  const [ha, hb] = [a.holder, b.holder];
  Object.assign(a, { holder: hb, listed: false });
  Object.assign(b, { holder: ha, listed: false });
  bump(s, ha).swaps++;
  bump(s, hb).swaps++;
  emit(s, { type: 'Komutaped', seatId: a.id, from: ha, to: hb, price: 0, withSeat: b.id, tx: hash, ts });
  emit(s, { type: 'Komutaped', seatId: b.id, from: hb, to: ha, price: 0, withSeat: a.id, tx: hash, ts });
}

function rate(s, settlementTx, by, of, stars, ts) {
  s.ratings.push({ tx: settlementTx, by, of, stars, ts });
  const r = bump(s, of);
  r.ratings++;
  r.stars += stars;
}

// The figures that must agree, checked on every load and every write.
function check(s) {
  for (const seat of Object.values(s.seats)) {
    const swaps = s.events.filter((e) => e.type === 'Komutaped' && e.seatId === seat.id).length;
    console.assert(swaps === swapCount(s, seat.id), `seat ${seat.id}: swap count drifted from its events`);
  }
  const settlements = new Set(s.events.filter((e) => e.type === 'Komutaped').map((e) => e.tx)).size;
  const repSwaps = Object.values(s.reputation).reduce((sum, r) => sum + r.swaps, 0);
  console.assert(repSwaps === settlements * 2, 'each settlement credits exactly two wallets');
  const ratingSum = Object.values(s.reputation).reduce((sum, r) => sum + r.ratings, 0);
  console.assert(ratingSum === s.ratings.length, 'rating counters match rating events');
}

const swapCount = (s, id) => s.events.filter((e) => e.type === 'Komutaped' && e.seatId === id).length;

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage blocked: fall through to a fresh seed */ }
  const s = seed();
  save(s, false);
  return s;
}

function save(s = state, broadcast = true) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* keep working in memory */ }
  if (broadcast) channel?.postMessage('changed');
}

function changed() {
  check(state);
  save();
  listeners.forEach((fn) => fn());
}

channel?.addEventListener('message', () => { state = load(); listeners.forEach((fn) => fn()); });
addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); listeners.forEach((fn) => fn()); } });

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
  state = seed();
  changed();
}

// ---------- reads (view calls) ----------
const view = (seat) => ({
  ...seat,
  swaps: swapCount(state, seat.id),
  listedAt: [...state.events].reverse().find((e) => e.type === 'SeatListed' && e.seatId === seat.id)?.ts ?? null,
  offersOpen: state.offers.filter((o) => o.seatId === seat.id && offerState(o) === 'open').length,
});

export const getSeats = () => Object.values(state.seats).map(view);
export const getSeat = (id) => (state.seats[id] ? view(state.seats[id]) : null);
export const getHistory = (id) => state.events.filter((e) => e.seatId === Number(id));
export const allEvents = () => state.events;

export function offerState(o) {
  if (o.state !== 'open') return o.state;
  const seat = state.seats[o.seatId];
  if (!seat.listed) return 'void';
  return Date.now() > o.expires ? 'expired' : 'open';
}

export const getOffers = (filter = {}) => state.offers
  .filter((o) => (filter.seatId == null || o.seatId === filter.seatId) && (filter.from == null || o.from === filter.from)
    && (filter.to == null || state.seats[o.seatId].holder === filter.to))
  .map((o) => ({ ...o, status: offerState(o) }));

export function getReputation(addr) {
  const r = state.reputation[addr] ?? { swaps: 0, ratings: 0, stars: 0 };
  return { swaps: r.swaps, ratings: r.ratings, avgX100: r.ratings ? Math.round((r.stars * 100) / r.ratings) : 0 };
}

// Settlements this wallet took part in that it has not rated yet.
export function pendingRatings(addr) {
  const done = new Set(state.ratings.filter((r) => r.by === addr).map((r) => r.tx));
  const seen = new Set();
  return state.events.filter((e) => e.type === 'Komutaped' && (e.from === addr || e.to === addr) && !done.has(e.tx))
    .filter((e) => !seen.has(e.tx) && seen.add(e.tx))
    .map((e) => ({ ...e, counterparty: e.from === addr ? e.to : e.from }));
}

export const ratingsFor = (tx) => state.ratings.filter((r) => r.tx === tx);

export function findDuplicate(venue, seatRef) {
  const key = venueKey(venue, seatRef);
  return Object.values(state.seats).find((s) => s.listed && venueKey(s.venue, s.seatRef) === key) ?? null;
}

export const account = () => state.account;
export const wallets = () => Object.values(WALLETS);
export function setAccount(addr) { state.account = addr; changed(); }

// ---------- writes (transactions) ----------
// Each resolves after a short simulated block time with the tx hash, or rejects with the contract's revert.
const latency = () => 280 + Math.round(Math.random() * 260);
function send(name, fn) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    setTimeout(() => {
      try {
        if (!state.account) throw new Error('Connect a wallet first');
        const tx = hash32(`${name}:${state.events.length}:${Date.now()}`);
        const result = fn(tx, Date.now());
        changed();
        resolve({ tx, ms: Math.round(performance.now() - started), ...result });
      } catch (err) { reject(err); }
    }, latency());
  });
}

const revert = (reason) => { throw new Error(reason); };
const holderOnly = (seat) => { if (seat.holder !== state.account) revert('Only the current holder can do this'); };

export const listSeat = ({ category, date, venue, seatRef, price, swapOnly }) => send('listSeat', (tx, ts) => {
  if (!swapOnly && !(price > 0)) revert('Price must be above zero unless the seat is swap-only');
  if (findDuplicate(venue, seatRef)) revert('This seat is already listed');
  const id = state.nextSeat++;
  state.seats[id] = { id, category, date, venue, seatRef, venueHash: hash32(venueKey(venue, seatRef)), holder: state.account,
    listed: true, price: swapOnly ? 0 : price, swapOnly: !!swapOnly };
  emit(state, { type: 'SeatListed', seatId: id, from: state.account, price: state.seats[id].price, swapOnly: !!swapOnly, tx, ts });
  return { seatId: id };
});

export const relistSeat = (seatId, price, swapOnly) => send('relistSeat', (tx, ts) => {
  const seat = state.seats[seatId];
  holderOnly(seat);
  if (seat.listed) revert('This seat is already listed');
  if (!swapOnly && !(price > 0)) revert('Price must be above zero unless the seat is swap-only');
  Object.assign(seat, { listed: true, price: swapOnly ? 0 : price, swapOnly: !!swapOnly });
  emit(state, { type: 'SeatListed', seatId, from: seat.holder, price: seat.price, swapOnly: seat.swapOnly, tx, ts });
  return { seatId };
});

function pushOffer(seatId, price, offeredSeatId, tx, ts) {
  const seat = state.seats[seatId];
  if (!seat?.listed) revert('This seat is not listed');
  if (seat.holder === state.account) revert('You hold this seat');
  const pending = state.offers.filter((o) => o.seatId === seatId && o.state === 'open');
  if (pending.length >= config.maxPendingOffers) pending[0].state = 'evicted';
  const offer = { id: state.nextOffer++, seatId, from: state.account, price, offeredSeatId, ts, expires: ts + TTL, state: 'open' };
  state.offers.push(offer);
  emit(state, { type: 'OfferMade', seatId, from: state.account, price, offerId: offer.id, withSeat: offeredSeatId, tx, ts });
  return { offerId: offer.id };
}

export const makeOffer = (seatId, price) => send('makeOffer', (tx, ts) => {
  if (!(price > 0)) revert('Offer must be above zero');
  if (state.seats[seatId]?.swapOnly) revert('This seat is swap-only');
  return pushOffer(seatId, price, null, tx, ts);
});

export const makeSwapOffer = (seatId, offeredSeatId) => send('makeSwapOffer', (tx, ts) => {
  const mine = state.seats[offeredSeatId];
  if (!mine || mine.holder !== state.account) revert('You can only offer a seat you hold');
  return pushOffer(seatId, 0, offeredSeatId, tx, ts);
});

// Buy at ask: an offer at the asking price accepted in the same transaction by the protocol.
export const buyAtAsk = (seatId) => send('buyAtAsk', (tx, ts) => {
  const seat = state.seats[seatId];
  if (!seat?.listed) revert('This seat is not listed');
  if (seat.swapOnly) revert('This seat is swap-only');
  if (seat.holder === state.account) revert('You hold this seat');
  voidOffers(seatId);
  settle(state, seat, state.account, seat.price, tx, ts);
  return { seatId, price: seat.lastPrice };
});

function voidOffers(seatId) {
  state.offers.filter((o) => o.seatId === seatId && o.state === 'open').forEach((o) => { o.state = 'void'; });
}

export const acceptOffer = (seatId, offerId) => send('acceptOffer', (tx, ts) => {
  const seat = state.seats[seatId];
  const offer = state.offers.find((o) => o.id === offerId && o.seatId === seatId);
  holderOnly(seat);
  if (!offer) revert('Offer not found');
  const status = offerState(offer);
  if (status === 'expired') revert('Offer expired');
  if (status !== 'open') revert('Offer is no longer open');
  offer.state = 'accepted';
  if (offer.offeredSeatId) {
    const other = state.seats[offer.offeredSeatId];
    if (other.holder !== offer.from) revert('The offered seat changed hands');
    voidOffers(seatId); voidOffers(other.id);
    offer.state = 'accepted';
    settleSwap(state, seat, other, tx, ts);
  } else {
    voidOffers(seatId);
    offer.state = 'accepted';
    settle(state, seat, offer.from, offer.price, tx, ts);
  }
  return { seatId };
});

export const cancelListing = (seatId) => send('cancelListing', (tx, ts) => {
  const seat = state.seats[seatId];
  holderOnly(seat);
  if (!seat.listed) revert('This seat is not listed');
  seat.listed = false;
  voidOffers(seatId);
  emit(state, { type: 'ListingCancelled', seatId, from: seat.holder, tx, ts });
  return {};
});

export const retractOffer = (seatId, offerId) => send('retractOffer', (tx, ts) => {
  const offer = state.offers.find((o) => o.id === offerId);
  if (!offer || offer.from !== state.account) revert('Only the offerer can retract');
  if (offer.state !== 'open') revert('Offer is no longer open');
  offer.state = 'retracted';
  emit(state, { type: 'OfferRetracted', seatId, from: offer.from, offerId, tx, ts });
  return {};
});

export const rateCounterparty = (settlementTx, stars) => send('rateCounterparty', (tx, ts) => {
  const e = state.events.find((x) => x.type === 'Komutaped' && x.tx === settlementTx);
  if (!e) revert('Rating before settlement');
  if (e.from !== state.account && e.to !== state.account) revert('Only a side of this swap can rate it');
  if (state.ratings.some((r) => r.tx === settlementTx && r.by === state.account)) revert('Already rated');
  if (!(stars >= 1 && stars <= 5)) revert('Stars must be 1 to 5');
  const of = e.from === state.account ? e.to : e.from;
  rate(state, settlementTx, state.account, of, stars, ts);
  emit(state, { type: 'Rated', seatId: e.seatId, from: state.account, to: of, price: stars, tx, ts });
  return {};
});
