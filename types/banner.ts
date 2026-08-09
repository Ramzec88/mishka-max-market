export interface Banner {
  id: string;
  desktop_image_key: string;
  mobile_image_key: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}
