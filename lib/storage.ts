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
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: filePath,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  });
  return getSignedUrl(client, command, { expiresIn });
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
