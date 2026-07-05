export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Product } from '@/types/product';
import { listAzbukaStoppedStages, segmentIdForStage } from '@/lib/azbuka-funnel';
import FollowupWizard, { type Segment } from './FollowupWizard';

async function getProducts(): Promise<Pick<Product, 'id' | 'title' | 'cover_emoji' | 'letter_s3_key'>[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, title, cover_emoji, letter_s3_key')
    .eq('is_active', true)
    .order('sort_order');
  return (data || []) as Pick<Product, 'id' | 'title' | 'cover_emoji' | 'letter_s3_key'>[];
}

async function getSegments(): Promise<Segment[]> {
  const { stages } = await listAzbukaStoppedStages();
  return stages.map(({ stage, count, seriesTitle }) => ({
    id: segmentIdForStage(stage),
    label: `🎯 Остановились на «${seriesTitle}» (${count} чел.)`,
    stage,
  }));
}

interface Props { searchParams: { segment?: string } }

export default async function AdminFollowupPage({ searchParams }: Props) {
  const [products, segments] = await Promise.all([getProducts(), getSegments()]);
  return <FollowupWizard products={products} segments={segments} initialProductId={searchParams.segment} />;
}
