import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AzbukaOrderRow {
  id: string;
  email: string;
  items: string[] | null;
  line_items: { product_id: string }[] | null;
  paid_at: string | null;
  created_at: string;
}

export interface AzbukaProductRow {
  id: string;
  title: string;
  is_bundle: boolean;
  bundle_product_ids: string[];
}

export interface AzbukaSeriesProduct extends AzbukaProductRow {
  num: number;
}

export interface AzbukaCustomerStatus {
  email: string;
  ownedCount: number; // consecutive series owned from part 1
  hasGap: boolean;
  completed: boolean; // owns all series, directly or via bundle
  lastOrderId: string; // most recent order that contained a series product — used to link a followup email record
  lastPaidAt: string;
}

export const SEGMENT_PREFIX = 'azbuka-stopped-';

export function segmentIdForStage(stage: number): string {
  return `${SEGMENT_PREFIX}${stage}`;
}

export function stageFromSegmentId(id: string): number | null {
  if (!id.startsWith(SEGMENT_PREFIX)) return null;
  const n = parseInt(id.slice(SEGMENT_PREFIX.length), 10);
  return Number.isFinite(n) ? n : null;
}

export function detectAzbukaSeries<T extends AzbukaProductRow>(products: T[]) {
  const seriesProducts: (T & { num: number })[] = products
    .filter((p) => p.id.startsWith('uchim-bukvy-s-mishkoy-maksom'))
    .map((p) => ({ ...p, num: parseInt((p.id.match(/\d+/) || ['0'])[0], 10) }))
    .sort((a, b) => a.num - b.num);
  const seriesIds = seriesProducts.map((p) => p.id);
  const seriesIdSet = new Set(seriesIds);
  const azbukaBundle = products.find(
    (p) => p.is_bundle && p.bundle_product_ids.some((id) => seriesIdSet.has(id)),
  ) ?? null;
  return { seriesProducts, seriesIds, seriesIdSet, azbukaBundle };
}

export function buildAzbukaStatuses(
  orders: AzbukaOrderRow[],
  products: AzbukaProductRow[],
  seriesIds: string[],
): AzbukaCustomerStatus[] {
  const seriesIdSet = new Set(seriesIds);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const byEmail = new Map<string, { owned: Set<string>; lastOrderId: string; lastPaidAt: string; lastCreatedAt: string }>();

  for (const o of orders) {
    const rawIds = o.line_items && o.line_items.length > 0
      ? o.line_items.map((li) => li.product_id)
      : (o.items || []);

    const ownedIdsHere = new Set<string>();
    for (const id of rawIds) {
      ownedIdsHere.add(id);
      const product = productMap.get(id);
      if (product) for (const childId of product.bundle_product_ids) ownedIdsHere.add(childId);
    }

    const seriesOwnedHere = Array.from(ownedIdsHere).filter((id) => seriesIdSet.has(id));
    if (seriesOwnedHere.length === 0) continue;

    const cur = byEmail.get(o.email) || {
      owned: new Set<string>(),
      lastOrderId: o.id,
      lastPaidAt: o.paid_at || o.created_at,
      lastCreatedAt: o.created_at,
    };
    for (const id of seriesOwnedHere) cur.owned.add(id);
    if (o.created_at > cur.lastCreatedAt) {
      cur.lastOrderId = o.id;
      cur.lastPaidAt = o.paid_at || o.created_at;
      cur.lastCreatedAt = o.created_at;
    }
    byEmail.set(o.email, cur);
  }

  const statuses: AzbukaCustomerStatus[] = [];
  for (const [email, v] of Array.from(byEmail.entries())) {
    let consecutive = 0;
    while (consecutive < seriesIds.length && v.owned.has(seriesIds[consecutive])) consecutive += 1;
    const totalOwned = seriesIds.filter((id) => v.owned.has(id)).length;
    statuses.push({
      email,
      ownedCount: consecutive,
      hasGap: totalOwned !== consecutive,
      completed: totalOwned === seriesIds.length,
      lastOrderId: v.lastOrderId,
      lastPaidAt: v.lastPaidAt,
    });
  }
  return statuses;
}

export async function fetchAzbukaData() {
  const [{ data: orders }, { data: products }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, email, items, line_items, paid_at, created_at')
      .eq('status', 'paid')
      .limit(3000),
    supabaseAdmin
      .from('products')
      .select('id, title, is_bundle, bundle_product_ids'),
  ]);
  return {
    orders: (orders || []) as AzbukaOrderRow[],
    products: (products || []) as AzbukaProductRow[],
  };
}

export interface AzbukaStoppedStage {
  stage: number;
  count: number;
  seriesTitle: string;
}

// Stages with at least one "stopped" customer — used to populate the Followup Wizard's segment list.
export async function listAzbukaStoppedStages(): Promise<{ stages: AzbukaStoppedStage[]; azbukaBundle: AzbukaProductRow | null }> {
  const { orders, products } = await fetchAzbukaData();
  const { seriesIds, seriesProducts, azbukaBundle } = detectAzbukaSeries(products);
  if (seriesIds.length === 0) return { stages: [], azbukaBundle: null };

  const statuses = buildAzbukaStatuses(orders, products, seriesIds);
  const stages = seriesProducts
    .map((p, i) => {
      const stage = i + 1;
      const count = statuses.filter((s) => !s.completed && !s.hasGap && s.ownedCount === stage).length;
      return { stage, count, seriesTitle: p.title };
    })
    .filter((s) => s.count > 0);

  return { stages, azbukaBundle };
}

export interface AzbukaSegmentRecipient {
  orderId: string;
  email: string;
  paidAt: string;
}

// The customers who bought parts 1..stage of the series consecutively, then stopped
// (no gap, haven't finished the series, haven't bought the bundle).
export async function getAzbukaStoppedRecipients(stage: number): Promise<{ recipients: AzbukaSegmentRecipient[]; ownedSeriesIds: string[] }> {
  const { orders, products } = await fetchAzbukaData();
  const { seriesIds } = detectAzbukaSeries(products);
  if (seriesIds.length === 0 || stage < 1 || stage > seriesIds.length) {
    return { recipients: [], ownedSeriesIds: [] };
  }

  const statuses = buildAzbukaStatuses(orders, products, seriesIds);
  const recipients = statuses
    .filter((s) => !s.completed && !s.hasGap && s.ownedCount === stage)
    .map((s) => ({ orderId: s.lastOrderId, email: s.email, paidAt: s.lastPaidAt }));

  return { recipients, ownedSeriesIds: seriesIds.slice(0, stage) };
}
