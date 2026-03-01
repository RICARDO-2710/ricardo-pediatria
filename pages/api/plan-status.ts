import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function mapStripeStatusToPlan(status: string | null | undefined): "Ativo" | "Cancelado" {
  const normalized = (status || "").toLowerCase();
  if (["active", "trialing", "past_due", "unpaid"].includes(normalized)) {
    return "Ativo";
  }
  return "Cancelado";
}

async function getPlanStatusFromStripe(email: string): Promise<"Ativo" | "Cancelado" | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });

  const customers = await stripe.customers.list({ email, limit: 10 });

  let hasAnySubscription = false;
  for (const customer of customers.data) {
    if (!customer || ("deleted" in customer && customer.deleted)) continue;

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });

    if (subscriptions.data.length > 0) {
      hasAnySubscription = true;
    }

    const hasActive = subscriptions.data.some((sub) =>
      ["active", "trialing", "past_due", "unpaid"].includes((sub.status || "").toLowerCase())
    );

    if (hasActive) return "Ativo";
  }

  return hasAnySubscription ? "Cancelado" : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body as { email?: string };
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ error: "Email é obrigatório." });
  }

  const supabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      : null;

  try {
    if (supabase) {
      const profileQuery = await supabase
        .from("profiles")
        .select("plan_status, subscription_status")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!profileQuery.error && profileQuery.data) {
        const rawPlan = (profileQuery.data as any).plan_status as string | null | undefined;
        const rawSubscription = (profileQuery.data as any).subscription_status as string | null | undefined;

        const normalizedPlan = (rawPlan || "").toLowerCase();

        if (["ativo", "premium", "active"].includes(normalizedPlan)) {
          return res.status(200).json({ status: "Ativo" });
        }
        if (["cancelado", "canceled", "inativo"].includes(normalizedPlan)) {
          return res.status(200).json({ status: "Cancelado" });
        }

        const mapped = mapStripeStatusToPlan(rawSubscription);
        if (mapped === "Ativo") {
          return res.status(200).json({ status: "Ativo" });
        }
      }

      const subscriptionQuery = await supabase
        .from("subscriptions")
        .select("status")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subscriptionQuery.error && subscriptionQuery.data) {
        const mapped = mapStripeStatusToPlan(
          (subscriptionQuery.data as any).status as string | null | undefined
        );
        if (mapped === "Ativo") {
          return res.status(200).json({ status: "Ativo" });
        }
      }
    }

    const stripeStatus = await getPlanStatusFromStripe(normalizedEmail);
    if (stripeStatus) {
      return res.status(200).json({ status: stripeStatus });
    }

    return res.status(200).json({ status: "Cancelado" });
  } catch (err: any) {
    console.error("plan-status error", err);
    res.status(500).json({ error: err.message || "internal" });
  }
}
