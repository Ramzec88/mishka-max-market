import { YooCheckout, ICreatePayment } from '@a2seven/yoo-checkout';

const shopId = process.env.YOOKASSA_SHOP_ID!;
const secretKey = process.env.YOOKASSA_SECRET_KEY!;

export function getYooCheckout() {
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
    receipt: {
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
    },
    capture: true,
  };

  const idempotenceKey = `${params.orderId}-create`;
  return client.createPayment(payload, idempotenceKey);
}
