import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Product } from '@/types/product';
import { getPublicUrl } from '@/lib/storage';
import ProductForm from '@/components/admin/ProductForm';

interface Props {
  params: { id: string };
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Product;
  } catch {
    return null;
  }
}

export default async function EditProductPage({ params }: Props) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  const initialCoverUrl = product.cover_image ? getPublicUrl(product.cover_image) : null;

  const { data: allProductsRaw, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, title, category, cover_emoji')
    .eq('is_active', true)
    .order('sort_order');

  if (productsError) {
    console.error('Failed to load products for recommendations:', productsError.message);
  }

  const allProducts = (allProductsRaw ?? []) as Pick<Product, 'id' | 'title' | 'category' | 'cover_emoji'>[];

  return <ProductForm product={product} initialCoverUrl={initialCoverUrl} allProducts={allProducts} />;
}
