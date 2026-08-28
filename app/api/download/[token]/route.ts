import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPresignedDownloadUrl, downloadFileBuffer } from '@/lib/storage';

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

function hasUtf8Bom(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

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

  const fileName = downloadToken.file_path.split('/').pop() || 'file';

  // .txt files are proxied (not redirected) so we can guarantee a UTF-8 BOM — without one,
  // some text editors guess the wrong encoding for short Cyrillic text and show mojibake,
  // even though the file itself is valid UTF-8. Everything else keeps the cheap redirect.
  if (fileName.toLowerCase().endsWith('.txt')) {
    const buffer = await downloadFileBuffer(downloadToken.file_path);
    if (!buffer) return new NextResponse('File not available', { status: 503 });
    const body = hasUtf8Bom(buffer) ? buffer : Buffer.concat([UTF8_BOM, buffer]);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(body.length),
      },
    });
  }

  // Генерируем presigned URL Beget S3 (TTL 60 секунд — только для редиректа)
  try {
    const presignedUrl = await createPresignedDownloadUrl(downloadToken.file_path, 60);
    return NextResponse.redirect(presignedUrl);
  } catch (err) {
    console.error('S3 presigned URL error:', err);
    return new NextResponse('File not available', { status: 503 });
  }
}
