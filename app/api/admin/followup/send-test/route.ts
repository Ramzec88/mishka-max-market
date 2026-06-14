import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendFollowupEmail } from '@/lib/email';
import type { Product } from '@/types/product';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { productId, letterBody, subject, skipAttachment, testEmail } = await req.json() as {
      productId: string;
      letterBody: string;
      subject: string;
      skipAttachment?: boolean;
      testEmail: string;
    };

    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return NextResponse.json({ error: 'Укажите корректный email для теста' }, { status: 400 });
    }
    if (!letterBody) {
      return NextResponse.json({ error: 'Текст письма обязателен' }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mishka-max.ru';

    const { data: productData } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    const targetProduct = productData as Product | null;

    await sendFollowupEmail({
      to: testEmail,
      letterBody,
      letterS3Key: skipAttachment ? null : (targetProduct?.letter_s3_key ?? null),
      siteUrl,
      subject: `[ТЕСТ] ${subject || '🐻 Письмо от Мишки Макса'}`,
      recommendations: [],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
