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
  bundle_product_ids: string[]; // for bundles: IDs of included products (no file duplication)
  demo_url: string | null;
  boosty_url: string | null;
  lava_url: string | null;
  recommended_product_ids: string[];
  letter_s3_key: string | null; // PDF «Письмо Мишки Макса» для follow-up рассылки
  bump_price: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Product enriched with server-computed fields
export type ProductDisplay = Product & {
  cover_url?: string;
  avg_rating?: number;
  review_count?: number;
};

export type ProductInsert = Omit<Product, 'created_at'>;
