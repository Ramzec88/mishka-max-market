import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'ru-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, fileName, contentType } = body as {
      productId: string;
      fileName: string;
      contentType: string;
    };

    if (!productId || !fileName || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const key = `products/${productId}/${fileName}`;
    const client = getS3Client();

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 300 });

    return NextResponse.json({ url, key });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
