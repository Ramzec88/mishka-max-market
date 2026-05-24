import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const key = formData.get('key') as string | null;

    if (!file || !key) {
      return NextResponse.json({ error: 'file и key обязательны' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = process.env.BEGET_S3_BUCKET || process.env.S3_BUCKET || '';
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      }),
    );

    return NextResponse.json({ key });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
