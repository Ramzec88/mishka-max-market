const LAVA_BASE = 'https://gate.lava.top';

export type LavaCurrency = 'RUB' | 'USD' | 'EUR';
export type LavaProvider = 'SMART_GLOCAL' | 'PAY2ME' | 'UNLIMINT' | 'PAYPAL';

export interface LavaInvoiceParams {
  email: string;
  offerId: string;
  currency: LavaCurrency;
  amount?: number;
  paymentProvider?: LavaProvider;
  periodicity?: 'ONE_TIME' | 'MONTHLY';
  successUrl?: string;
  failUrl?: string;
  buyerLanguage?: 'RU' | 'EN' | 'ES';
  clientUtm?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
  };
}

export interface LavaInvoice {
  id: string;
  status: string;
  amountTotal: { currency: string; amount: number };
  paymentUrl: string;
}

export async function createLavaInvoice(params: LavaInvoiceParams): Promise<LavaInvoice> {
  const apiKey = process.env.LAVA_API_KEY;
  if (!apiKey) throw new Error('LAVA_API_KEY не настроен');

  const body: Record<string, unknown> = {
    email: params.email,
    offerId: params.offerId,
    currency: params.currency,
  };

  if (params.amount != null) body.amount = params.amount;
  if (params.paymentProvider) body.paymentProvider = params.paymentProvider;
  if (params.periodicity) body.periodicity = params.periodicity;
  if (params.successUrl) body.successUrl = params.successUrl;
  if (params.failUrl) body.failUrl = params.failUrl;
  if (params.buyerLanguage) body.buyerLanguage = params.buyerLanguage;
  if (params.clientUtm) body.clientUtm = params.clientUtm;

  const res = await fetch(`${LAVA_BASE}/api/v3/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Lava ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json() as Promise<LavaInvoice>;
}
