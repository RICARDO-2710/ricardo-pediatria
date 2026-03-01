// pages/api/cancel-subscription.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { subscriptionId, email } = req.body as { subscriptionId?: string; email?: string };
  const supabase = getSupabaseAdmin();

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY não configurada." });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });

    const normalizedEmail = email?.toLowerCase().trim();

    if (!subscriptionId) {
      if (!normalizedEmail) {
        return res.status(400).json({ error: "Informe subscriptionId ou email para cancelar." });
      }

      const customers = await stripe.customers.list({ email: normalizedEmail, limit: 10 });
      const canceledIds: string[] = [];

      for (const customer of customers.data) {
        if ("deleted" in customer && customer.deleted) continue;

        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 50,
        });

        for (const sub of subscriptions.data) {
          const status = (sub.status || "").toLowerCase();
          if (["canceled", "incomplete_expired"].includes(status)) continue;

          await stripe.subscriptions.cancel(sub.id);
          canceledIds.push(sub.id);
        }
      }

      if (supabase) {
        await supabase
          .from("profiles")
          .update({ plan_status: "Cancelado", subscription_status: "canceled" })
          .eq("email", normalizedEmail);
      }

      return res.status(200).json({
        success: true,
        canceled: true,
        canceledIds,
        message:
          canceledIds.length > 0
            ? "Assinaturas canceladas no Stripe com sucesso."
            : "Nenhuma assinatura ativa encontrada para este e-mail.",
      });
    }

    await stripe.subscriptions.cancel(subscriptionId);

    if (normalizedEmail) {
      if (supabase) {
        await supabase
          .from("profiles")
          .update({ plan_status: "Cancelado", subscription_status: "canceled" })
          .eq("email", normalizedEmail);
      }
    }

    res.status(200).json({ success: true, canceled: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}