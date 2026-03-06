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
  activeSince: string | null;
  stripeStatus: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  canceledAt: string | null;
  source: "stripe" | "supabase";
};

const ACTIVE_STATUSES = ["active", "trialing", "past_due", "unpaid"];

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

function buildFromStripeSubscription(sub: Stripe.Subscription): PlanStatusPayload {
  const raw = sub as unknown as Record<string, unknown>;
  const stripeStatus = String(sub.status || "").toLowerCase() || null;
  const currentPeriodEnd = normalizeDateValue(raw["current_period_end"]);
  const currentPeriodStart = normalizeDateValue(raw["current_period_start"]);
  const startDate = normalizeDateValue(raw["start_date"]);
  const cancelAt = normalizeDateValue(raw["cancel_at"]);
  const canceledAt = normalizeDateValue(raw["canceled_at"]);
  const cancelAtPeriodEnd = Boolean(raw["cancel_at_period_end"]);

  return {
    status: mapStripeStatusToPlan(stripeStatus),
    renewalDate: currentPeriodEnd,
    activeSince: startDate || currentPeriodStart,
    stripeStatus,
    cancelAtPeriodEnd,
    cancelAt,
    canceledAt,
    source: "stripe",
  };
}

function toSupabasePayload(params: {
  planStatus: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  renewalDate: string | null;
  activeSince?: string | null;
  cancelAt?: string | null;
  canceledAt?: string | null;
  cancelAtPeriodEnd?: boolean;
}): PlanStatusPayload {
  const normalizedPlan = (params.planStatus || "").toLowerCase();
  const byPlan = ["ativo", "premium", "active"].includes(normalizedPlan)
    ? "Ativo"
    : ["cancelado", "canceled", "inativo"].includes(normalizedPlan)
      ? "Cancelado"
      : mapStripeStatusToPlan(params.subscriptionStatus);

  return {
    status: byPlan,
    renewalDate: byPlan === "Ativo" ? params.renewalDate : null,
    activeSince: params.activeSince || null,
    stripeStatus: params.subscriptionStatus ? String(params.subscriptionStatus).toLowerCase() : null,
    cancelAtPeriodEnd: Boolean(params.cancelAtPeriodEnd),
    cancelAt: params.cancelAt || null,
    canceledAt: params.canceledAt || null,
    source: "supabase",
  };
}

async function getPlanStatusFromStripe(email: string): Promise<PlanStatusPayload | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });

  const customers = await stripe.customers.list({ email, limit: 10 });

  const allSubscriptions: Stripe.Subscription[] = [];

  for (const customer of customers.data) {
    if (!customer || ("deleted" in customer && customer.deleted)) continue;

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });

    allSubscriptions.push(...subscriptions.data);
  }

  if (allSubscriptions.length === 0) return null;

  const activeSubs = allSubscriptions.filter((sub) =>
    ACTIVE_STATUSES.includes(String(sub.status || "").toLowerCase())
  );

  const target =
    (activeSubs.length > 0 ? activeSubs : allSubscriptions)
      .slice()
      .sort((a, b) => Number((b as any).created || 0) - Number((a as any).created || 0))[0] || null;

  if (!target) return null;
  return buildFromStripeSubscription(target);
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
    let supabasePayload: PlanStatusPayload | null = null;

    if (supabase) {
      const profileQuery = await supabase
        .from("profiles")
        .select("plan_status, subscription_status, current_period_end, subscription_current_period_end, started_at, cancel_at, canceled_at, cancel_at_period_end")
        .eq("email", normalizedEmail)
        .maybeSingle();

      const profileColumnMissing =
        !!profileQuery.error && /current_period_end|subscription_current_period_end|started_at|cancel_at|canceled_at|cancel_at_period_end/i.test(String(profileQuery.error.message || ""));

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
        const activeSinceFromProfile = normalizeDateValue((profileData as any).started_at);
        const cancelAtFromProfile = normalizeDateValue((profileData as any).cancel_at);
        const canceledAtFromProfile = normalizeDateValue((profileData as any).canceled_at);

        supabasePayload = toSupabasePayload({
          planStatus: rawPlan,
          subscriptionStatus: rawSubscription,
          renewalDate: renewalDateFromProfile,
          activeSince: activeSinceFromProfile,
          cancelAt: cancelAtFromProfile,
          canceledAt: canceledAtFromProfile,
          cancelAtPeriodEnd: Boolean((profileData as any).cancel_at_period_end),
        });
      }

      let subscriptionQuery = await supabase
        .from("subscriptions")
        .select("status, current_period_end, subscription_current_period_end, started_at, cancel_at, canceled_at, cancel_at_period_end")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (
        subscriptionQuery.error &&
        /current_period_end|subscription_current_period_end|started_at|cancel_at|canceled_at|cancel_at_period_end/i.test(String(subscriptionQuery.error.message || ""))
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
        const renewalDateFromSub =
          normalizeDateValue((subscriptionQuery.data as any).subscription_current_period_end) ||
          normalizeDateValue((subscriptionQuery.data as any).current_period_end);
        const fromSubscriptions = toSupabasePayload({
          planStatus: null,
          subscriptionStatus: (subscriptionQuery.data as any).status as string | null | undefined,
          renewalDate: renewalDateFromSub,
          activeSince: normalizeDateValue((subscriptionQuery.data as any).started_at),
          cancelAt: normalizeDateValue((subscriptionQuery.data as any).cancel_at),
          canceledAt: normalizeDateValue((subscriptionQuery.data as any).canceled_at),
          cancelAtPeriodEnd: Boolean((subscriptionQuery.data as any).cancel_at_period_end),
        });

        if (!supabasePayload || fromSubscriptions.status === "Ativo") {
          supabasePayload = fromSubscriptions;
        }
      }
    }

    const stripeStatus = await getPlanStatusFromStripe(normalizedEmail);
    if (stripeStatus) {
      return res.status(200).json(stripeStatus);
    }

    if (supabasePayload) {
      return res.status(200).json(supabasePayload);
    }

    return res.status(200).json({
      status: "Cancelado",
      renewalDate: null,
      activeSince: null,
      stripeStatus: null,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      canceledAt: null,
      source: "supabase",
    } as PlanStatusPayload);
  } catch (err: any) {
    console.error("plan-status error", err);
    res.status(500).json({ error: err.message || "internal" });
  }
}
