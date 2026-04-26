const CART_KEY = 'mishkaCart';

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
}
