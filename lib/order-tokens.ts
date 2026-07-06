import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateToken, getTokenExpiry } from '@/lib/tokens';
import { getFileSizeBytes } from '@/lib/storage';
import { DownloadItem } from '@/lib/email';
import { Product } from '@/types/product';

type ProductRow = Pick<Product, 'id' | 'title' | 'format' | 'storage_paths' | 'bundle_product_ids'>;

/**
 * Given a list of purchased product IDs, resolve the full list of products
 * whose files need tokens — expanding bundle products into their included products.
 * Returns products deduplicated by ID.
 */
export async function resolveProductsForOrder(itemIds: string[]): Promise<ProductRow[]> {
  const { data: purchased } = await supabaseAdmin
    .from('products')
    .select('id, title, format, storage_paths, bundle_product_ids')
    .in('id', itemIds);

  const purchasedList = (purchased ?? []) as ProductRow[];

  // Collect IDs of products included in any bundles
  const bundledIds = purchasedList.flatMap(p => p.bundle_product_ids ?? []);
  const newIds = bundledIds.filter(id => !itemIds.includes(id));

  let bundledProducts: ProductRow[] = [];
  if (newIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, title, format, storage_paths, bundle_product_ids')
      .in('id', newIds);
    bundledProducts = (data ?? []) as ProductRow[];
  }

  // Merge: purchased first, then bundled — deduplicate by ID
  // Bundle products themselves have no files; only their included products do
  const all = [...purchasedList, ...bundledProducts];
  const seen = new Set<string>();
  return all.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return (p.bundle_product_ids ?? []).length === 0; // skip bundle containers
  });
}

/**
 * Create download tokens for all files of the given products under an order.
 * Skips file paths that already have a token for this order (idempotent).
 * Returns DownloadItem list for the email.
 */
export async function createTokensForProducts(
  orderId: string,
  products: ProductRow[],
  siteUrl: string,
): Promise<DownloadItem[]> {
  // Load existing tokens for this order to avoid duplicates
  const { data: existing } = await supabaseAdmin
    .from('download_tokens')
    .select('file_path')
    .eq('order_id', orderId);
  const existingPaths = new Set((existing ?? []).map(t => t.file_path));

  const downloadItems: DownloadItem[] = [];

  for (const product of products) {
    // Cloud-only products have no storage_paths — no tokens needed
    if (product.storage_paths.length === 0) continue;

    const filePaths = product.storage_paths;

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
