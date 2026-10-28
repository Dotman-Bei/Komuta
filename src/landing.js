import { getSeat, getSeats, getHistory } from './chain/ledger.js';
import { esc, day, isoDay, price, priceHtml, shortAddr, shortHash, seatNo, avatar, CATEGORY } from './lib/format.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- hero reel: four real seats from the ledger, one per held screen ----------
const REEL = [
  { id: 1, alt: 'Rows of green seats in the Olympiastadion, Munich' },
  { id: 2, alt: 'Empty stalls under the lit ceiling of the Schnitzer Concert Hall, Portland' },
  { id: 3, alt: 'Rows of seats in an aircraft cabin' },
  { id: 4, alt: 'Blue seats along the aisle of a high-speed train carriage' },
];
const reel = document.getElementById('reel');
const swapsLabel = (n) => (n === 1 ? '1 swap' : `${n} swaps`);

function chipFor(seat) {
  const ask = seat.listed ? (seat.swapOnly ? 'swap only' : `ask ${price(seat.price)}`) : 'held';
  return `<b>${esc(seat.venue)}</b><span>${esc(seat.seatRef)} · ${day(seat.date)} · ${swapsLabel(seat.swaps)} · ${ask}</span>`;
}

reel.innerHTML = REEL.map(({ id, alt }, i) => {
  const seat = getSeat(id);
  return `<li class="reel__frame">
    <img src="/img/${seat.photo}" alt="${esc(alt)}" width="1920" height="1280" ${i ? 'loading="lazy"' : ''}>
    <a class="reel__chip" data-ui href="/seat.html?id=${id}">${chipFor(seat)}</a>
  </li>`;
}).join('');

const hero = document.querySelector('.hero');
function placeReel() {
  if (reduced.matches) { reel.style.transform = ''; return; }
  const frame = reel.firstElementChild;
  const h = frame.offsetHeight;
  const gap = parseFloat(getComputedStyle(reel).rowGap) || 24;
  const travel = hero.offsetHeight - innerHeight;
  const p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / Math.max(1, travel)));
  // ease each step so a frame rests in the middle of its held screen
  const steps = REEL.length - 1;
  const raw = p * steps;
  const base = Math.floor(raw), t = raw - base;
  const eased = base + (t < 0.25 ? 0 : t > 0.75 ? 1 : (t - 0.25) * 2);
  const index = Math.min(steps, eased);
  if (innerWidth <= 760) { reel.style.transform = ''; return; }
  const anchor = innerHeight / 2 - h / 2;
  reel.style.transform = `translate3d(0, ${anchor - index * (h + gap)}px, 0)`;
}

// ---------- the live lookup: type a seat, read its history ----------
const input = document.getElementById('seat-query');
const answer = document.getElementById('seat-answer');
const norm = (s) => s.toLowerCase().replace(/[·,→-]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);

function match(query) {
  const q = words(query).filter((w) => !['seat', 'the', 'at'].includes(w));
  if (!q.length) return null;
  let best = null, bestScore = 0;
  for (const seat of getSeats()) {
    const hay = words(`${seat.venue} ${seat.seatRef} ${CATEGORY[seat.category]} ${seatNo(seat.id)}`);
    let score = 0;
    for (const w of q) {
      if (hay.includes(w)) score += /\d/.test(w) ? 3 : 2;
      else if (hay.some((h) => h.startsWith(w) && w.length > 1)) score += 1;
    }
    // more swaps breaks ties, so the seat with the richest story answers first
    score += seat.swaps * 0.01;
    if (score > bestScore) { best = seat; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}

const picture = document.getElementById('seat-picture');
// the seat's own kind of place: its photograph when it has one, otherwise one of its category
const PHOTOS = {
  1: { src: '/img/stadium-rows.jpg', alt: 'Rows of green seats in the Olympiastadion, Munich' },
  2: { src: '/img/concert-hall.jpg', alt: 'Stalls and balconies of the Schnitzer Concert Hall, Portland' },
  3: { src: '/img/cabin-seats.jpg', alt: 'Rows of seats in an aircraft cabin' },
  4: { src: '/img/train-second-class.jpg', alt: 'Blue seats along the aisle of a high-speed train carriage' },
  event: { src: '/img/stadium-rows.jpg', alt: 'Rows of stadium seats' },
  flight: { src: '/img/cabin-seats.jpg', alt: 'Rows of seats in an aircraft cabin' },
  train: { src: '/img/train-second-class.jpg', alt: 'Seats along the aisle of a train carriage' },
};

function render() {
  const seat = match(input.value);
  if (!seat) {
    answer.innerHTML = `<div class="answer"><p>No seat matches that yet. Try a block, a row, a coach or a seat number.</p></div>`;
    return;
  }
  const events = getHistory(seat.id).filter((e) => e.type === 'SeatListed' || e.type === 'Komutaped');
  // the chain of holders: the first listing, then every settlement
  const first = events.find((e) => e.type === 'SeatListed');
  const rows = [first, ...events.filter((e) => e.type === 'Komutaped')].map((e) => {
    if (e.type === 'SeatListed') {
      return `<li class="answer__row"><time datetime="${new Date(e.ts).toISOString()}">${isoDay(e.ts)}</time>
        <span>Listed by ${avatar(e.from)}<span class="who">${shortAddr(e.from)}</span></span>
        <span class="px">${e.swapOnly ? 'Swap only' : priceHtml(e.price)}</span></li>`;
    }
    const what = e.withSeat ? `for ${esc(getSeat(e.withSeat).seatRef)}` : priceHtml(e.price);
    return `<li class="answer__row"><time datetime="${new Date(e.ts).toISOString()}">${isoDay(e.ts)}</time>
      <span>${avatar(e.to)}<span class="who">${shortAddr(e.to)}</span> took it from <span class="who">${shortAddr(e.from)}</span></span>
      <span class="px">${what}</span></li>`;
  }).join('');
  const photo = PHOTOS[seat.photo ? seat.id : seat.category] ?? PHOTOS.event;
  if (!picture.src.endsWith(photo.src)) { picture.src = photo.src; picture.alt = photo.alt; }
  const last = events.at(-1);
  const ask = seat.listed ? (seat.swapOnly ? 'Swap only' : `${priceHtml(seat.price)}`) : 'Not listed';
  answer.innerHTML = `<div class="answer">
    <div class="answer__head"><span class="answer__title">${esc(seat.venue)}</span><span class="answer__ask">${ask}</span></div>
    <p class="answer__meta">${esc(seat.seatRef)} · ${day(seat.date)} · ${CATEGORY[seat.category]} · ${swapsLabel(seat.swaps)}</p>
    <ol class="answer__rows">${rows}</ol>
    <div class="answer__foot"><span>Last event ${shortHash(last.tx)}</span><a href="/seat.html?id=${seat.id}">Open seat ${seatNo(seat.id)}</a></div>
  </div>`;
}

input.addEventListener('input', render);
input.form.addEventListener('submit', (e) => { e.preventDefault(); const s = match(input.value); if (s) location.href = `/seat.html?id=${s.id}`; });
document.querySelectorAll('.check__examples [data-q]').forEach((b) => b.addEventListener('click', () => {
  input.value = b.dataset.q;
  render();
  input.focus({ preventScroll: true });
}));
render();

// ---------- entrances, drift and the clip ----------
document.querySelectorAll('section').forEach((section) => {
  section.querySelectorAll('[data-reveal]').forEach((el, i) => el.style.setProperty('--i', i));
});
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
addEventListener('load', () => setTimeout(() => document.querySelectorAll('[data-reveal]').forEach((el) => {
  const r = el.getBoundingClientRect();
  if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
}), 2500));

const drift = document.querySelector('[data-drift]');
function placeDrift() {
  if (!drift || reduced.matches) return;
  const r = drift.parentElement.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, 1 - (r.top + r.height) / (innerHeight + r.height)));
  drift.style.transform = `scale(${1 + p * 0.06})`;
}

const video = document.querySelector('.feature video');
if (video) {
  if (reduced.matches) video.removeAttribute('autoplay'), video.pause();
  new IntersectionObserver(([e]) => { if (reduced.matches) return; e.isIntersecting ? video.play().catch(() => {}) : video.pause(); }).observe(video);
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { placeReel(); placeDrift(); ticking = false; });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
document.fonts?.ready.then(onScroll);
onScroll();

if ('serviceWorker' in navigator && location.protocol !== 'file:' && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
