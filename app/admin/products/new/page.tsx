import { supabaseAdmin } from '@/lib/supabase/admin';
import { Product } from '@/types/product';
import ProductForm from '@/components/admin/ProductForm';

export default async function NewProductPage() {
  const { data: allProductsRaw } = await supabaseAdmin
    .from('products')
    .select('id, title, category, cover_emoji, storage_paths')
    .eq('is_active', true)
    .order('sort_order');

  const allProducts = (allProductsRaw ?? []) as Pick<Product, 'id' | 'title' | 'category' | 'cover_emoji' | 'storage_paths'>[];

  return <ProductForm allProducts={allProducts} />;
}
