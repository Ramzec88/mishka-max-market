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

  const res = await fetch(`${LAVA_BASE}/api/v3/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Lava ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json() as Promise<LavaInvoice>;
}
