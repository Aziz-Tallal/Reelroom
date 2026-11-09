import Stripe from "stripe";
import { runMigrations, StripeSync } from "stripe-replit-sync";
import { logger } from "./logger";

type StripeCredentials = {
  secretKey: string;
  webhookSecret?: string;
};

let managedWebhookSecret: string | undefined;
let checkoutReady = false;

async function getStripeCredentials(): Promise<StripeCredentials> {
  const configuredSecret = process.env.STRIPE_SECRET_KEY?.trim();
  if (configuredSecret) {
    if (!configuredSecret.startsWith("sk_test_") && !configuredSecret.startsWith("rk_test_")) {
      throw new Error("REELROOM checkout is test-mode only. Add a Stripe test secret key.");
    }
    return {
      secretKey: configuredSecret,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const replitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !replitToken) {
    throw new Error("The Replit Stripe integration is not available to this service.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: replitToken,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to retrieve Stripe connection settings (${response.status}).`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      settings?: {
        secret_key?: string;
        webhook_secret?: string;
      };
    }>;
  };
  const settings = data.items?.[0]?.settings;
  const secretKey = settings?.secret_key?.trim();

  if (!secretKey) {
    throw new Error("Add a Stripe test secret key in Replit Secrets before enabling checkout.");
  }
  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("rk_test_")) {
    throw new Error("REELROOM checkout is test-mode only. Connect a Stripe test key.");
  }

  return {
    secretKey,
    webhookSecret: settings?.webhook_secret?.trim() || undefined,
  };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync(): Promise<StripeSync> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("The Stripe sync database is not configured.");
  }

  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 5 },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: managedWebhookSecret ?? webhookSecret ?? "",
    logger,
  });
}

export function isStripeCheckoutReady(): boolean {
  return checkoutReady;
}

export async function initializeStripeCheckout(): Promise<void> {
  checkoutReady = false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("The Stripe sync database is not configured.");
  }

  const credentials = await getStripeCredentials();
  await runMigrations({ databaseUrl });

  const sync = await getStripeSync();
  try {
    const domain = (process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN)
      ?.trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");
    if (!domain) {
      throw new Error("A Replit app domain is required to configure the Stripe webhook.");
    }

    const webhook = await sync.findOrCreateManagedWebhook(
      `https://${domain}/api/stripe/webhook`,
      {
        enabled_events: ["*"],
        description: "REELROOM Stripe test checkout",
      },
    );
    managedWebhookSecret = webhook.secret || credentials.webhookSecret;

    checkoutReady = true;
    logger.info({ webhookId: webhook.id }, "Stripe test checkout is ready");

    void sync.syncBackfill({ object: "all" })
      .catch((error: unknown) => {
        logger.warn({ err: error }, "Stripe data backfill did not complete");
      })
      .finally(() => sync.postgresClient.pool.end().catch((error: unknown) => {
        logger.warn({ err: error }, "Stripe sync database connection did not close cleanly");
      }));
  } catch (error) {
    await sync.postgresClient.pool.end().catch(() => undefined);
    throw error;
  }
}
