import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import Catalog from '@/components/Catalog';
import { Product, ProductDisplay } from '@/types/product';
import { getPublicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'songs-graduation',
    title: 'Песни на выпускной в детском саду',
    description: '12 авторских песен для выпускного утренника: mp3, минусовки, тексты в PDF.',
    price: 59900, price_old: 99900, category: 'songs',
    cover_emoji: '🎵', cover_image: null, cover_variant: 'orange', badge: 'хит', format: 'MP3 + тексты',
    storage_paths: [], is_active: true, sort_order: 10, created_at: '',
  },
  {
    id: 'scenario-first-ticket',
    title: 'Сценарий «Билет в первый класс»',
    description: 'Готовый сценарий выпускного утренника на 45 минут. С ролями, репликами и тайм-кодами.',
    price: 49900, price_old: null, category: 'scenarios',
    cover_emoji: '🎓', cover_image: null, cover_variant: 'lavender', badge: null, format: 'PDF сценарий',
    storage_paths: [], is_active: true, sort_order: 20, created_at: '',
  },
  {
    id: 'materials-autumn',
    title: 'Осенний комплект материалов',
    description: 'Карточки, раскраски, задания для детей 3–5 лет по теме «Осень». 42 страницы.',
    price: 34900, price_old: null, category: 'materials',
    cover_emoji: '🍂', cover_image: null, cover_variant: 'orange', badge: null, format: 'PDF + изображения',
    storage_paths: [], is_active: true, sort_order: 30, created_at: '',
  },
  {
    id: 'songs-new-year',
    title: 'Новогодние песни — сборник',
    description: '8 песен про Деда Мороза, ёлку и зиму в исполнении Мишки Макса.',
    price: 44900, price_old: null, category: 'songs',
    cover_emoji: '🎄', cover_image: null, cover_variant: 'green', badge: null, format: 'MP3',
    storage_paths: [], is_active: true, sort_order: 40, created_at: '',
  },
  {
    id: 'scenario-8march',
    title: 'Сценарий на 8 Марта',
    description: 'Утренник для младшей и средней группы. Песни, стихи, игры, конкурсы.',
    price: 39900, price_old: null, category: 'scenarios',
    cover_emoji: '🌷', cover_image: null, cover_variant: 'lavender', badge: null, format: 'PDF',
    storage_paths: [], is_active: true, sort_order: 50, created_at: '',
  },
  {
    id: 'materials-speech',
    title: 'Разговори молчуна — методичка',
    description: '21 день нейрозаданий для развития речи. Для родителей и логопедов.',
    price: 69000, price_old: null, category: 'materials',
    cover_emoji: '🗣️', cover_image: null, cover_variant: 'blue', badge: 'новинка', format: 'PDF',
    storage_paths: [], is_active: true, sort_order: 60, created_at: '',
  },
  {
    id: 'bundle-kindergarten',
    title: 'Комплект воспитателя на год',
    description: '4 сценария утренников + 30 песен + 150 материалов. Экономия 2400 ₽.',
    price: 249000, price_old: 489000, category: 'bundles',
    cover_emoji: '🎁', cover_image: null, cover_variant: 'orange', badge: 'выгодно', format: 'Всё включено',
    storage_paths: [], is_active: true, sort_order: 70, created_at: '',
  },
  {
    id: 'songs-lullabies',
    title: 'Колыбельные Мишки Макса',
    description: '10 авторских колыбельных. Успокаивают, помогают заснуть. Общее время — 38 минут.',
    price: 29900, price_old: null, category: 'songs',
    cover_emoji: '🌙', cover_image: null, cover_variant: 'blue', badge: null, format: 'MP3',
    storage_paths: [], is_active: true, sort_order: 80, created_at: '',
  },
];

async function getProducts(): Promise<Product[]> {
  noStore();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return FALLBACK_PRODUCTS;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) },
    });
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) return FALLBACK_PRODUCTS;
    return (data ?? []) as Product[];
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

function attachCoverUrls(products: Product[]): ProductDisplay[] {
  return products.map((p) => {
    if (!p.cover_image) return p;
    return { ...p, cover_url: getPublicUrl(p.cover_image) };
  });
}

export default async function HomePage() {
  const products = await getProducts();
  const productsWithCovers = attachCoverUrls(products);
  return <Catalog products={productsWithCovers} />;
}
