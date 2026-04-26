import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPresignedDownloadUrl } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token || token.length < 10) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Ищем токен
  const { data: downloadToken, error } = await supabaseAdmin
    .from('download_tokens')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !downloadToken) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Проверяем срок действия
  if (new Date(downloadToken.expires_at) < new Date()) {
    return new NextResponse('Link expired', { status: 410 });
  }

  // Проверяем лимит скачиваний
  if (downloadToken.downloads_count >= downloadToken.max_downloads) {
    return new NextResponse('Download limit exceeded', { status: 429 });
  }

  // Инкрементируем счётчик
  await supabaseAdmin
    .from('download_tokens')
    .update({
      downloads_count: downloadToken.downloads_count + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq('token', token);

  // Генерируем presigned URL Beget S3 (TTL 60 секунд — только для редиректа)
  try {
    const presignedUrl = await createPresignedDownloadUrl(downloadToken.file_path, 60);
    return NextResponse.redirect(presignedUrl);
  } catch (err) {
    console.error('S3 presigned URL error:', err);
    return new NextResponse('File not available', { status: 503 });
  }
}
