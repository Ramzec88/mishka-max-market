const LAVA_BASE = 'https://gate.lava.top';

export interface LavaInvoiceParams {
  email: string;
  offerId: string;
  currency: 'RUB';
  amount: number;     // рубли (не копейки)
  successUrl?: string;
  failUrl?: string;
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
    offer_id: params.offerId,
    currency: params.currency,
    amount: params.amount,
  };
  if (params.successUrl) body.successUrl = params.successUrl;
  if (params.failUrl) body.failUrl = params.failUrl;

  const res = await fetch(`${LAVA_BASE}/api/v3/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
