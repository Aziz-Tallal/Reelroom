import type Stripe from "stripe";
import { getStripeSync } from "./stripeClient";

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string | undefined,
  ): Promise<Stripe.Event> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error("Stripe webhook payload must be a raw request buffer.");
    }
    if (!signature) {
      throw new Error("Stripe webhook signature is missing.");
    }

    const sync = await getStripeSync();
    try {
      await sync.processWebhook(payload, signature);
      return JSON.parse(payload.toString("utf8")) as Stripe.Event;
    } finally {
      await sync.postgresClient.pool.end();
    }
  }
}
