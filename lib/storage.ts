import { S3Client, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getEndpoint(): string {
  return process.env.BEGET_S3_ENDPOINT || process.env.S3_ENDPOINT || '';
}

function getBucket(): string {
  return process.env.BEGET_S3_BUCKET || process.env.S3_BUCKET || '';
}

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: getEndpoint(),
    region: process.env.S3_REGION || 'ru-1',
    credentials: {
      accessKeyId: (process.env.BEGET_S3_ACCESS_KEY || process.env.S3_ACCESS_KEY)!,
      secretAccessKey: (process.env.BEGET_S3_SECRET_KEY || process.env.S3_SECRET_KEY)!,
    },
    forcePathStyle: true,
  });
}

export function getPublicUrl(key: string): string {
  return `${getEndpoint()}/${getBucket()}/${key}`;
}

export async function createPresignedDownloadUrl(
  filePath: string,
  expiresIn = 60
): Promise<string> {
  const client = getS3Client();
  const fileName = filePath.split('/').pop() || 'file';
  // Without an explicit charset, some browsers guess the encoding of a downloaded/opened
  // .txt file themselves — and occasionally guess wrong for short Cyrillic text, showing
  // mojibake even though the file itself is perfectly valid UTF-8 on the server.
  const responseContentType = fileName.toLowerCase().endsWith('.txt')
    ? 'text/plain; charset=utf-8'
    : undefined;
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: filePath,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    ResponseContentType: responseContentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function downloadFileBuffer(key: string): Promise<Buffer | null> {
  try {
    const client = getS3Client();
    const res = await client.send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function getFileSizeBytes(key: string): Promise<number | null> {
  try {
    const client = getS3Client();
    const res = await client.send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
    return res.ContentLength ?? null;
  } catch {
    return null;
  }
}

export async function deleteS3Objects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const client = getS3Client();
  if (keys.length === 1) {
    await client.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: keys[0] }));
    return;
  }
  await client.send(new DeleteObjectsCommand({
    Bucket: getBucket(),
    Delete: { Objects: keys.map(k => ({ Key: k })) },
  }));
}
