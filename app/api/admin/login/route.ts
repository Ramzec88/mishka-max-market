import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (
      !expectedUsername ||
      !expectedPassword ||
      username !== expectedUsername ||
      password !== expectedPassword
    ) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('admin_session', expectedPassword, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 });
  }
}
