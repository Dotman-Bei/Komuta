# Komuta — Frontend spec

Source: `Komuta_PRD.md` v1.0 (2026-10-28). Art direction dealt by the design-taste-frontend skill:
landing page **sentence-as-layout** (seed 360314016), app screens **achromatic-ledger** (seed 888394773),
one palette and one typeface shared by both.

---

## 1. Who it is for, and what each page drives

Komuta is for people holding a seat they can't use, and for people who want that seat:

- **Holders**: a concert ticket for a night they're busy, a flight seat on a trip that moved, a train
  seat booked twice. They want the value back without a platform fee or an escrow hold.
- **Seekers**: fans and travellers looking for a seat below face value, or a straight swap
  (two train seats for one arena seat).
- **Evaluators**: BOT Chain reviewers, ecosystem judges and sceptics who want to check that what the UI
  shows matches the on-chain events.

They arrive on a phone as often as a laptop (it's a PWA), usually right before a date: a gig this week,
a train tomorrow. They need to act fast and see proof before paying.

| Page | Route | The one main action |
| --- | --- | --- |
| Landing | `/` | **Browse seats** |
| Browse | `/browse.html` | Open a seat that fits (then offer on it) |
| Seat detail | `/seat.html?id=N` | **Buy at ask** (or Make offer / Offer a swap) after reading the history |
| List a seat | `/list.html` | **List seat**: one transaction |
| Offers | `/offers.html` | **Accept** an offer: atomic settlement |
| Profile | `/profile.html` | **Rate** the counterparty of a finished swap |

## 2. Visual direction

### Thesis

*Every seat has a history.* The pitch is the layout: the landing page's first screen is that sentence,
split in two by a frame. Through the frame passes a reel of real seats (stadium, concert hall, cabin,
train) with their real swap counts. Behind the landing page, the app is a plain ledger: ink on white,
figures in columns. The only colour is one blue on the data that answers each screen's question and on
the one action. Komuta's name reads as *commute* and *commutative*: a swap works the same in both
directions, settled in one step.

**Idea sentence:** On this page, *a seat's chain of holders* becomes *the frame that splits the
headline*, and *the replay of that chain* becomes *the headline you can type into*.
Competitor test: a resale platform has seats but no public history of them; the sentence fails for them.

**The one live thing (landing):** "Check a seat". The visitor types a seat reference ("Block 112 row F",
"14C", "Coach 7") and the seat's full history replays underneath: every holder, price and date, rebuilt
from the ledger's events. It works with a thumb and degrades to a static history without script.

**App face:** a blue-grey ledger ground (`#f2f4f7`) under white panels, and the one hue on each
screen's main data element (price-per-swap bars on a seat, the current ask, the offer about to settle).
**App signature element:** the *holder chain*: a seat's owners drawn left to right as initials in
their own pale tints, joined by the price paid at each swap.

### Palette (Sheet and biro)

| Role | Value | Use |
| --- | --- | --- |
| `--bg` | `#ffffff` | Landing ground, app panels |
| `--surface` | `#f4f4f4` | Landing tone step, inputs, filled blocks |
| `--ink` | `#111111` | All running text, the near-black primary in the app |
| `--muted` | `#6b6b6b` | Secondary text only (4.5:1 on white and on the app ground) |
| `--accent` | `#1a4be0` | Landing: the one button and text links. App: the main data element, plus at most one control |
| `--accent-ink` | `#ffffff` | Text on accent |
| `--field-1` | `#111111` / ink `#ffffff` | Inverted footer field |
| App `--ground` | `#f2f4f7` | Blue-grey ledger ground behind panels |
| App `--border` | `#e5e7eb` | Panel edges; row rules `#f0f1f3`; control borders `#d1d5db` |
| App `--positive` | `#247b50` (pill `#dcfae5` / `#04250e`) | Settled, completed |
| App `--negative` | `#c4242a` (pill `#ffedea` / `#831c1e`) | Expired, reverted |
| App notice | `#fffbeb`, border `#fde68a`, text `#92400e` | The demo-ledger notice only |

Coloured pixels on app screens stay under 1–3%. No violet, no indigo, no cream with terracotta,
no gradients.

### Type (one family)

**General Sans** (Fontshare, weights 400 / 500 / 700). Tabular figures on every number in the app.

| Step | Size | Setting |
| --- | --- | --- |
| Display (landing hero, cta) | `clamp(40px, 9vw, 168px)` | 700, tracking −0.03em, leading 0.92 |
| Head (landing section heads) | `clamp(2rem, 1.3rem + 3.2vw, 4rem)` | 700, −0.02em, leading 0.95 |
| Lead | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` | 500, leading 1.3 |
| Body | `clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem)` | 400, leading 1.5 |
| Small | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)` | 400/500 |

App scale: 12 / 14 / 16 / 24, with 30px for the screen's one answer figure. Title 24/600, card titles
16/600, body 14, meta 12. 700 is used once per screen: on money.

### Spacing scale

4px base: `4, 8, 12, 16, 24, 32, 48, 64, 96, 160, 240`.
Landing: outer margins 32px desktop / 16px phone; 160px between sections on desktop (96px on phone).
App: one gutter of 16px both ways, card padding 20px, canvas padding 32px (16px on phone), rows 48px
(two-line rows 64px), controls 36px in forms / 32px in filters, radii 8 (cards) / 6 (controls) /
4 (chips), buttons square-cornered at 6px.

### Motion rules

- **Signature move (landing):** pinned story. The hero stage is sticky; the reel of seats advances one
  frame per screen of scroll (four frames) while both halves of the sentence hold still.
- **Entrances (landing only):** heading, then text, then picture, 70ms apart, rising 24px with opacity,
  600ms `cubic-bezier(.2,.7,.2,1)`, once per section. Content is visible without script.
- **One moving picture:** the train-window clip as a muted loop with a poster frame; a slow 1.00 → 1.06
  scale on the intro photograph tied to scroll.
- **Feedback everywhere:** buttons press to `scale(.97)` in 120ms; links and rows react on hover and
  focus in 160ms; visible 2px focus rings in the accent.
- **App screens:** no entrances. Motion is feedback only: a sheet opening, a new history row arriving
  after settlement (a 240ms rise), the confirm state of a transaction.
- Transform and opacity only. `prefers-reduced-motion` keeps all content, drops travel and the pin.

## 3. Pages and sections, in build order

Shared foundation built before page one: tokens, the font, the seat dataset and the chain adapter.

The ledger runs locally in the browser (a demo ledger seeded with the genesis event: 12 seats and
6 swaps). Its interface matches `Komuta.sol` (`listSeat`, `makeOffer`, `makeSwapOffer`, `acceptOffer`,
`cancelListing`, `retractOffer`, `rateCounterparty`, `getSeat`, `getHistory`, `getReputation`). The
real contract plugs in behind the same interface once its address and the RPC are verified from BOT
Chain's Builder Docs and chainlist 677. No RPC, chain ID, token symbol or explorer URL is hard-coded
from memory: they live in `src/config.js` and are marked *to verify*.

### 3.1 Landing — `/`

The argument, one claim per section:

1. Komuta is an open market for seats you can't use, and every seat carries its history. → the seats, in the frame
2. Today that seat is dead value. → the stadium, empty
3. A swap is one transaction with no escrow. → the stages, to true scale
4. You can check any seat before you pay. → the live lookup
5. It's built around the seat: three kinds, replayable history, reputation, tiny fees. → four rows with pictures
6. The hard questions have plain answers. → FAQ, all open
7. You can list yours now. → the sentence with a blank
8. Close. → black field with the way in

**Nav.** Komuta (mark + wordmark) · Browse · How it works · FAQ · [Browse seats]

**Hero: sentence split by a frame.**
- h1, two halves: **"Every seat"** | frame | **"has a history"**
- Frame reel (four frames, each a photo plus a `data-ui` listing chip):
  - Olympiastadion München · Block 112 · Row F · Seat 9 · Sat 14 Nov · 3 swaps · ask 38 BOT
  - Schnitzer Hall, Portland · Orchestra L · Row K · Seat 14 · Fri 20 Nov · 2 swaps · swap only
  - IST → AMS · Flight KT 1951 · Seat 14C · Thu 5 Nov · 1 swap · ask 40 BOT
  - Shanghai → Hangzhou · Coach 7 · Seat 12F · Sun 8 Nov · 0 swaps · ask 6 BOT
- Supporting sentence: "Komuta is an open market for concert, stadium, flight and train seats you
  can't use. List one, take offers, and swap it in a single transaction on BOT Chain."
- Action: **Browse seats**

**Intro: headline crossing onto a photograph.**
- h2: "A seat you can't use is dead value"
- Paragraph: "Airlines forfeit it. Railways forfeit it. Resale platforms take double-digit fees and hold
  your payout. Komuta gives the seat itself an open ledger."
- Pictures: the stadium rows (tall, right), the concert hall (small, bottom left).

**How it works: stages as one bar.**
- h2: "One transaction, no escrow"
- Segments, sized by their true durations:
  - **About two minutes** — "First, describe the seat: what it is, when, where, the seat reference,
    and a price or swap-only."
  - **Up to 24 hours** — "Then offers arrive. Each stays open for a day, and you can counter any of them."
  - **Under a second** — "Last, accept. Seat and payment change hands together, or neither does."
- Note under the bar: "The contract never holds your money between an offer and its acceptance."

**Showcase: the seat you can type.**
- h2: "Check a seat before you pay"
- Input (display size), prefilled: `Block 112 row F`
- Answer: seat title, current holder, swap count, and every event row (Listed, Swapped, holder → holder,
  price, date, tx hash).
- Examples: "14C" · "Coach 7" · "Orchestra row K"
- No match: "No seat matches that yet. Try a block, a row, a coach or a seat number."

**Features: rows with margin pictures.**
- h2: "Built around the seat"
- **Three kinds of seat** — "Events, flights and trains share one listing: a date, a venue or route,
  a seat reference, and a price or swap-only." — clip: train window, snow (muted loop)
- **History you can replay** — "Every listing, offer and swap is an event on BOT Chain. Rebuild any
  seat's chain of holders from the explorer and it matches the app, row for row." — concert hall
- **Reputation nobody can buy** — "After each swap both sides rate each other once, one to five stars.
  The score lives in the contract and can't be transferred." — cabin seats
- **Fees of a fraction of a cent** — "A seat can change hands a dozen times for less than one resale
  fee, so even a seat worth under a dollar is worth listing." — train second class

**FAQ: large questions, answers beside.** h2 "Plain answers"
- *Does Komuta get me through the door?* — No. Komuta trades the right to a seat; the venue, airline or
  railway decides entry. Check their transfer rules before you buy.
- *Who holds my money during a swap?* — Nobody. Payment and seat move in the same transaction, or
  neither moves. The contract never holds funds between an offer and its acceptance.
- *What happens to an offer nobody answers?* — It expires after 24 hours. Accepting it then fails, and
  nothing is lost because nothing was locked.
- *Can the same seat be listed twice?* — No. The contract allows one active listing per seat, and the
  app flags any listing with the same venue and seat reference.
- *What do I pay with?* — BOT Chain's native token. No cards, no fiat. Listing and settling each cost a
  fraction of a cent.
- *Is my travel plan public?* — Only the category, date, price and a hash of the venue or route go
  on-chain. The readable venue and seat stay in the listing's metadata, revealed by the holder.

**CTA: a sentence with a blank.**
- "I can't make it to [venue or route] — **List my seat**" (the input is the blank; the last words are
  the button, and the venue carries over to `/list.html`).
- Under it: "Next you add the date, seat and price. Listing is one transaction."

**Footer: black field.**
- Notes: "Komuta · a seat market on BOT Chain" · "RWA · Live on mainnet" · "Contract Komuta.sol"
- Display line: **Browse seats** as one full-width link.
- Meta row: links (Browse · List a seat · Offers · Profile), picture credits, "BOT Chain · 2026".

### 3.2 Browse — `/browse.html`

Question: *Which seat can I get, for when, at what price?*
- h1 "Seats", subline built from data: "12 listed · 4 this week · lowest ask 6 BOT".
- Count cards that filter: All 12 · Events 5 · Flights 4 · Trains 3 · Swap only 3.
- Filter row: This week (toggle) · venue or route search · price range (min–max).
- List of seat rows: category glyph, title (venue/route), seat ref, date, holder initials + reputation,
  swap count, ask (or "Swap only"), "Offer" text action. The lowest ask in view carries the accent.
- Empty filter: "No seats match these filters. Clear filters".
- Primary: **List a seat** in the title row.

### 3.3 Seat detail — `/seat.html?id=N`

Question: *Is this seat real, who held it, and what did they pay?*
- Object header: category glyph cover, seat title, meta line (date · venue · seat ref · seatId),
  copy-ID button; actions **Buy at 38 BOT** (near-black), Make offer, Offer a swap.
- Body grid (6 columns): the holder chain (6 cols), price per swap bars in the accent (4 cols)
  beside the seat facts (2 cols: holder, reputation, listed, offers open, venue hash), history table
  of every event with tx hash and explorer link (6 cols).
- Offer sheet: price input or "choose one of your seats" for a swap; shows the 24-hour expiry.
- Finding line under the title, e.g. "Changed hands 3 times; last swap 32 BOT on 21 Oct."

### 3.4 List a seat — `/list.html`

Question: *What exactly am I listing, and what will buyers see?*
- Settings-style two columns: label column (title + help) beside each panel.
- Sections: Category (Event / Flight / Train segmented), When (date), Where (venue or route),
  Seat (seat reference), Price (amount, or the swap-only toggle).
- Right of the form, sticky: the live listing preview as it will appear in Browse, plus "What goes
  on-chain": category, date, price, venue hash (shown), and what stays off-chain.
- Duplicate check: "A seat with this venue and reference is already listed (#0007)".
- Submit **List seat** → signing → "Listed as #0013" confirmation with link to the seat.

### 3.5 Offers — `/offers.html`

Question: *Which offer should I accept now?*
- h1 "Offers", tabs: Received (count) · Sent (count).
- Received rows grouped by seat: offerer + reputation, price or offered seat, time left of the 24 h,
  action **Accept** (the best open offer's Accept is the screen's one primary); expired → "Expired" pill,
  no action. Counteroffers: in v1 the buyer simply makes a new offer; a counteroffer UI is M2 in the PRD.
- Recently settled: the wallet's last three swaps with tx links, so an accepted swap is seen landing.
- Accept opens a confirm sheet: "You give Block 112 · Row F · Seat 9, you receive 36 BOT. One
  transaction." → settled state, the history row appears live.
- Sent rows: seat, your price, time left, Retract.

### 3.6 Profile — `/profile.html`

Question: *What do I hold, and how am I trusted?*
- h1 = short address + copy; reputation figure (completed swaps, average stars).
- Strip: Held · Listed · Completed swaps · Average rating.
- Seats held (rows), Seats listed (rows with Cancel), Swaps to rate (one-to-five stars, once per side),
  completed swap history with tx links.

### 3.7 Build notes (decisions made while building)

- Stack: Vite multi-page, plain HTML/CSS/ES modules, no framework. `npm run dev`, `npm run build`,
  `npm run preview`. PWA: `public/manifest.webmanifest`, `public/sw.js` (network-first, cached browsing).
- Ledger: `src/chain/ledger.js` is the demo stand-in for `Komuta.sol` (same calls, reverts, events);
  `src/data/genesis.js` is the sample genesis; `src/config.js` holds chain values still to verify.
- Hero type is 4.3vw (the blueprint's split-frame size), not the direction's 9–13vw: each half has to
  fit beside a 35vw frame. On phones the hero is not pinned and shows one frame between the halves.
- Features carry a 1953 SJ rail ticket in the left columns: a seat's paper past, a real archival picture.
- The lookup answer sits beside a picture of that seat's kind of place.
- Footer display line is **Browse seats**: the PRD gives no contact address to set there.
- Wallet menu can "act as" any genesis wallet, so one person can play both sides of a swap.

## 4. Components

| Component | Desktop | Phone (≤ 640px) |
| --- | --- | --- |
| Landing nav | Wordmark left, three links + accent button right, 15px | Wordmark + "Browse" button; links in a sheet |
| Hero frame reel | 35vw 16:9 frame centred between the two halves, sticky, 4 steps | Halves stack, frame full-width 4:3 between them, slivers of neighbours |
| Seat lookup | Display-size input, answer 560px wide, examples as text buttons | Input 11vw scrolls inside itself; examples as 44px blocks |
| Stage bar | Horizontal flex row, widths by duration | Vertical stack, heights by duration |
| App shell | 56px icon rail (mark, Browse, List, Offers with count, Profile; wallet at bottom) | 48px top bar (mark, title, wallet) + bottom bar with four labelled icons |
| Count cards | 5 across, 61px, selected = 1.5px accent border | Horizontal scroll of chips |
| Seat row | One line: glyph, title + seat, date, holder, swaps, ask, action | Two lines: title + ask; seat · date · holder on line 2 |
| Holder chain | Horizontal chain of initials with prices between | Scrolls sideways inside its own frame |
| Price bars | Charts.bars, accent on the latest swap | Full width, 160px tall |
| History table | Columns: event, from → to, price, date, tx | Two-line rows |
| Offer / confirm sheet | Right-side dialog 420px, shadow allowed (floats) | Bottom sheet, full width |
| Form fields | Label above, 40px input, 8px gap | Same, label column stacks above panel |
| Toast / tx state | Bottom-left floating, "Signing… / Settled in 0.4 s" | Bottom, above the tab bar |
| Stars | Five 28px buttons, keyboard-operable radio group | 44px targets |

## 5. Avoid

- Eyebrow labels and pill badges above headings; "New ·" chips.
- Centred hero over three lines, icon-topped feature cards, rows of identical cards (except the count
  filter, whose cards each do work).
- Gradients, glows, glass, blurred floating pill nav, shadows on resting cards.
- Monospace outside tx hashes and IDs; 01/02/03 numbering; "Step 2".
- Thin rules and hairline grids on the landing page; tiny uppercase tracked labels anywhere.
- A styled accent word in a headline; tricolon headlines; "reimagined", "seamless", "Web3-powered".
- Fake proof: no user counts, testimonials, partner logos or "trusted by". The genesis seats are
  labelled as sample data in the report.
- Dashboard tells: KPI tiles with icons in tinted circles, sparklines, green "+12%" on a new account,
  rainbow charts, a dark sidebar, zebra tables, uppercase table headers.
- Crypto clichés: neon on black, glowing nodes, 3D coins, a hex-grid background.
