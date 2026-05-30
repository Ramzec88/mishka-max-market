export interface CartItemForDiscount {
  id: string;
  price: number;    // rubles (not kopecks)
  category: string; // 'scenarios' gets k=1.55, everything else k=1.40
}

export interface DiscountInfo {
  cartTotal: number;      // rubles
  tier1: number;          // rubles
  tier2: number;          // rubles
  status: 'none' | 'mid' | 'max';
  discountRate: number;   // 0, 0.15, or 0.25
  discountAmount: number; // rubles
  finalTotal: number;     // rubles
  progress: number;       // 0–100, fill width as % of tier2
  remaining: number;      // rubles to next tier
  nextLabel: string;      // '−15%' | '−25%' | ''
}

// Products below this price are "micro" add-ons — they contribute to cartTotal
// but must never be the anchor that sets the discount threshold.
// If the cart contains only micro-products, no discount tier is offered.
export const MICRO_MAX_PRICE_RUB = 80;

/**
 * @param items       All items (main + bumps) — determines cartTotal and status
 * @param anchorItems Main cart items only — determines tier1 threshold.
 *                    Defaults to `items` when omitted.
 *                    Pass an empty array to signal "no anchor available" → returns null.
 *
 * Anchor is fixed to main cart items so that adding an expensive bump/
 * recommendation never raises the discount threshold mid-session.
 * Micro-products (price < MICRO_MAX_PRICE_RUB) are excluded from anchor
 * so a cart of only cheap add-ons never triggers the discount mechanic.
 */
export function calcDiscount(
  items: CartItemForDiscount[],
  anchorItems?: CartItemForDiscount[],
): DiscountInfo | null {
  if (items.length === 0) return null;

  // Explicit empty anchorItems means no qualifying main product in cart
  if (anchorItems !== undefined && anchorItems.length === 0) return null;

  const cartTotal = items.reduce((s, i) => s + i.price, 0);

  const forAnchor = anchorItems && anchorItems.length > 0 ? anchorItems : items;
  const anchor = [...forAnchor].sort((a, b) => b.price - a.price)[0];
  const k = anchor.category === 'scenarios' ? 1.55 : 1.40;
  const tier1 = Math.round(anchor.price * k);
  const tier2 = 1000;

  let discountRate = 0;
  let status: 'none' | 'mid' | 'max' = 'none';

  if (cartTotal >= tier2) {
    discountRate = 0.25;
    status = 'max';
  } else if (cartTotal >= tier1) {
    discountRate = 0.15;
    status = 'mid';
  }

  const discountAmount = Math.round(cartTotal * discountRate);
  const finalTotal = cartTotal - discountAmount;

  const progress = Math.min(100, Math.max(0, (cartTotal / tier2) * 100));

  let remaining = 0;
  let nextLabel = '';

  if (status === 'none') {
    remaining = tier1 - cartTotal;
    nextLabel = '−15%';
  } else if (status === 'mid') {
    remaining = tier2 - cartTotal;
    nextLabel = '−25%';
  }

  return { cartTotal, tier1, tier2, status, discountRate, discountAmount, finalTotal, progress, remaining, nextLabel };
}
