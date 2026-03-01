import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Desative o body parser para poder verificar a assinatura do Stripe
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey);
}

function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(bufferChunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function toAppPlanStatus(stripeStatus: string | null | undefined): "Ativo" | "Cancelado" {
  const normalized = (stripeStatus || "").toLowerCase();
  if (["active", "trialing", "past_due", "unpaid"].includes(normalized)) {
    return "Ativo";
  }
  return "Cancelado";
}

async function updateDoctorPlanByEmail(params: {
  email: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeStatus?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Webhook sem SUPABASE_SERVICE_ROLE_KEY: atualização de plano ignorada.");
    return;
  }

  const normalizedEmail = params.email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const appPlanStatus = toAppPlanStatus(params.stripeStatus);

  const profilePayload: Record<string, string> = {
    plan_status: appPlanStatus,
  };

  if (params.stripeStatus) {
    profilePayload.subscription_status = params.stripeStatus;
  }
  if (params.stripeCustomerId) {
    profilePayload.stripe_customer_id = params.stripeCustomerId;
  }
  if (params.stripeSubscriptionId) {
    profilePayload.stripe_subscription_id = params.stripeSubscriptionId;
  }

  const profileUpdate = await supabase
    .from("profiles")
    .update(profilePayload)
    .eq("email", normalizedEmail);

  if (profileUpdate.error) {
    console.error("Erro ao atualizar profiles no webhook:", profileUpdate.error.message);
  }

  const subscriptionsPayload: Record<string, string> = {
    email: normalizedEmail,
    status: params.stripeStatus || "canceled",
  };
  if (params.stripeCustomerId) {
    subscriptionsPayload.stripe_customer_id = params.stripeCustomerId;
  }
  if (params.stripeSubscriptionId) {
    subscriptionsPayload.stripe_subscription_id = params.stripeSubscriptionId;
  }

  const subscriptionUpsert = await supabase
    .from("subscriptions")
    .upsert(subscriptionsPayload, { onConflict: "email" });

  if (subscriptionUpsert.error) {
    console.warn("Tabela subscriptions não atualizada:", subscriptionUpsert.error.message);
  }
}

async function getCustomerEmail(customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !("deleted" in customer) && customer.email) {
      return customer.email;
    }
  } catch (error) {
    console.error("Erro ao buscar e-mail do customer no Stripe:", error);
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) return res.status(400).send("Missing Stripe signature header");

  const buf = await getRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buf.toString(),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err?.message || err);
    return res.status(400).send(`Webhook Error: ${err?.message || String(err)}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id || null;
      const stripeCustomerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || null;

      const emailFromSession =
        session.customer_details?.email ||
        session.customer_email ||
        session.metadata?.email ||
        (await getCustomerEmail(stripeCustomerId));

      if (emailFromSession) {
        await updateDoctorPlanByEmail({
          email: emailFromSession,
          stripeCustomerId,
          stripeSubscriptionId: subscriptionId,
          stripeStatus: "active",
        });
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || null;
      const email =
        subscription.metadata?.email ||
        (await getCustomerEmail(stripeCustomerId));

      if (email) {
        await updateDoctorPlanByEmail({
          email,
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeStatus: subscription.status,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || null;
      const email =
        subscription.metadata?.email ||
        (await getCustomerEmail(stripeCustomerId));

      if (email) {
        await updateDoctorPlanByEmail({
          email,
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeStatus: "canceled",
        });
      }
    }
  } catch (err) {
    console.error("Error handling webhook event:", err);
    // mesmo com erro interno, retorne 200 para evitar replays massivos; ajuste conforme sua política
    return res.status(500).send("Internal handler error");
  }

  res.status(200).json({ received: true });
}
