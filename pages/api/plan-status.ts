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

type PlanStatusPayload = {
  status: "Ativo" | "Cancelado";
  renewalDate: string | null;
};

function normalizeDateValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  if (typeof value === "number") {
    if (value > 9999999999) {
      return new Date(value).toISOString();
    }
    return new Date(value * 1000).toISOString();
  }
  return null;
}

async function getPlanStatusFromStripe(email: string): Promise<PlanStatusPayload | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });

  const customers = await stripe.customers.list({ email, limit: 10 });

  let hasAnySubscription = false;
  let bestRenewalDate: string | null = null;
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

    const activeSubs = subscriptions.data.filter((sub) =>
      ["active", "trialing", "past_due", "unpaid"].includes((sub.status || "").toLowerCase())
    );

    for (const sub of activeSubs) {
      const maybeSub = sub as unknown as Record<string, unknown>;
      const iso = normalizeDateValue(maybeSub["current_period_end"]);
      if (iso && (!bestRenewalDate || new Date(iso).getTime() > new Date(bestRenewalDate).getTime())) {
        bestRenewalDate = iso;
      }
    }

    if (activeSubs.length > 0) {
      return { status: "Ativo", renewalDate: bestRenewalDate };
    }
  }

  return hasAnySubscription ? { status: "Cancelado", renewalDate: null } : null;
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
        .select("plan_status, subscription_status, current_period_end, subscription_current_period_end")
        .eq("email", normalizedEmail)
        .maybeSingle();

      const profileColumnMissing =
        !!profileQuery.error && /current_period_end|subscription_current_period_end/i.test(String(profileQuery.error.message || ""));

      const profileData = profileColumnMissing
        ? (
            await supabase
              .from("profiles")
              .select("plan_status, subscription_status")
              .eq("email", normalizedEmail)
              .maybeSingle()
          ).data
        : profileQuery.data;

      if (profileData) {
        const rawPlan = (profileData as any).plan_status as string | null | undefined;
        const rawSubscription = (profileData as any).subscription_status as string | null | undefined;
        const renewalDateFromProfile =
          normalizeDateValue((profileData as any).subscription_current_period_end) ||
          normalizeDateValue((profileData as any).current_period_end);

        const normalizedPlan = (rawPlan || "").toLowerCase();

        if (["ativo", "premium", "active"].includes(normalizedPlan)) {
          return res.status(200).json({ status: "Ativo", renewalDate: renewalDateFromProfile });
        }
        if (["cancelado", "canceled", "inativo"].includes(normalizedPlan)) {
          return res.status(200).json({ status: "Cancelado", renewalDate: null });
        }

        const mapped = mapStripeStatusToPlan(rawSubscription);
        if (mapped === "Ativo") {
          return res.status(200).json({ status: "Ativo", renewalDate: renewalDateFromProfile });
        }
      }

      let subscriptionQuery = await supabase
        .from("subscriptions")
        .select("status, current_period_end, subscription_current_period_end")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        subscriptionQuery.error &&
        /current_period_end|subscription_current_period_end/i.test(String(subscriptionQuery.error.message || ""))
      ) {
        subscriptionQuery = await supabase
          .from("subscriptions")
          .select("status")
          .eq("email", normalizedEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      if (!subscriptionQuery.error && subscriptionQuery.data) {
        const mapped = mapStripeStatusToPlan(
          (subscriptionQuery.data as any).status as string | null | undefined
        );
        if (mapped === "Ativo") {
          const renewalDateFromSub =
            normalizeDateValue((subscriptionQuery.data as any).subscription_current_period_end) ||
            normalizeDateValue((subscriptionQuery.data as any).current_period_end);
          return res.status(200).json({ status: "Ativo", renewalDate: renewalDateFromSub });
        }
      }
    }

    const stripeStatus = await getPlanStatusFromStripe(normalizedEmail);
    if (stripeStatus) {
      return res.status(200).json(stripeStatus);
    }

    return res.status(200).json({ status: "Cancelado", renewalDate: null });
  } catch (err: any) {
    console.error("plan-status error", err);
    res.status(500).json({ error: err.message || "internal" });
  }
}
