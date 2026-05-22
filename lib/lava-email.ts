/** Нормализация и проверка email для Lava Top API */
export function normalizeLavaEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidLavaEmail(email: string): boolean {
  // Lava принимает латиницу; кириллица в адресе часто даёт 400
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return false;
  if (/[^\x00-\x7F]/.test(email)) return false;
  const [local, domain] = email.split('@');
  if (!local || !domain || local.length > 64 || domain.length > 255) return false;
  return true;
}

export function lavaErrorMessage(raw: string): string {
  if (raw.includes('Incorrect email to purchase')) {
    return (
      'Lava отклонил email. Проверьте: латиница (user@mail.ru), без пробелов, ' +
      'не email вашего аккаунта автора на lava.top, для теста — другой ящик (gmail.com).'
    );
  }
  return raw;
}
