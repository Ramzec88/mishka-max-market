import { createHmac } from 'crypto';

export interface GetPlatinumPosition {
  prefix: number;
  name: string;
  price: number; // kopecks
  quantity: number;
  vat: 'none' | '0' | '5' | '7' | '10' | '22';
}

export interface GetPlatinumPaymentParams {
  dealId: string;
  amount: number; // kopecks
  positions: GetPlatinumPosition[];
  email: string;
  notificationUrl: string;
  successUrl: string;
  failUrl: string;
}

export interface GetPlatinumPaymentResult {
  formUrl: string;
  dealId: string;
}

export async function createGetPlatinumPayment(
  params: GetPlatinumPaymentParams,
): Promise<GetPlatinumPaymentResult> {
  const apiKey = process.env.GETPLATINUM_API_KEY;
  const baseUrl = process.env.GETPLATINUM_BASE_URL;
  if (!apiKey) throw new Error('GETPLATINUM_API_KEY не настроен');
  if (!baseUrl) throw new Error('GETPLATINUM_BASE_URL не настроен');

  const body = {
    dealId: params.dealId,
    amount: params.amount,
    currency: 'RUB',
    positions: params.positions,
    clientParams: {
      clientId: params.dealId,
      email: params.email,
    },
    notificationUrl: params.notificationUrl,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  };

  const res = await fetch(`${baseUrl}/init-payment-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GetPlatinum ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json() as { formUrl: string | null; dealId: string; errorCode?: number; errorMessage?: string };

  if (data.errorCode && data.errorCode !== 0) {
    throw new Error(`GetPlatinum error ${data.errorCode}: ${data.errorMessage ?? 'unknown'}`);
  }
  if (!data.formUrl) {
    throw new Error('GetPlatinum: formUrl отсутствует в ответе');
  }

  return { formUrl: data.formUrl, dealId: data.dealId };
}

export function verifyGetPlatinumChecksum(
  payload: Record<string, unknown>,
  receivedChecksum: string,
): boolean {
  const apiKey = process.env.GETPLATINUM_API_KEY;
  if (!apiKey) return false;

  const params = { ...payload };
  delete params['checksum'];
  delete params['customParams'];

  const sortedKeys = Object.keys(params).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );

  let str = '';
  for (const key of sortedKeys) {
    let value = params[key];
    if (typeof value === 'boolean') {
      value = value ? 1 : 0;
    } else if (typeof value === 'object' && value !== null) {
      value = JSON.stringify(value);
    }
    str += `${key};${value};`;
  }

  const expected = createHmac('sha256', apiKey).update(str).digest('hex').toUpperCase();
  return expected === receivedChecksum.toUpperCase();
}
