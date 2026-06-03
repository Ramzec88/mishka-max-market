import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.BEGET_S3_ENDPOINT || process.env.S3_ENDPOINT || '',
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
    const body = await request.json();
    const { key, contentType } = body as { key: string; contentType: string };

    if (!key || !contentType) {
      return NextResponse.json({ error: 'key и contentType обязательны' }, { status: 400 });
    }

    const bucket = process.env.BEGET_S3_BUCKET || process.env.S3_BUCKET || '';
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(getS3Client(), command, { expiresIn: 600 });

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
