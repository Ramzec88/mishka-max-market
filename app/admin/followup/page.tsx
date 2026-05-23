export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Product } from '@/types/product';
import FollowupWizard from './FollowupWizard';

async function getProducts(): Promise<Pick<Product, 'id' | 'title' | 'cover_emoji' | 'letter_s3_key'>[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, title, cover_emoji, letter_s3_key')
    .eq('is_active', true)
    .order('sort_order');
  return (data || []) as Pick<Product, 'id' | 'title' | 'cover_emoji' | 'letter_s3_key'>[];
}

export default async function AdminFollowupPage() {
  const products = await getProducts();
  return <FollowupWizard products={products} />;
}
