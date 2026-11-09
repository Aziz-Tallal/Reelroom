import type Stripe from "stripe";
import type {
  StripeCheckoutCancelResponse,
  StripeCheckoutContact,
  StripeCheckoutInput,
  StripeCheckoutOrder,
  StripeCheckoutOrderItem,
} from "@workspace/api-zod";
import { getUncachableStripeClient, isStripeCheckoutReady } from "./stripeClient";
import { getSupabaseAdminClient } from "./supabaseAdmin";

type CatalogVariant = {
  id: string;
  product_id: string;
  media_type: "physical" | "digital";
  transaction_type: "buy" | "rent";
  format: string | null;
  platform: string | null;
  price_kwd: number | string;
  available: boolean;
  rental_duration_days: number | null;
};

type CatalogProduct = {
  id: string;
  title: string;
  poster_url: string | null;
};

type ResolvedLine = {
  variant: CatalogVariant;
  product: CatalogProduct;
  price: Stripe.Price;
  quantity: number;
};

type PendingOrder = {
  id: string;
  order_number: string;
  total_kwd: number | string;
  order_status: string;
  checkout_mode: "test";
  created_at: string;
};

function amountInFils(priceKwd: number | string): number {
  const amount = Number(priceKwd);
  const fils = Math.round(amount * 1000);
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 1000 - fils) > 0.000001) {
    throw new Error("The catalog contains an invalid KWD price.");
  }
  return fils;
}

function priceInKwd(price: Stripe.Price): number {
  if (price.currency !== "kwd" || price.unit_amount === null || price.unit_amount <= 0) {
    throw new Error("A catalog price is not valid for KWD checkout.");
  }
  return Number((price.unit_amount / 1000).toFixed(3));
}

function safeStripeSearchValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function resolveStripePrice(
  stripe: Stripe,
  variant: CatalogVariant,
  product: CatalogProduct,
): Promise<Stripe.Price> {
  const queryValue = safeStripeSearchValue(variant.id);
  const products = await stripe.products.search({
    query: `active:'true' AND metadata['reelroom_variant_id']:'${queryValue}'`,
    limit: 1,
  });
  const stripeProduct = products.data[0] ?? await stripe.products.create(
    {
      name: `${product.title} — ${variant.media_type === "physical" ? variant.format : variant.platform} ${variant.transaction_type}`,
      description: `REELROOM ${variant.media_type} ${variant.transaction_type} catalog option`,
      metadata: {
        reelroom_variant_id: variant.id,
        reelroom_product_id: product.id,
      },
    },
    { idempotencyKey: `reelroom-product-${variant.id}` },
  );

  const expectedAmount = amountInFils(variant.price_kwd);
  const existingPrices = await stripe.prices.list({
    product: stripeProduct.id,
    active: true,
    limit: 100,
  });
  const currentPrice = existingPrices.data
    .filter((price) =>
      price.currency === "kwd"
      && price.unit_amount !== null
      && price.metadata.reelroom_variant_id === variant.id,
    )
    .sort((left, right) => right.created - left.created)[0];
  if (currentPrice) return currentPrice;

  return stripe.prices.create(
    {
      product: stripeProduct.id,
      currency: "kwd",
      unit_amount: expectedAmount,
      metadata: {
        reelroom_variant_id: variant.id,
        reelroom_product_id: product.id,
      },
    },
    { idempotencyKey: `reelroom-price-${variant.id}-${expectedAmount}` },
  );
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadCheckoutLines(
  stripe: Stripe,
  items: StripeCheckoutInput["items"],
): Promise<ResolvedLine[]> {
  const variantIds = items.map((item) => item.variantId);
  if (new Set(variantIds).size !== variantIds.length) {
    throw new Error("Duplicate cart options are not allowed.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, product_id, media_type, transaction_type, format, platform, price_kwd, available, rental_duration_days")
    .in("id", variantIds)
    .eq("available", true);
  if (variantsError) throw new Error("Unable to verify the selected catalog options.");
  if (!variants || variants.length !== variantIds.length) {
    throw new Error("One or more selected options are unavailable.");
  }

  const productIds = [...new Set((variants as CatalogVariant[]).map((variant) => variant.product_id))];
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, title, poster_url")
    .in("id", productIds);
  if (productsError || !products) {
    throw new Error("Unable to load the selected film details.");
  }
  const productById = new Map((products as CatalogProduct[]).map((product) => [product.id, product]));
  const variantById = new Map((variants as CatalogVariant[]).map((variant) => [variant.id, variant]));

  return mapWithConcurrency(items, 4, async (item) => {
    const variant = variantById.get(item.variantId);
    const product = variant ? productById.get(variant.product_id) : undefined;
    if (!variant || !product) {
      throw new Error("One or more selected options are unavailable.");
    }
    const price = await resolveStripePrice(stripe, variant, product);
    return { variant, product, price, quantity: item.quantity };
  });
}

export async function quoteStripeCheckout(
  items: StripeCheckoutInput["items"],
): Promise<{ prices: Array<{ variantId: string; unitPriceKwd: number; quantity: number }>; totalKwd: number }> {
  if (!isStripeCheckoutReady()) {
    throw new Error("Stripe checkout is temporarily unavailable.");
  }
  const lines = await loadCheckoutLines(await getUncachableStripeClient(), items);
  const prices = lines.map((line) => ({
    variantId: line.variant.id,
    unitPriceKwd: priceInKwd(line.price),
    quantity: line.quantity,
  }));
  const totalKwd = Number(prices.reduce((total, line) => total + line.unitPriceKwd * line.quantity, 0).toFixed(3));
  return { prices, totalKwd };
}

function allowedReturnOrigin(origin: string | undefined): string {
  if (!origin) throw new Error("A valid REELROOM return address is required.");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("A valid REELROOM return address is required.");
  }

  const allowedHosts = [
    ...(process.env.REPLIT_DOMAINS ?? "").split(","),
    process.env.REPLIT_DEV_DOMAIN ?? "",
  ]
    .map((value) => value.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") {
    allowedHosts.push("localhost:5173", "127.0.0.1:5173");
  }
  if (parsed.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && parsed.protocol === "http:")) {
    throw new Error("A valid REELROOM return address is required.");
  }
  if (!allowedHosts.includes(parsed.host)) {
    throw new Error("The checkout return address is not allowed.");
  }
  return parsed.origin;
}

async function createPendingOrder(
  userId: string,
  lines: ResolvedLine[],
  contact: StripeCheckoutContact,
): Promise<PendingOrder> {
  const supabase = getSupabaseAdminClient();
  const rpcItems = lines.map((line) => ({
    variant_id: line.variant.id,
    quantity: line.quantity,
    unit_price_kwd: priceInKwd(line.price),
  }));
  const { data, error } = await supabase.rpc("create_pending_stripe_order", {
    p_user_id: userId,
    p_items: rpcItems,
    p_contact: contact,
  });
  if (error || !data?.id || !data?.order_number) {
    throw new Error("Unable to save the pending order in Supabase.");
  }

  const order = data as PendingOrder;
  const stripeTotalFils = lines.reduce(
    (total, line) => total + (line.price.unit_amount ?? 0) * line.quantity,
    0,
  );
  if (amountInFils(order.total_kwd) !== stripeTotalFils) {
    await supabase.from("orders").delete().eq("id", order.id).eq("user_id", userId);
    throw new Error("The catalog total changed. Refresh your cart and try again.");
  }
  return order;
}

export async function createStripeCheckout(
  userId: string,
  input: StripeCheckoutInput,
  origin: string | undefined,
): Promise<{ url: string }> {
  if (!isStripeCheckoutReady()) {
    throw new Error("Stripe checkout is temporarily unavailable.");
  }
  const returnOrigin = allowedReturnOrigin(origin);
  const lines = await loadCheckoutLines(await getUncachableStripeClient(), input.items);
  const order = await createPendingOrder(userId, lines, input.contact);
  const stripe = await getUncachableStripeClient();
  const metadata = {
    reelroom_user_id: userId,
    reelroom_order_id: order.id,
    reelroom_order_number: order.order_number,
  };

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: input.contact.email,
        phone_number_collection: { enabled: true },
        line_items: lines.map((line) => ({
          price: line.price.id,
          quantity: line.quantity,
        })),
        client_reference_id: order.id,
        metadata,
        payment_intent_data: { metadata },
        success_url: `${returnOrigin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnOrigin}/?checkout=cancelled&session_id={CHECKOUT_SESSION_ID}`,
      },
      { idempotencyKey: `reelroom-checkout-${order.id}` },
    );

    if (!session.url || session.livemode) {
      throw new Error("Stripe did not return a valid test checkout session.");
    }

    const supabase = getSupabaseAdminClient();
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id)
      .eq("user_id", userId)
      .eq("order_status", "pending_payment")
      .select("id")
      .maybeSingle();
    if (updateError || !updatedOrder) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      await supabase.from("orders").update({ order_status: "payment_failed" }).eq("id", order.id);
      throw new Error("Unable to attach the Stripe session to the Supabase order.");
    }

    return { url: session.url };
  } catch (error) {
    const supabase = getSupabaseAdminClient();
    await supabase
      .from("orders")
      .update({ order_status: "payment_failed" })
      .eq("id", order.id)
      .eq("order_status", "pending_payment");
    throw error;
  }
}

async function fetchOrder(orderId: string, userId: string): Promise<StripeCheckoutOrder> {
  const supabase = getSupabaseAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, total_kwd, order_status, contact_name, contact_email, contact_phone, fulfillment_method, delivery_address, order_note, created_at, checkout_mode")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();
  if (orderError || !order) throw new Error("The paid order could not be loaded.");

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, order_id, product_id, variant_id, product_title, poster_url, quantity, unit_price_kwd, media_type, transaction_type, selected_format, selected_platform, rental_duration_days")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (itemsError || !items) throw new Error("The paid order details could not be loaded.");

  return {
    ...order,
    checkout_mode: "test",
    items: items as StripeCheckoutOrderItem[],
  } as StripeCheckoutOrder;
}

async function findOrderForSession(
  session: Stripe.Checkout.Session,
  expectedUserId?: string,
): Promise<{ id: string; user_id: string; total_kwd: number | string; order_status: string; checkout_mode: string } | null> {
  const orderId = session.metadata?.reelroom_order_id || session.client_reference_id;
  const sessionUserId = session.metadata?.reelroom_user_id;
  if (!orderId || !sessionUserId || (expectedUserId && sessionUserId !== expectedUserId)) {
    return null;
  }

  const { data: order, error } = await getSupabaseAdminClient()
    .from("orders")
    .select("id, user_id, total_kwd, order_status, checkout_mode, stripe_checkout_session_id")
    .eq("id", orderId)
    .eq("user_id", sessionUserId)
    .maybeSingle();
  if (
    error
    || !order
    || order.stripe_checkout_session_id !== session.id
    || order.checkout_mode !== "test"
  ) return null;
  return order;
}

async function clearPurchasedCartItems(orderId: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { data: orderItems, error: itemError } = await supabase
    .from("order_items")
    .select("variant_id")
    .eq("order_id", orderId);
  if (itemError || !orderItems) throw new Error("Unable to clear purchased cart options.");
  const variantIds = [...new Set(orderItems.map((item) => item.variant_id).filter((id): id is string => Boolean(id)))];
  if (variantIds.length === 0) return;

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .in("variant_id", variantIds);
  if (error) throw new Error("Unable to clear purchased cart options.");
}

async function markSessionPaid(session: Stripe.Checkout.Session): Promise<{ orderId: string; userId: string }> {
  if (session.livemode || session.currency !== "kwd" || session.payment_status !== "paid") {
    throw new Error("Stripe did not confirm a paid test-mode KWD Checkout Session.");
  }
  const order = await findOrderForSession(session);
  if (!order) throw new Error("The Stripe Checkout Session does not match a Supabase order.");
  if (amountInFils(order.total_kwd) !== session.amount_total) {
    throw new Error("The paid Stripe amount does not match the Supabase order total.");
  }

  if (order.order_status !== "paid") {
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
    const { data: updated, error } = await getSupabaseAdminClient()
      .from("orders")
      .update({
        order_status: "paid",
        stripe_payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("stripe_checkout_session_id", session.id)
      .in("order_status", ["pending_payment", "payment_failed", "cancelled"])
      .select("id")
      .maybeSingle();
    if (error || !updated) {
      const { data: refreshed } = await getSupabaseAdminClient()
        .from("orders")
        .select("order_status")
        .eq("id", order.id)
        .maybeSingle();
      if (refreshed?.order_status !== "paid") {
        throw new Error("Unable to confirm the paid Supabase order.");
      }
    }
    await clearPurchasedCartItems(order.id, order.user_id);
  }

  return { orderId: order.id, userId: order.user_id };
}

export async function confirmStripeCheckout(
  userId: string,
  sessionId: string,
): Promise<{ status: "paid"; order: StripeCheckoutOrder }> {
  if (!isStripeCheckoutReady()) throw new Error("Stripe checkout is temporarily unavailable.");
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const order = await findOrderForSession(session, userId);
  if (!order) throw new Error("This checkout session does not belong to your account.");
  if (session.status !== "complete" || session.payment_status !== "paid") {
    throw new Error("Your payment is not complete yet.");
  }

  const confirmed = await markSessionPaid(session);
  return { status: "paid", order: await fetchOrder(confirmed.orderId, confirmed.userId) };
}

export async function cancelStripeCheckout(
  userId: string,
  sessionId: string,
): Promise<StripeCheckoutCancelResponse> {
  if (!isStripeCheckoutReady()) throw new Error("Stripe checkout is temporarily unavailable.");
  const stripe = await getUncachableStripeClient();
  let session = await stripe.checkout.sessions.retrieve(sessionId);
  const order = await findOrderForSession(session, userId);
  if (!order) throw new Error("This checkout session does not belong to your account.");

  if (session.payment_status === "paid" && session.status === "complete") {
    const confirmed = await markSessionPaid(session);
    return {
      status: "paid",
      order: await fetchOrder(confirmed.orderId, confirmed.userId),
    };
  }

  if (session.status === "open") {
    session = await stripe.checkout.sessions.expire(session.id);
  }
  const { error } = await getSupabaseAdminClient()
    .from("orders")
    .update({ order_status: "cancelled" })
    .eq("id", order.id)
    .eq("user_id", userId)
    .eq("order_status", "pending_payment");
  if (error) throw new Error("Unable to save the checkout cancellation.");
  return { status: "cancelled" };
}

export async function handleStripeCheckoutEvent(event: Stripe.Event): Promise<void> {
  if (
    event.type !== "checkout.session.completed"
    && event.type !== "checkout.session.async_payment_succeeded"
    && event.type !== "checkout.session.async_payment_failed"
    && event.type !== "checkout.session.expired"
  ) {
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (!session.metadata?.reelroom_order_id) return;

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    if (session.payment_status === "paid") await markSessionPaid(session);
    return;
  }

  const order = await findOrderForSession(session);
  if (!order || order.order_status !== "pending_payment") return;
  const nextStatus = event.type === "checkout.session.expired" ? "cancelled" : "payment_failed";
  const { error } = await getSupabaseAdminClient()
    .from("orders")
    .update({ order_status: nextStatus })
    .eq("id", order.id)
    .eq("stripe_checkout_session_id", session.id)
    .eq("order_status", "pending_payment");
  if (error) throw new Error("Unable to update the Supabase order from the Stripe event.");
}
