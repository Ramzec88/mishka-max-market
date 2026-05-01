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
  cover_image: string | null; // S3 key for cover photo
  cover_variant: CoverVariant;
  badge: string | null;
  format: string | null;
  storage_paths: string[];
  demo_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Product enriched with a presigned cover URL (computed server-side, not in DB)
export type ProductDisplay = Product & { cover_url?: string };

export type ProductInsert = Omit<Product, 'created_at'>;
