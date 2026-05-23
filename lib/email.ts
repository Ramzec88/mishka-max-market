import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function getS3ClientForEmail(): S3Client {
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

async function downloadFromS3(key: string): Promise<Buffer | null> {
  try {
    const client = getS3ClientForEmail();
    const bucket = process.env.BEGET_S3_BUCKET || process.env.S3_BUCKET || '';
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export interface DownloadItem {
  title: string;
  format: string | null;
  downloadUrl: string;
  fileName?: string;
  fileSizeBytes?: number;
}

export interface RecommendedItem {
  title: string;
  price: number; // in kopecks
  emoji: string;
  url: string;
}

export interface SendOrderEmailParams {
  to: string;
  orderId: string;
  items: DownloadItem[];
  siteUrl: string;
  recommendations?: RecommendedItem[];
}

export async function sendOrderEmail(params: SendOrderEmailParams): Promise<void> {
  const { to, orderId, items, siteUrl, recommendations } = params;

  const templatePath = join(process.cwd(), 'emails', 'order-delivery.html');
  let html = readFileSync(templatePath, 'utf-8');

  const LARGE_FILE_BYTES = 50 * 1024 * 1024;

  const itemsHtml = items
    .map((item) => {
      const isLarge = item.fileSizeBytes != null && item.fileSizeBytes > LARGE_FILE_BYTES;
      const sizeMb = item.fileSizeBytes != null ? (item.fileSizeBytes / 1024 / 1024).toFixed(0) : null;
      return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #F0E4D6;">
        <div style="font-weight: 700; font-size: 15px; color: #1F1B16; margin-bottom: 4px;">${item.title}</div>
        ${item.fileName ? `<div style="font-size: 13px; color: #5A4F45; margin-bottom: 2px;">${item.fileName}${sizeMb ? ` · ${sizeMb} МБ` : ''}</div>` : ''}
        ${item.format ? `<div style="font-size: 13px; color: #5A4F45;">${item.format}</div>` : ''}
        ${isLarge ? `<div style="margin-top: 8px; background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #92400E;">⏳ Файл крупный (${sizeMb} МБ) — скачивание может занять несколько минут. Дождитесь полной загрузки, не закрывайте страницу.</div>` : ''}
        <a href="${item.downloadUrl}" style="display: inline-block; margin-top: 10px; background: #FF7A3D; color: #fff; padding: 10px 20px; border-radius: 100px; font-weight: 700; font-size: 14px; text-decoration: none;">
          Скачать
        </a>
      </td>
    </tr>
  `;
    })
    .join('');

  let recommendationsHtml = '';
  if (recommendations && recommendations.length > 0) {
    const rows = recommendations
      .map(
        (r) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #F0E4D6;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width: 40px; font-size: 28px; vertical-align: middle;">${r.emoji}</td>
            <td style="vertical-align: middle; padding: 0 12px;">
              <div style="font-weight: 700; font-size: 14px; color: #1F1B16;">${r.title}</div>
              <div style="font-size: 13px; color: #5A4F45; margin-top: 2px;">${Math.round(r.price / 100)} ₽</div>
            </td>
            <td style="width: 110px; text-align: right; vertical-align: middle;">
              <a href="${r.url}" style="display: inline-block; background: #FF7A3D; color: #fff; padding: 8px 16px; border-radius: 100px; font-weight: 700; font-size: 13px; text-decoration: none;">Купить</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`,
      )
      .join('');
    recommendationsHtml = `
    <tr>
      <td style="background: #FFF8F3; padding: 20px 32px; border-top: 1px solid #F0E4D6; border-bottom: 1px solid #F0E4D6;">
        <p style="margin: 0 0 12px; font-size: 15px; font-weight: 900; color: #1F1B16;">Вам также может понравиться</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
      </td>
    </tr>`;
  }

  html = html
    .replace('{{ITEMS}}', itemsHtml)
    .replace('{{RECOMMENDATIONS}}', recommendationsHtml)
    .replace(/\{\{THANK_YOU_URL\}\}/g, `${siteUrl}/thank-you?order=${orderId}`)
    .replace(/\{\{SITE_URL\}\}/g, siteUrl);

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM || '"Мишка Макс" <info@mishka-max.ru>',
    to,
    subject: 'Ваши материалы от Мишки Макса 🧸',
    html,
  });
}

export interface FollowupRecommendedItem {
  title: string;
  price: number; // kopecks
  emoji: string;
  url: string;
}

export interface SendFollowupEmailParams {
  to: string;
  productTitle: string;
  siteUrl: string;
  recommendations?: FollowupRecommendedItem[];
}

export async function sendFollowupEmail(params: SendFollowupEmailParams): Promise<void> {
  const { to, productTitle, siteUrl, recommendations } = params;

  const templatePath = join(process.cwd(), 'emails', 'followup-letter.html');
  let html = readFileSync(templatePath, 'utf-8');

  // Attachment: PDF letter from S3
  const letterS3Key = process.env.MISHKA_LETTER_S3_KEY || 'assets/mishka-letter.pdf';
  const attachments: nodemailer.SendMailOptions['attachments'] = [];
  const letterBuffer = await downloadFromS3(letterS3Key);
  if (letterBuffer) {
    attachments.push({
      filename: 'Письмо Мишки Макса.pdf',
      content: letterBuffer,
      contentType: 'application/pdf',
    });
  }

  const letterButtonHtml = letterBuffer
    ? '' // attachment present — no separate button needed
    : `<tr>
        <td style="padding:0 40px 24px;text-align:center;">
          <p style="margin:0 0 12px;font-size:13px;color:#888;">Письмо прикреплено к этому email как PDF-файл.</p>
        </td>
      </tr>`;

  // Recommendations block
  let recommendationsHtml = '';
  if (recommendations && recommendations.length > 0) {
    const rows = recommendations
      .map(
        (r) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #F0E4D6;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:44px;font-size:30px;vertical-align:middle;">${r.emoji}</td>
              <td style="vertical-align:middle;padding:0 12px;">
                <div style="font-weight:700;font-size:14px;color:#1F1B16;">${r.title}</div>
                <div style="font-size:13px;color:#5A4F45;margin-top:2px;">${Math.round(r.price / 100)} ₽</div>
              </td>
              <td style="width:110px;text-align:right;vertical-align:middle;">
                <a href="${r.url}" style="display:inline-block;background:#FF7A3D;color:#fff;padding:9px 18px;border-radius:100px;font-weight:700;font-size:13px;text-decoration:none;">Купить</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
      )
      .join('');
    recommendationsHtml = `
    <tr>
      <td style="background:#FFF8F3;padding:16px 40px 20px;border-top:1px solid #F0E4D6;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
      </td>
    </tr>`;
  }

  html = html
    .replace('{{PRODUCT_TITLE}}', productTitle)
    .replace('{{GENDER_SUFFIX}}', 'а') // нейтральное "купила" не используем — просто "купил(а)"
    .replace('{{LETTER_BUTTON}}', letterButtonHtml)
    .replace('{{RECOMMENDATIONS}}', recommendationsHtml)
    .replace(/\{\{SITE_URL\}\}/g, siteUrl);

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM || '"Мишка Макс" <info@mishka-max.ru>',
    to,
    subject: '🐻 Письмо от Мишки Макса — продолжаем учить буквы?',
    html,
    attachments,
  });
}
