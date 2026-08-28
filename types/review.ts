export interface Review {
  id: string;
  order_id: string;
  product_id: string;
  email: string;
  name: string | null;
  rating: number;
  body: string | null;
  is_published: boolean;
  admin_reply: string | null;
  admin_reply_at: string | null;
  created_at: string;
}

// What the public site is ever allowed to see for a review — never email/order_id.
export type PublicReview = Pick<
  Review,
  'id' | 'name' | 'rating' | 'body' | 'created_at' | 'admin_reply' | 'admin_reply_at'
>;
