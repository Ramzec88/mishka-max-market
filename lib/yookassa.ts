import { YooCheckout, ICreatePayment } from '@a2seven/yoo-checkout';

export function getYooCheckout() {
  const shopId = process.env.YOOKASSA_SHOP_ID!;
  const secretKey = process.env.YOOKASSA_SECRET_KEY!;
  return new YooCheckout({ shopId, secretKey });
}

export interface CreatePaymentParams {
  orderId: string;
  amount: number; // в копейках
  email: string;
  description: string;
  receiptItems: Array<{
    description: string;
    amount: number; // в копейках
    quantity: number;
  }>;
}

export async function createPayment(params: CreatePaymentParams) {
  const client = getYooCheckout();
  const amountRubles = (params.amount / 100).toFixed(2);

  const payload: ICreatePayment = {
    amount: {
      value: amountRubles,
      currency: 'RUB',
    },
    confirmation: {
      type: 'embedded',
    },
    description: params.description,
    metadata: {
      order_id: params.orderId,
    },
    capture: true,
  };

  // Чек передаём только если явно включена онлайн-касса (54-ФЗ).
  // Для тестового магазина без кассы — не передаём, иначе YooKassa вернёт ошибку.
  if (process.env.YOOKASSA_RECEIPT_ENABLED === 'true') {
    payload.receipt = {
      customer: { email: params.email },
      items: params.receiptItems.map((item) => ({
        description: item.description,
        quantity: String(item.quantity),
        amount: {
          value: (item.amount / 100).toFixed(2),
          currency: 'RUB',
        },
        vat_code: 1,
        payment_mode: 'full_payment' as const,
        payment_subject: 'service' as const,
      })),
    };
  }

  const idempotenceKey = `${params.orderId}-create`;
  try {
    return await client.createPayment(payload, idempotenceKey);
  } catch (err: unknown) {
    // Extract actual YooKassa API error from axios error object
    if (err && typeof err === 'object') {
      const axiosErr = err as Record<string, unknown>;
      const response = axiosErr['response'] as { status?: number; data?: unknown } | undefined;
      if (response) {
        throw new Error(`YooKassa ${response.status}: ${JSON.stringify(response.data)}`);
      }
      const msg = axiosErr['message'];
      if (typeof msg === 'string') throw new Error(`YooKassa: ${msg}`);
    }
    throw new Error(`YooKassa: неизвестная ошибка`);
  }
}
