import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'ru-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true, // Beget использует path-style: endpoint/bucket/key
  });
}

export async function createPresignedDownloadUrl(
  filePath: string,
  expiresIn = 60
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: filePath,
  });
  return getSignedUrl(client, command, { expiresIn });
}
