export type YooKassaEventType =
  | 'payment.succeeded'
  | 'payment.waiting_for_capture'
  | 'payment.canceled'
  | 'refund.succeeded';

export interface YooKassaAmount {
  value: string;
  currency: 'RUB';
}

export interface YooKassaPaymentObject {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: YooKassaAmount;
  description?: string;
  metadata?: Record<string, string>;
  created_at: string;
  captured_at?: string;
  paid: boolean;
  refundable: boolean;
}

export interface YooKassaWebhookPayload {
  type: 'notification';
  event: YooKassaEventType;
  object: YooKassaPaymentObject;
}
