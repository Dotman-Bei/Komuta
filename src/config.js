// Chain settings. Nothing here is taken from memory: fill each value from BOT Chain's Builder Docs
// (botchain.ai → Builder Docs) and https://chainlist.org/chain/677 before the first deploy.
export const config = {
  mode: 'demo',             // 'demo' runs the in-browser ledger; 'chain' once the contract is deployed
  chainId: null,            // to verify against chainlist 677
  rpcUrl: null,             // to verify from Builder Docs; never hard-code from memory
  contractAddress: null,    // Komuta.sol, after deploy
  explorerTxUrl: null,      // e.g. 'https://<explorer>/tx/' — to verify
  symbol: 'BOT',            // native token symbol shown next to prices — to verify
  offerTtlHours: 24,        // OFFER_TTL in Komuta.sol
  maxPendingOffers: 64,     // per-seat cap, oldest evicted first
};

export const txHref = (hash, seatId) =>
  config.explorerTxUrl ? `${config.explorerTxUrl}${hash}` : `seat.html?id=${seatId}#tx-${hash.slice(2, 10)}`;
