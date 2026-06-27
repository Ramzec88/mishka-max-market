import { Product, Category } from '@/types/product';

const CATEGORY_AFFINITY: Record<Category, Category[]> = {
  songs: ['scenarios', 'materials'],
  scenarios: ['songs', 'materials'],
  materials: ['songs', 'scenarios'],
  bundles: [],
};

export function getRecommendations(
  purchasedIds: string[],
  allProducts: Product[],
  limit = 2,
): Product[] {
  const purchasedSet = new Set(purchasedIds);
  const activeUnpurchased = allProducts.filter(
    (p) => p.is_active && !purchasedSet.has(p.id),
  );

  const purchasedProducts = allProducts.filter((p) => purchasedSet.has(p.id));
  const hasBundlePurchased = purchasedProducts.some((p) => p.is_bundle);

  if (hasBundlePurchased) return [];

  // Level 1: manual recommendations from purchased products
  const manualIds: string[] = [];
  for (const p of purchasedProducts) {
    for (const rid of p.recommended_product_ids ?? []) {
      if (!purchasedSet.has(rid) && !manualIds.includes(rid)) {
        manualIds.push(rid);
      }
    }
  }

  if (manualIds.length > 0) {
    const byId = new Map(activeUnpurchased.map((p) => [p.id, p]));
    const manual = manualIds.map((id) => byId.get(id)).filter(Boolean) as Product[];
    return manual.slice(0, limit);
  }

  // Level 2: category-based fallback
  const result: Product[] = [];

  // Bundle upsell first when 2+ individual items bought
  if (purchasedIds.length >= 2) {
    const bundle = activeUnpurchased.find((p) => p.is_bundle);
    if (bundle) result.push(bundle);
    if (result.length >= limit) return result;
  }

  const purchasedCategories = purchasedProducts.map((p) => p.category);
  const wantCategoriesSet = new Set<Category>();
  purchasedCategories.forEach((cat) => {
    (CATEGORY_AFFINITY[cat] ?? []).forEach((rel) => wantCategoriesSet.add(rel));
  });
  const wantCategories = Array.from(wantCategoriesSet);

  wantCategories.forEach((cat) => {
    if (result.length >= limit) return;
    const candidate = activeUnpurchased.find(
      (p) => p.category === cat && !result.includes(p),
    );
    if (candidate) result.push(candidate);
  });

  return result;
}
