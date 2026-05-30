const CART_KEY = 'mishkaCart';
const BUMPED_KEY = 'mishkaBumpedItems';

export function getCart(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCart(items: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(id: string): string[] {
  const cart = getCart();
  if (!cart.includes(id)) {
    const updated = [...cart, id];
    saveCart(updated);
    return updated;
  }
  return cart;
}

export function removeFromCart(id: string): string[] {
  const updated = getCart().filter((x) => x !== id);
  saveCart(updated);
  return updated;
}

export function clearCart(): void {
  saveCart([]);
  clearBumpedItems();
}

/** Remove IDs that don't match any known product and return the cleaned list. */
export function purgeStaleCart(validIds: string[]): string[] {
  const cart = getCart();
  const cleaned = cart.filter((id) => validIds.includes(id));
  if (cleaned.length !== cart.length) saveCart(cleaned);
  return cleaned;
}

// --- Bumped items: persisted in sessionStorage so they survive cart close/reopen ---

export function getBumpedItems(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(BUMPED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveBumpedItems(ids: string[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(BUMPED_KEY, JSON.stringify(ids));
}

export function clearBumpedItems(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(BUMPED_KEY);
}
