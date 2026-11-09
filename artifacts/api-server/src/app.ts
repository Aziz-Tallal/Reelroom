import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { handleStripeCheckoutEvent } from "./lib/stripeCheckout";
import { WebhookHandlers } from "./lib/webhookHandlers";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.header("stripe-signature");
    if (!Buffer.isBuffer(req.body) || !signature) {
      res.status(400).send("Invalid Stripe webhook request.");
      return;
    }

    try {
      const event = await WebhookHandlers.processWebhook(req.body, signature);
      await handleStripeCheckoutEvent(event);
      res.sendStatus(200);
    } catch (error) {
      req.log.error({ err: error }, "Stripe webhook processing failed");
      const invalidSignature = error instanceof Error && /signature/i.test(error.message);
      res.status(invalidSignature ? 400 : 500).send("Stripe webhook processing failed.");
    }
  },
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
