# PRD — Komuta
**A peer-to-peer marketplace for swapping seats at events and while traveling, on BOT Chain**
Version 1.0 · 2026-10-28 · Status: approved for build
Ecosystem category: RWA (https://www.botchain.ai/en/project-party/)

---

## 1. Overview

**Komuta** is a peer-to-peer marketplace where a seat — at a concert, a stadium, on a flight or a train — becomes a tradable on-chain listing. Holders list seats they no longer want; seekers browse, offer, and swap. Every listing, offer, and completed swap is a permanent on-chain record, so a seat's swap history travels with it: who held it, what was paid, how many times it changed hands.

The blockchain part is load-bearing: seats are real-world access rights (the RWA), and the market for them is open, composable, and can't be deleted by any platform shutdown.

**One-sentence pitch:** *Every seat has a history — trade it on-chain, verify it in one click.*

**Directory listing copy (for botchain.ai/en/project-party/ Submit a Project):**
> **Komuta** — Komuta is a peer-to-peer marketplace for swapping seats at events and while traveling.
> Category: RWA · Status target: Live on Mainnet

---

## 2. Problem

A seat you can't use is dead value. Concert tickets get resold through gatekept platforms with double-digit fees; flight and train seats are simply forfeited because airlines and railroads offer no legal secondary market. Existing resale platforms hold your payout in escrow, ban accounts at will, and wipe your trading history. Meanwhile the seat itself — the right to occupy a specific place at a specific time — is a real-world asset with a natural market that has no open ledger. Komuta gives that right a public market: list it, swap it, and let its full history be verifiable by anyone.

## 3. Goals & Non-Goals

**Goals (v1)**
- Users list a seat in one transaction: category (event / flight / train), date, venue/route, section/seat reference, asking price in native token, optional "swap-only" flag.
- Peer-to-peer offers and counteroffers, settled atomically: one tx moves seat listing ownership and payment simultaneously (no escrow period).
- Every seat carries a permanent on-chain history: minted listing → offers → completed swaps.
- Reputation computed in-contract: completed-swap counts per address, visible on profiles.
- Browse/search by category, date, and venue; mobile-friendly PWA.

**Non-goals (v1)**
- No fiat on-ramps, no card payments — native token only, per seat. Fees are fractions of a cent, so a sub-$1 micro-market stays viable.
- No escrow: settlement is atomic swap-in-one-tx; the contract never holds value between offer and acceptance.
- No NFT standard in v1: listings are protocol-native structs keyed by `seatId`, not ERC-721. (NFT export considered at M3.)
- No entry verification: Komuta trades the *right*; venue entry is enforced by the venue, not the contract. Disputes are handled socially via ratings, not cryptographically.
- No auctions: fixed price or swap-only in v1; Dutch/English auctions are M2+.
- No airline/rail API integrations: v1 is self-described listings, like early eBay was self-described goods.

## 4. Users & User Stories

| Actor | Story |
|---|---|
| Seller | "I listed my flight seat for 40 and it swapped in an hour — the record shows the full chain of ownership." |
| Buyer | "I bought a concert seat below face value and verified its entire swap history on the explorer before paying." |
| Swapper | "I offered my two train seats for one arena seat; the counteroffer settled in a single tx." |
| Skeptic / evaluator | "I clicked a seat's history and replayed every transfer from events — it matches the UI exactly." |
| Community / venue | "We ran a fan-zone seat pool for our event week; all swaps were visible live on-chain." |

## 5. Product Requirements

### 5.1 Smart contract — `Komuta.sol` (Solidity, one contract, ~300 lines)
- `listSeat(category, eventDate, venueHash, seatRef, price, swapOnly)` → mints `seatId`, stores listing, emits `SeatListed(seller, seatId, category, eventDate, price, swapOnly)`. `venueHash` = hash of venue/route string (kept off-chain in UI metadata; on-chain hash anchors it without gas-heavy strings).
- `makeOffer(seatId, price)` / `makeSwapOffer(seatId, offeredSeatId)` → offers stored per seat; emits `OfferMade`. Offers expire after `OFFER_TTL` (e.g., 24h), checked at accept time.
- `acceptOffer(seatId, offerId)` → atomic settlement in one tx: payment transferred seller→buyer direction, seat ownership re-assigned, offer cleared, emits `Komutaped(seatId, from, to, price, timestamp)`. If swap-only, both listings change hands symmetrically. No two-step escrow anywhere.
- `cancelListing(seatId)` / `retractOffer(seatId, offerId)` → seller/offerer only; emits respective events.
- `rateCounterparty(seatId, stars)` → once per completed swap side, 1–5; updates `reputation[addr]` (count + cumulative stars, O(1)); emits `Rated`.
- `getSeat(seatId)` → listing, current holder, swap history count.
- `getHistory(seatId)` → replayable from events (`SeatListed`, `Komutaped`); contract stores only counters on-chain.
- `getReputation(user)` → completed swaps, average rating (×100 integer math).
- Guards: `require(price > 0)` unless swap-only; one active listing per `seatId` (a seat can't be double-listed); offers on delisted seats revert; no unbounded loops — per-seat offer lists capped (e.g., 64 pending offers, oldest evicted FIFO); reentrancy-safe (CEI + nonReentrant on settle).
- Access control: none beyond msg.sender — one wallet = one identity. Only the current holder can accept offers or cancel.

### 5.2 Frontend (PWA, wallet-connected)
- **List tab:** category picker, date, venue/route, seat ref, price or swap-only toggle → one-tx submit → confirm animation.
- **Browse:** cards by category with date/venue/price; filters (this week, near me by venue text, price range); seat detail page shows full on-chain history with explorer perma-links per tx.
- **Offer flow:** make offer / counteroffer → accept → sub-second confirm → both parties see the seat change hands live.
- **Profile:** seats held, seats listed, completed swaps, reputation score, perma-links.
- **PWA basics:** add-to-homescreen, cached browsing offline, live submit (no queue needed at sub-second finality).

### 5.3 Demo & launch assets
- Genesis event at deploy: team lists 10+ real seats (match/festival/travel) with team wallets completing 5+ swaps on day one so history graphs look alive.
- README: pitch, architecture, contract addresses, run instructions.
- 2–4 min demo video: list a seat → receive an offer → accept → show ownership change on explorer → show full seat history replayed from events.

## 6. Technical Architecture

```
User (PWA + wallet)                    BOT Chain
┌──────────────────────────┐ listSeat   ┌──────────────────────────┐
│ seat details → sign      │ ─────────► │ Komuta                 │
│ → broadcast              │            │  listings (seatId)       │
│                          │ offer/     │  offers, settlement      │
│ browse via events +      │ accept     │  reputation counters     │
│ view calls ◄──────────── │ ─────────► │                          │
└──────────────────────────┘            └──────────┬───────────────┘
        ▲                                          │ events (index)
        └──────────────── PWA frontend ◄───────────┘
```

- Chain economics exploited deliberately: listing a seat and settling a swap each cost fractions of a cent — a seat can change hands a dozen times for less than one traditional resale platform's fee on a single sale.
- All aggregates (reputation, history counts) maintained incrementally in-contract; reads are O(1); browsing replays events.

## 7. Key Flows

1. **First list** → connect wallet → fill seat details → one tx → `seatId` minted, listing live.
2. **Buy** → browse → make offer or buy at ask → `acceptOffer` settles atomically → seat history appends.
3. **Swap** → list swap-only seat → receive swap offer → accept → both listings change hands in one tx.
4. **Verify** → any seat links to its explorer history; every past holder and price replayable from events.

Edge cases: expired offers revert at accept; double-listing same seat reverts; rating before settlement reverts; rating twice per side reverts; delisted seat with pending offers → offers voided (revert on accept, no fund lock since none held); zero-price non-swap listing reverts.

## 8. Success Metrics

| Metric | v1 target |
|---|---|
| Contract deployed & verified on mainnet | Day 1 |
| Seats listed in month one | ≥ 200 |
| Unique swapping wallets month one | ≥ 60 |
| Completed swaps month one | ≥ 100 |
| Week-4 retention of month-one users | ≥ 25% |
| Demo video + submission complete | Week 1–2 |
| Ecosystem directory listing live (botchain.ai/en/project-party/, RWA) | On acceptance |

## 9. Roadmap (mapped to BOT Labs phased funding)

- **M1 — Deployed MVP:** contract + PWA live, list/offer/atomic-swap working, genesis event run to completion, demo video done. *(unlocks: capital + tooling support)*
- **M2 — Market depth:** counteroffer UI, Dutch auctions, venue/fan-group seat pools, share cards (image of your seat's on-chain history), feedback contributions to BOT Chain ecosystem docs. *(unlocks: traffic via official wallet / DApp portal, gas rebates)*
- **M3 — Depth:** ERC-721 export of seat listings (composability with wallets/marketplaces), entry-verification partnerships (signed QR from venues anchored by hash), API/subgraph for ticket platforms, localized UI. *(unlocks: listing green channel, ecosystem certification)*

## 10. Scope Guardrails

- **No escrow, ever.** Settlement is atomic; the contract never holds funds between parties. If a flow can't be done atomically, it's out of scope.
- **No move-to-earn or listing token.** Reputation is a non-transferable score.
- **No entry guarantees.** The contract trades access rights; venues enforce entry. Product copy states this plainly.
- **No reserve/auction complexity in v1.** Fixed price and swap-only; auctions only after M1 proves settlement volume.

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Chain config drift (RPC, chain ID) | Fetch from official docs (botchain.ai → Builder Docs) and https://chainlist.org/chain/677 at build time; CI re-check against chainlist |
| Fraudulent listings (seat doesn't exist) | Reputation system + visible history; venue-hash anchoring; v1 frames Komuta as open market, not arbiter — same trust model as early eBay |
| Duplicate-seat double listing | Blocked in-contract: one active `seatId` per listing; UI flags same venue+seatRef matches |
| Regulatory perception (ticket resale laws) | v1 is P2P access-right swapping with no fiat rails; legal review before M2 auctions; geo-fencing possible at frontend level if required |
| Privacy (travel itineraries are sensitive) | Only `venueHash` and category on-chain; human-readable metadata kept in IPFS/frontend, revealed by holder |
| Scope creep into full ticketing platform | §10 guardrails enforced in review |

## 12. Dependencies

- BOT Chain mainnet access: RPC, explorer, faucet from official docs (botchain.ai → Builder Docs) — verify before first deploy; never hardcode RPC from memory.
- Standard EVM tooling (Foundry or Hardhat), a wallet, static/PWA frontend hosting, IPFS pinning for listing metadata.
- Ecosystem submission: "Submit a Project" flow at botchain.ai/en/project-party/ for **RWA** category listing (directory copy drafted in §1).
