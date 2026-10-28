// The genesis event (PRD §5.3): 12 seats listed by team wallets and 8 settlements in the week before launch.
// Sample data: venues, routes, seat references, wallets and prices must be replaced by the real genesis run.
// Seat dates are fixed; history runs 20–27 Oct 2026. Open offers are placed relative to the first load so
// their 24-hour clocks are live.

export const WALLETS = {
  me: '0x5c1e8b27a04d93f6e1b2c7d84a60f3e9d21b7a4c',
  w1: '0x7a3fd0c41e9b28a5f6c3d17e0b94a2c8e5f1c219',
  w2: '0x2b9e64a1f07c35d8e2a49b0f1c6d73e85a2f4d06',
  w3: '0xe41c07b9a3d25f68c0e7b14a9d36f2c58e0b7a93',
  w5: '0x93d2a6f0e1c47b85d3a0f29e6b14c7d80a5e3f12',
  w6: '0x0f6a3c9e28b41d75a0c6e3f19b2d84a7c5e06b38',
  w7: '0xc8b51e2d94a06f37b1d8c4e0a29f65b3d7e1a804',
  w8: '0x4d07e9a3c1b25f86e4a0d37c9b16f2e8a5c03d71',
};

// Each seat: its listing metadata (kept off-chain, revealed by the holder) and its story as steps.
// list: a listing goes live. sell: the listing settles to a buyer at the ask. swap: two swap-only
// seats change hands in one settlement.
export const SEATS = [
  { id: 1, category: 'event', date: '2026-11-14T20:30', venue: 'Olympiastadion München', seatRef: 'Block 112 · Row F · Seat 9',
    photo: 'stadium-rows.jpg' },
  { id: 2, category: 'event', date: '2026-11-20T19:30', venue: 'Schnitzer Hall, Portland', seatRef: 'Orchestra L · Row K · Seat 14',
    photo: 'concert-hall.jpg' },
  { id: 3, category: 'flight', date: '2026-11-05T07:40', venue: 'IST → AMS · KT 1951', seatRef: 'Seat 14C', photo: 'cabin-seats.jpg' },
  { id: 4, category: 'train', date: '2026-11-08T08:15', venue: 'Shanghai → Hangzhou · G7311', seatRef: 'Coach 7 · Seat 12F',
    photo: 'train-second-class.jpg' },
  { id: 5, category: 'event', date: '2026-11-14T20:30', venue: 'Olympiastadion München', seatRef: 'Block 112 · Row F · Seat 10' },
  { id: 6, category: 'event', date: '2026-11-12T20:00', venue: 'Ziggo Dome, Amsterdam', seatRef: 'Ring 2 · Row 6 · Seat 31' },
  { id: 7, category: 'event', date: '2026-11-28T20:00', venue: 'Forest National, Brussels', seatRef: 'Balcony B · Row 3 · Seat 18' },
  { id: 8, category: 'flight', date: '2026-11-03T06:55', venue: 'LHR → LIS · KT 0412', seatRef: 'Seat 22A' },
  { id: 9, category: 'flight', date: '2026-11-19T13:20', venue: 'BER → IST · KT 1724', seatRef: 'Seat 7F' },
  { id: 10, category: 'flight', date: '2026-11-26T10:05', venue: 'AMS → BCN · KT 2210', seatRef: 'Seat 31D' },
  { id: 11, category: 'train', date: '2026-11-07T09:54', venue: 'Paris Est → Stuttgart · ICE 9574', seatRef: 'Coach 12 · Seat 45' },
  { id: 12, category: 'train', date: '2026-11-02T08:00', venue: 'Milano Centrale → Roma Termini', seatRef: 'Coach 5 · Seat 8A' },
];

// The week's settlements, in order. Times are local to the demo (Europe/Amsterdam).
export const STEPS = [
  { at: '2026-10-20T09:12', do: 'list', seat: 1, by: 'w1', price: 30 },
  { at: '2026-10-20T09:40', do: 'list', seat: 5, by: 'w1', price: 36 },
  { at: '2026-10-20T10:05', do: 'list', seat: 2, by: 'w5', swapOnly: true },
  { at: '2026-10-20T11:30', do: 'list', seat: 9, by: 'w6', swapOnly: true },
  { at: '2026-10-20T14:02', do: 'list', seat: 12, by: 'me', price: 9 },
  { at: '2026-10-21T08:44', do: 'sell', seat: 1, to: 'w2' },
  { at: '2026-10-21T12:15', do: 'list', seat: 6, by: 'w7', price: 48 },
  { at: '2026-10-22T09:10', do: 'list', seat: 3, by: 'w6', price: 40 },
  { at: '2026-10-22T10:02', do: 'sell', seat: 3, to: 'w7' },
  { at: '2026-10-22T16:30', do: 'list', seat: 1, by: 'w2', price: 34 },
  { at: '2026-10-23T11:21', do: 'sell', seat: 1, to: 'w3' },
  { at: '2026-10-23T18:05', do: 'list', seat: 11, by: 'w8', swapOnly: true },
  { at: '2026-10-24T09:48', do: 'swap', seat: 2, with: 9 },
  { at: '2026-10-24T13:00', do: 'list', seat: 1, by: 'w3', price: 32 },
  { at: '2026-10-25T19:37', do: 'sell', seat: 1, to: 'me' },
  { at: '2026-10-25T20:10', do: 'sell', seat: 6, to: 'w8' },
  { at: '2026-10-26T08:30', do: 'list', seat: 2, by: 'w6', swapOnly: true },
  { at: '2026-10-26T15:12', do: 'swap', seat: 2, with: 11 },
  { at: '2026-10-26T17:45', do: 'sell', seat: 12, to: 'w8' },
  { at: '2026-10-26T18:20', do: 'list', seat: 4, by: 'w5', price: 6 },
  { at: '2026-10-27T09:05', do: 'list', seat: 6, by: 'w8', price: 55 },
  { at: '2026-10-27T10:30', do: 'list', seat: 8, by: 'w2', price: 18 },
  { at: '2026-10-27T11:00', do: 'list', seat: 10, by: 'me', price: 22 },
  { at: '2026-10-27T12:40', do: 'list', seat: 7, by: 'w3', price: 24 },
  { at: '2026-10-27T15:15', do: 'list', seat: 12, by: 'w8', price: 11 },
  { at: '2026-10-27T17:50', do: 'list', seat: 1, by: 'me', price: 38 },
  { at: '2026-10-27T18:30', do: 'list', seat: 3, by: 'w7', price: 44 },
  { at: '2026-10-27T19:05', do: 'list', seat: 2, by: 'w8', swapOnly: true },
  { at: '2026-10-27T19:40', do: 'list', seat: 9, by: 'w5', swapOnly: true },
  { at: '2026-10-27T21:10', do: 'list', seat: 11, by: 'w6', swapOnly: true },
];

// Open offers, placed hoursAgo before the first load (the 24-hour TTL runs from there).
export const OFFERS = [
  { seat: 1, from: 'w8', price: 36, hoursAgo: 15 },
  { seat: 1, from: 'w2', price: 33, hoursAgo: 27 },      // already expired: accepting it reverts
  { seat: 10, from: 'w3', offeredSeat: 7, hoursAgo: 4 },
  { seat: 10, from: 'w6', price: 20, hoursAgo: 1.5 },
  { seat: 6, from: 'me', price: 50, hoursAgo: 6 },
  { seat: 4, from: 'me', price: 5, hoursAgo: 20 },
];

// Ratings given after the genesis swaps (stars 1–5, once per side). 'me' has not yet rated w3 for seat 1.
export const RATINGS = [
  { seat: 1, swapIndex: 0, by: 'w1', of: 'w2', stars: 5 }, { seat: 1, swapIndex: 0, by: 'w2', of: 'w1', stars: 5 },
  { seat: 1, swapIndex: 1, by: 'w2', of: 'w3', stars: 4 }, { seat: 1, swapIndex: 1, by: 'w3', of: 'w2', stars: 5 },
  { seat: 3, swapIndex: 0, by: 'w6', of: 'w7', stars: 5 }, { seat: 3, swapIndex: 0, by: 'w7', of: 'w6', stars: 5 },
  { seat: 6, swapIndex: 0, by: 'w8', of: 'w7', stars: 4 },
  { seat: 2, swapIndex: 0, by: 'w5', of: 'w6', stars: 5 },
  { seat: 12, swapIndex: 0, by: 'w8', of: 'me', stars: 5 },
  { seat: 1, swapIndex: 2, by: 'w3', of: 'me', stars: 5 },
];
