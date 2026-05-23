import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.BEGET_S3_ENDPOINT || process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'ru-1',
    credentials: {
      accessKeyId: (process.env.BEGET_S3_ACCESS_KEY || process.env.S3_ACCESS_KEY)!,
      secretAccessKey: (process.env.BEGET_S3_SECRET_KEY || process.env.S3_SECRET_KEY)!,
    },
    forcePathStyle: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { productId, ext } = await request.json() as { productId: string; ext?: string };

    if (!productId) {
      return NextResponse.json({ error: 'productId обязателен' }, { status: 400 });
    }

    const safeExt = (ext || 'pdf').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'pdf';
    const key = `letters/${productId}/mishka-letter.${safeExt}`;
    const bucket = process.env.BEGET_S3_BUCKET || process.env.S3_BUCKET || '';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: 'application/pdf',
    });

    const url = await getSignedUrl(getS3Client(), command, { expiresIn: 300 });

    return NextResponse.json({ url, key });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
