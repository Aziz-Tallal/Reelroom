import { Router, type IRouter, type Request, type Response } from "express";
import {
  CancelStripeCheckoutBody,
  CancelStripeCheckoutResponse,
  ConfirmStripeCheckoutBody,
  ConfirmStripeCheckoutResponse,
  CreateStripeCheckoutSessionBody,
  CreateStripeCheckoutSessionResponse,
  QuoteStripeCheckoutBody,
  QuoteStripeCheckoutResponse,
} from "@workspace/api-zod";
import { cancelStripeCheckout, confirmStripeCheckout, createStripeCheckout, quoteStripeCheckout } from "../lib/stripeCheckout";
import { getSupabaseUser } from "../lib/supabaseAdmin";

const router: IRouter = Router();

async function authenticateRequest(
  req: Request,
  res: Response,
): Promise<{ id: string; email?: string } | null> {
  const authorization = req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Sign in to continue to checkout." });
    return null;
  }

  try {
    const user = await getSupabaseUser(token);
    if (!user) {
      res.status(401).json({ error: "Your sign-in has expired. Please sign in again." });
      return null;
    }
    return { id: user.id, email: user.email };
  } catch (error) {
    req.log.error({ err: error }, "Supabase checkout authentication is unavailable");
    res.status(503).json({ error: "Checkout is temporarily unavailable." });
    return null;
  }
}

router.post("/stripe/checkout/quote", async (req, res) => {
  const parsed = QuoteStripeCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please review your cart options." });
    return;
  }

  const user = await authenticateRequest(req, res);
  if (!user) return;

  try {
    const result = await quoteStripeCheckout(parsed.data.items);
    res.json(QuoteStripeCheckoutResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Stripe checkout price quote failed");
    const response = clientCheckoutError(error);
    res.status(response.status).json({ error: response.message });
  }
});

function clientCheckoutError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "";
  if (/invalid currency:\s*kwd|process transactions in kwd/i.test(message)) {
    return {
      status: 409,
      message: "This Stripe account does not support KWD yet. Enable KWD in Stripe or choose a supported checkout currency.",
    };
  }
  if (/not complete yet/i.test(message)) {
    return { status: 409, message: "Your payment is still processing. Please try again shortly." };
  }
  if (/temporarily unavailable|not configured|unable to (verify|load|save)|checkout is unavailable/i.test(message)) {
    return { status: 503, message: "Stripe checkout is temporarily unavailable. Please try again later." };
  }
  if (/unavailable|duplicate|invalid|not allowed|return address|selected options|KWD price|catalog total|delivery address|contact details|cart quantities|does not belong/i.test(message)) {
    return { status: 400, message };
  }
  return { status: 503, message: "Stripe checkout is temporarily unavailable. Please try again later." };
}

router.post("/stripe/checkout/session", async (req, res) => {
  const parsed = CreateStripeCheckoutSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please review your cart and contact details." });
    return;
  }

  const user = await authenticateRequest(req, res);
  if (!user) return;

  try {
    const result = await createStripeCheckout(user.id, parsed.data, req.header("origin"));
    res.json(CreateStripeCheckoutSessionResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Stripe Checkout Session creation failed");
    const response = clientCheckoutError(error);
    res.status(response.status).json({ error: response.message });
  }
});

router.post("/stripe/checkout/confirm", async (req, res) => {
  const parsed = ConfirmStripeCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "The checkout session could not be verified." });
    return;
  }

  const user = await authenticateRequest(req, res);
  if (!user) return;

  try {
    const result = await confirmStripeCheckout(user.id, parsed.data.sessionId);
    res.json(ConfirmStripeCheckoutResponse.parse(result));
  } catch (error) {
    req.log.warn({ err: error }, "Stripe checkout confirmation was not successful");
    const response = clientCheckoutError(error);
    res.status(response.status).json({ error: response.message });
  }
});

router.post("/stripe/checkout/cancel", async (req, res) => {
  const parsed = CancelStripeCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "The checkout session could not be cancelled." });
    return;
  }

  const user = await authenticateRequest(req, res);
  if (!user) return;

  try {
    const result = await cancelStripeCheckout(user.id, parsed.data.sessionId);
    res.json(CancelStripeCheckoutResponse.parse(result));
  } catch (error) {
    req.log.warn({ err: error }, "Stripe checkout cancellation was not successful");
    const response = clientCheckoutError(error);
    res.status(response.status).json({ error: response.message });
  }
});

export default router;
