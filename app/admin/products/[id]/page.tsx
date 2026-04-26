import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Product } from '@/types/product';
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

  return <ProductForm product={product} />;
}
