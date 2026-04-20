import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

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
}

export interface SendOrderEmailParams {
  to: string;
  orderId: string;
  items: DownloadItem[];
  siteUrl: string;
}

export async function sendOrderEmail(params: SendOrderEmailParams): Promise<void> {
  const { to, orderId, items, siteUrl } = params;

  const templatePath = join(process.cwd(), 'emails', 'order-delivery.html');
  let html = readFileSync(templatePath, 'utf-8');

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #F0E4D6;">
        <div style="font-weight: 700; font-size: 15px; color: #1F1B16; margin-bottom: 4px;">${item.title}</div>
        ${item.format ? `<div style="font-size: 13px; color: #5A4F45;">${item.format}</div>` : ''}
        <a href="${item.downloadUrl}" style="display: inline-block; margin-top: 10px; background: #FF7A3D; color: #fff; padding: 10px 20px; border-radius: 100px; font-weight: 700; font-size: 14px; text-decoration: none;">
          Скачать
        </a>
      </td>
    </tr>
  `
    )
    .join('');

  html = html
    .replace('{{ITEMS}}', itemsHtml)
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
