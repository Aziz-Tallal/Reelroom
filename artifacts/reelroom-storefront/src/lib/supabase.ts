import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error("REELROOM's Supabase connection is not configured. Add the Supabase URL and publishable key to the app environment.");
  }
  client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export type ProductRecord = {
  id: string;
  title: string;
  description: string;
  release_year: number | null;
  genre: string;
  genres: string[] | null;
  director: string | null;
  runtime: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  source_page: string | null;
  palette: string[] | null;
  physical_available: boolean;
  digital_available: boolean;
  featured: boolean;
  is_criterion: boolean;
  is_animated: boolean;
  collections: string[] | null;
  display_order: number;
};

export type ProductVariantRecord = {
  id: string;
  product_id: string;
  media_type: "physical" | "digital";
  transaction_type: "buy" | "rent";
  format: string | null;
  platform: string | null;
  price_kwd: number | string;
  price_is_demo: boolean;
  available: boolean;
  stock_quantity: number | null;
  rental_duration_days: number | null;
};

export type ProfileRecord = {
  id: string;
  display_name: string | null;
};

export type AccountOrderRecord = {
  id: string;
  order_number: string;
  total_kwd: number | string;
  order_status: string;
  checkout_mode: "demo" | "test" | "live";
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  fulfillment_method: string;
  delivery_address: string | null;
  order_note: string | null;
  created_at: string;
};

export type AccountOrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_title: string;
  poster_url: string | null;
  quantity: number;
  unit_price_kwd: number | string;
  media_type: "physical" | "digital";
  transaction_type: "buy" | "rent";
  selected_format: string | null;
  selected_platform: string | null;
  rental_duration_days: number | null;
};

export function toCartVariantId(line: {
  variantId?: string | null;
  movieId: string;
  experience: "Physical" | "Digital";
  mode: "Buy" | "Rent";
  option: string;
}, variants: ProductVariantRecord[]): string | null {
  const existing = line.variantId && variants.find((variant) => variant.id === line.variantId);
  if (existing) return existing.id;
  const mediaType = line.experience === "Physical" ? "physical" : "digital";
  const transactionType = line.mode.toLowerCase();
  return variants.find((variant) =>
    variant.product_id === line.movieId
    && variant.media_type === mediaType
    && variant.transaction_type === transactionType
    && (mediaType === "physical" ? variant.format === line.option : variant.platform === line.option)
    && variant.available,
  )?.id ?? null;
}
