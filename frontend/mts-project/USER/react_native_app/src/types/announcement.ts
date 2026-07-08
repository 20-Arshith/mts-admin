export interface Announcement {
  announcement_id: number;
  vendor_id?: number | null;
  message: string;
  image_url?: string | null;
  location_identifier?: string | null;
  start_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
  created_at?: string | null;
}
