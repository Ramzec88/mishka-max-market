export type Category = 'songs' | 'scenarios' | 'materials' | 'bundles';
export type CoverVariant = 'orange' | 'lavender' | 'green' | 'blue';

export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number; // в копейках
  price_old: number | null;
  category: Category;
  cover_emoji: string | null;
  cover_variant: CoverVariant;
  badge: string | null;
  format: string | null;
  storage_paths: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type ProductInsert = Omit<Product, 'created_at'>;
