/* Brand-accurate cryptocurrency logos as inline SVG.
   Each is a self-contained <svg> sized via the `size` arg (default 20).
   Used in the ticker, market watch, coin cards and deposit/withdraw lists. */

const wrap = (vb, inner, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="${vb}" fill="none" aria-hidden="true">${inner}</svg>`;

const C = {
  BTC: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M21.6 17.98c.32 1.58-.58 2.62-2.24 3.06l.5 2-1.9.47-.5-1.98c-.5.12-1 .24-1.5.34l.5 1.98-1.9.47-.5-2c-.4.1-.82.2-1.24.3l-2.46.6-.5-1.9s1.3-.3 1.28-.32c.5-.12.6-.44.54-.7L9.5 13.3c.06-.1.06-.26-.2-.32.02-.02-1.28.3-1.28.3l-.46-1.8 2.6-.64.42-1.84-.92.22-.24-1.9 1.9-.48.24.02.02.46c1.06.2 1.82.14 2.16-.66l.94.46-.42-1.66 1.9-.46.4 1.62c.4-.1.8-.18 1.18-.28l-.4-1.6 1.9-.46.46 1.84c1.7.34 2.9 1.06 3.34 2.5.36 1.16-.02 2.1-.86 2.7 1.2.06 2.04.46 2.36 1.86z" fill="#fff"/>
    <path d="M16.04 12.34l.6 2.4c.46-.12.92-.22 1.36-.34-.5-1.7-.92-2.06-1.96-2.06z" fill="#F7931A"/>`, s),
  ETH: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#627EEA"/>
    <path d="M16 5v7.64l6.46 2.88L16 5z" fill="#fff" fill-opacity=".6"/>
    <path d="M16 5L9.54 15.52 16 12.64V5z" fill="#fff"/>
    <path d="M16 20.98v5.02l6.46-8.96L16 20.98z" fill="#fff" fill-opacity=".6"/>
    <path d="M16 26v-5.02L9.54 17.04 16 26z" fill="#fff"/>
    <path d="M16 19.64L22.46 16 16 13.12v6.52z" fill="#fff" fill-opacity=".2"/>
    <path d="M9.54 16L16 19.64v-6.52L9.54 16z" fill="#fff" fill-opacity=".6"/>`, s),
  XRP: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#23292F"/>
    <path d="M22.84 8.5h2.66l-5.54 5.5c-1.96 1.95-5.14 1.95-7.1 0L7.32 8.5h2.66l4.2 4.18a3.12 3.12 0 004.4 0l4.26-4.18zM9.96 23.5H7.3l5.56-5.52a3.76 3.76 0 015.3 0l5.54 5.52h-2.66l-4.2-4.18a2.7 2.7 0 00-3.68 0l-4.2 4.18z" fill="#fff"/>`, s),
  ADA: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#0033AD"/>
    <g fill="#fff">
    <circle cx="16" cy="11" r="1.1"/><circle cx="16" cy="21" r="1.1"/>
    <circle cx="11" cy="13.5" r=".9"/><circle cx="21" cy="13.5" r=".9"/>
    <circle cx="11" cy="18.5" r=".9"/><circle cx="21" cy="18.5" r=".9"/>
    <circle cx="13.5" cy="8.5" r=".7"/><circle cx="18.5" cy="8.5" r=".7"/>
    <circle cx="13.5" cy="23.5" r=".7"/><circle cx="18.5" cy="23.5" r=".7"/>
    <circle cx="8.5" cy="16" r=".8"/><circle cx="23.5" cy="16" r=".8"/>
    <circle cx="16" cy="16" r="1.6"/>
    </g>`, s),
  SOL: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#000"/>
    <defs><linearGradient id="sol" x1="0" y1="0" x2="32" y2="32">
      <stop stop-color="#9945FF"/><stop offset=".5" stop-color="#19FB9B"/><stop offset="1" stop-color="#14F195"/>
    </linearGradient></defs>
    <path d="M9 20.4c.12-.12.3-.2.48-.2h13.4c.3 0 .45.36.24.57l-2.65 2.65a.68.68 0 01-.48.2H6.6c-.3 0-.45-.36-.24-.57L9 20.4z" fill="url(#sol)"/>
    <path d="M9 8.78c.12-.12.3-.2.48-.2h13.4c.3 0 .45.36.24.57l-2.65 2.65a.68.68 0 01-.48.2H6.6c-.3 0-.45-.36-.24-.57L9 8.78z" fill="url(#sol)"/>
    <path d="M20.5 14.56c.12-.12.3-.2.48-.2h13.4c.3 0 .45.36.24.57M19.5 14.78l-2.65 2.65a.68.68 0 01-.48.2H6.6c-.3 0-.45-.36-.24-.57l2.65-2.65c.12-.12.3-.2.48-.2h9.85c.3 0 .45.36.24.57l-2.65 2.65z" fill="url(#sol)"/>
    <path d="M23 14.6l-2.65 2.65a.68.68 0 01-.48.2H6.6c-.3 0-.45-.36-.24-.57L9 14.6c.12-.12.3-.2.48-.2h12.85c.3 0 .45.36.24.57z" fill="url(#sol)"/>`, s),
  DOGE: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#C2A633"/>
    <path d="M13.7 9.5h5.1c3.5 0 5.7 2.4 5.7 6.4 0 4.1-2.1 6.6-5.8 6.6h-5V9.5zm2.4 2.1v8.7h2.4c2.2 0 3.5-1.6 3.5-4.4 0-2.7-1.3-4.3-3.5-4.3h-2.4z" fill="#fff"/>`, s),
  TRX: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#FF060A"/>
    <path d="M22.2 10.8l-9.4-2.4a.6.6 0 00-.5.1L7.2 12c-.2.2-.2.5 0 .7l9.3 11c.2.3.6.3.8 0l6.7-12.4c.2-.3 0-.6-.4-.6-.1 0-.2 0-.3.1z" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M12.4 9.3l9.6 2.6-7.4 1.4-2.2-4zM11.7 11l2.8 5.1-5.6-2.1 2.8-3zM13.1 16.7l-1.6-3 5.9 2.2-6.7 4.4 2.4-3.6z" fill="#fff"/>`, s),
  LTC: (s) => wrap('0 0 32 32', `
    <circle cx="16" cy="16" r="16" fill="#345D9D"/>
    <path d="M13.2 18.4l-1.2 4.3h8.6l-.5 1.9H9.4l1.4-5-1.7.6.4-1.5 1.7-.6 2.2-7.9c.2-.7.6-1 1.4-1h2.2l-.5 1.9h-1.8l-.6 2.2 5.6-1.3-.6 2.2-6.4 1.5-.3 1z" fill="#fff"/>`, s),
};

const META = {
  BTC: { name: 'Bitcoin',   color: '#F7931A' },
  ETH: { name: 'Ethereum',  color: '#627EEA' },
  XRP: { name: 'Ripple',    color: '#23292F' },
  ADA: { name: 'Cardano',   color: '#0033AD' },
  SOL: { name: 'Solana',    color: '#9945FF' },
  DOGE: { name: 'Dogecoin', color: '#C2A633' },
  TRX: { name: 'Tron',      color: '#FF060A' },
  LTC: { name: 'Litecoin',  color: '#345D9D' },
};

/** Resolve a symbol like "BTCUSDT" / "BTC" / "btc" → ticker key. */
export const tickerKey = (sym) => String(sym || '').replace(/USDT$/i, '').toUpperCase();

/** Inline SVG logo for a coin symbol. Falls back to a coloured monogram badge. */
export function coinLogo(sym, size = 20) {
  const k = tickerKey(sym);
  if (C[k]) return C[k](size);
  const m = META[k] || { color: '#2F6BFF' };
  const ch = (k || '?')[0];
  return wrap('0 0 32 32', `<circle cx="16" cy="16" r="16" fill="${m.color}"/><text x="16" y="22" font-size="17" font-family="Inter,sans-serif" font-weight="700" fill="#fff" text-anchor="middle">${ch}</text>`, size);
}

export const coinMeta = META;
export const coins = C;
