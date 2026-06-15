import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json() as { to?: string };
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'Укажите корректный email' }, { status: 400 });
    }

    const config = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM,
    };

    if (!config.host || !config.user) {
      return NextResponse.json({
        error: 'SMTP не настроен',
        config: { host: config.host || '(не задан)', port: config.port, user: config.user || '(не задан)' },
      }, { status: 500 });
    }

    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transport.sendMail({
      from: config.from || '"Мишка Макс" <info@mishka-max.ru>',
      to,
      subject: 'Тест SMTP — Мишка Макс',
      html: `<p>Это тестовое письмо. SMTP работает корректно.</p><p>Хост: <b>${config.host}</b>, Порт: <b>${config.port}</b>, Пользователь: <b>${config.user}</b></p>`,
    });

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
