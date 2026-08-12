import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateToken, getTokenExpiry } from '@/lib/tokens';
import { getFileSizeBytes } from '@/lib/storage';
import { DownloadItem } from '@/lib/email';
import { Product } from '@/types/product';

type ProductRow = Pick<Product, 'id' | 'title' | 'format' | 'storage_paths' | 'bundle_product_ids' | 'bundle_file_exclusions'>;

export interface ResolvedProduct {
  product: ProductRow;
  allowedPaths: string[] | null; // null = no restriction, include every storage_path
}

/**
 * Given a list of purchased product IDs, resolve the full list of products
 * whose files need tokens — expanding bundle products into their included products.
 * A product included only through a bundle may have some of its files withheld per
 * that bundle's `bundle_file_exclusions`; a directly-purchased product always gets
 * everything, and a product reachable through multiple bundles gets the union of what
 * each of them allows (never withheld unless every path granting it excludes the file).
 * Returns products deduplicated by ID.
 */
export async function resolveProductsForOrder(itemIds: string[]): Promise<ResolvedProduct[]> {
  const { data: purchased } = await supabaseAdmin
    .from('products')
    .select('id, title, format, storage_paths, bundle_product_ids, bundle_file_exclusions')
    .in('id', itemIds);

  const purchasedList = (purchased ?? []) as ProductRow[];
  const bundleContainers = purchasedList.filter(p => (p.bundle_product_ids ?? []).length > 0);
  const directlyPurchasedIds = new Set(
    purchasedList.filter(p => (p.bundle_product_ids ?? []).length === 0).map(p => p.id),
  );

  // Collect IDs of products included in any bundles
  const bundledIds = purchasedList.flatMap(p => p.bundle_product_ids ?? []);
  const newIds = Array.from(new Set(bundledIds)).filter(id => !itemIds.includes(id));

  let bundledProducts: ProductRow[] = [];
  if (newIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, title, format, storage_paths, bundle_product_ids, bundle_file_exclusions')
      .in('id', newIds);
    bundledProducts = (data ?? []) as ProductRow[];
  }

  // Merge: purchased first, then bundled — deduplicate by ID. Bundle containers are
  // normally skipped (their included products carry the actual files), but a bundle can
  // also have its own directly-attached files (e.g. a combined summary PDF) — keep those.
  const all = [...purchasedList, ...bundledProducts];
  const seen = new Set<string>();
  const resolvedProducts = all.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return (p.bundle_product_ids ?? []).length === 0 || p.storage_paths.length > 0;
  });

  return resolvedProducts.map((product): ResolvedProduct => {
    if (directlyPurchasedIds.has(product.id)) {
      return { product, allowedPaths: null };
    }

    const containingBundles = bundleContainers.filter(b => (b.bundle_product_ids ?? []).includes(product.id));
    if (containingBundles.length === 0) {
      // Shouldn't happen, but never accidentally withhold a paid-for file.
      return { product, allowedPaths: null };
    }

    const allowed = new Set<string>();
    for (const bundle of containingBundles) {
      const excluded = new Set(bundle.bundle_file_exclusions?.[product.id] ?? []);
      for (const path of product.storage_paths) {
        if (!excluded.has(path)) allowed.add(path);
      }
    }
    return { product, allowedPaths: Array.from(allowed) };
  });
}

/**
 * Create download tokens for all files of the given products under an order.
 * Skips file paths that already have a token for this order (idempotent).
 * Returns DownloadItem list for the email.
 */
export async function createTokensForProducts(
  orderId: string,
  resolvedProducts: ResolvedProduct[],
  siteUrl: string,
): Promise<DownloadItem[]> {
  // Load existing tokens for this order to avoid duplicates
  const { data: existing } = await supabaseAdmin
    .from('download_tokens')
    .select('file_path')
    .eq('order_id', orderId);
  const existingPaths = new Set((existing ?? []).map(t => t.file_path));

  const downloadItems: DownloadItem[] = [];

  for (const { product, allowedPaths } of resolvedProducts) {
    // Cloud-only products have no storage_paths — no tokens needed
    if (product.storage_paths.length === 0) continue;

    const filePaths = allowedPaths ?? product.storage_paths;

    for (const filePath of filePaths) {
      if (existingPaths.has(filePath)) continue; // already has token

      const token = generateToken();
      const expiresAt = getTokenExpiry();

      const { error } = await supabaseAdmin.from('download_tokens').insert({
        token,
        order_id: orderId,
        product_id: product.id,
        file_path: filePath,
        expires_at: expiresAt.toISOString(),
        downloads_count: 0,
        max_downloads: 5,
      });
      if (error) console.error('download_tokens insert error:', error);

      const fileName = filePath.split('/').pop() || filePath;
      const fileSizeBytes = (await getFileSizeBytes(filePath)) ?? undefined;
      downloadItems.push({
        title: product.title,
        format: product.format,
        fileName,
        downloadUrl: `${siteUrl}/api/download/${token}`,
        fileSizeBytes,
        productId: product.id,
      });
    }
  }

  return downloadItems;
}
