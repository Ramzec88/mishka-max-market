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

export interface AbandonedCartItem {
  title: string;
  price: number; // kopecks
  emoji: string | null;
}

export interface SendAbandonedCartEmailParams {
  to: string;
  items: AbandonedCartItem[];
  totalAmount: number; // kopecks
  siteUrl: string;
}

export async function sendAbandonedCartEmail(params: SendAbandonedCartEmailParams): Promise<void> {
  const { to, items, totalAmount, siteUrl } = params;

  const templatePath = join(process.cwd(), 'emails', 'abandoned-cart.html');
  let html = readFileSync(templatePath, 'utf-8');

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F5EDE3;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:36px;font-size:26px;vertical-align:middle;">${item.emoji ?? '📦'}</td>
            <td style="vertical-align:middle;padding:0 12px;">
              <div style="font-weight:700;font-size:14px;color:#1F1B16;">${item.title}</div>
            </td>
            <td style="width:80px;text-align:right;vertical-align:middle;font-weight:700;font-size:14px;color:#FF7A3D;white-space:nowrap;">
              ${Math.round(item.price / 100)} ₽
            </td>
          </tr>
        </table>
      </td>
    </tr>`,
    )
    .join('');

  html = html
    .replace('{{ITEMS_HTML}}', itemsHtml)
    .replace('{{AMOUNT}}', Math.round(totalAmount / 100).toLocaleString('ru-RU'))
    .replace(/\{\{SITE_URL\}\}/g, siteUrl);

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM || '"Мишка Макс" <info@mishka-max.ru>',
    to,
    subject: 'Вы не завершили покупку 🧸',
    html,
  });
}

export interface SendFollowupEmailParams {
  to: string;
  letterBody: string;   // plain text из textarea — абзацы разделены \n\n
  letterS3Key: string | null;
  siteUrl: string;
  subject: string;
  recommendations?: FollowupRecommendedItem[];
}

// Converts plain text (paragraphs separated by \n\n) to HTML paragraphs.
function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) =>
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3D3530;">${
        para.trim().replace(/\n/g, '<br />')
      }</p>`,
    )
    .join('');
}

export async function sendFollowupEmail(params: SendFollowupEmailParams): Promise<void> {
  const { to, letterBody, letterS3Key, siteUrl, subject, recommendations } = params;

  const templatePath = join(process.cwd(), 'emails', 'followup-letter.html');
  let html = readFileSync(templatePath, 'utf-8');

  const attachments: nodemailer.SendMailOptions['attachments'] = [];
  const letterBuffer = letterS3Key ? await downloadFromS3(letterS3Key) : null;
  if (letterBuffer) {
    attachments.push({
      filename: 'Письмо Мишки Макса.pdf',
      content: letterBuffer,
      contentType: 'application/pdf',
    });
  }

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
    .replace('{{LETTER_BODY}}', textToHtml(letterBody))
    .replace('{{RECOMMENDATIONS}}', recommendationsHtml)
    .replace(/\{\{SITE_URL\}\}/g, siteUrl);

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM || '"Мишка Макс" <info@mishka-max.ru>',
    to,
    subject,
    html,
    attachments,
  });
}
