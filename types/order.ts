export type OrderStatus = 'pending' | 'paid' | 'failed' | 'canceled';

export interface Order {
  id: string;
  email: string;
  items: string[]; // product IDs
  amount: number; // в копейках
  yookassa_payment_id: string | null;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  email_sent_at: string | null;
  webhook_processed_at: string | null;
}

export interface DownloadToken {
  token: string;
  order_id: string;
  product_id: string;
  file_path: string;
  expires_at: string;
  downloads_count: number;
  max_downloads: number;
  last_downloaded_at: string | null;
  created_at: string;
}
