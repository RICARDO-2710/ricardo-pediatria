import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function resolveBaseUrl(req: NextApiRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      return null;
    }
  }

  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwardedHost || String(req.headers.host || "").trim();
  if (!host) return null;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

function parseAmount(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().replace(",", ".") : value;
  const amount = typeof normalized === "number" ? normalized : Number(normalized);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100_000) return null;
  const cents = Math.round(amount * 100);
  if (Math.abs(cents / 100 - amount) > 0.000001) return null;
  return cents;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecret) {
    return res.status(503).json({ error: "Stripe não está configurado no servidor." });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return res.status(401).json({ error: "Sessão inválida. Entre novamente na conta do pediatra." });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user?.email) {
    return res.status(401).json({ error: "Sessão expirada. Entre novamente na conta do pediatra." });
  }

  const { amount, description, customerEmail } = (req.body || {}) as {
    amount?: string | number;
    description?: string;
    customerEmail?: string;
  };
  const unitAmount = parseAmount(amount);
  if (unitAmount === null) {
    return res.status(400).json({ error: "Informe um valor entre R$ 1,00 e R$ 100.000,00, com até duas casas decimais." });
  }

  const normalizedDescription = String(description || "").trim().slice(0, 120);
  const normalizedCustomerEmail = String(customerEmail || "").trim().toLowerCase();
  if (normalizedCustomerEmail && !isValidEmail(normalizedCustomerEmail)) {
    return res.status(400).json({ error: "E-mail do pagador inválido." });
  }

  const baseUrl = resolveBaseUrl(req);
  if (!baseUrl) {
    return res.status(500).json({ error: "Não foi possível identificar o endereço deste app." });
  }

  try {
    const stripe = new Stripe(stripeSecret, { apiVersion: "2026-02-25.clover" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      ...(normalizedCustomerEmail ? { customer_email: normalizedCustomerEmail } : {}),
      line_items: [{
        price_data: {
          currency: "brl",
          unit_amount: unitAmount,
          product_data: {
            name: normalizedDescription || "Pagamento de serviço profissional",
          },
        },
        quantity: 1,
      }],
      metadata: {
        doctor_email: authData.user.email.trim().toLowerCase(),
        source: "doctor_custom_payment",
      },
      payment_intent_data: {
        metadata: {
          doctor_email: authData.user.email.trim().toLowerCase(),
          source: "doctor_custom_payment",
        },
      },
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=canceled`,
    });

    if (!session.url) {
      return res.status(502).json({ error: "O Stripe não retornou um link de pagamento." });
    }

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe custom payment creation failed", error?.message || "unknown error");
    return res.status(502).json({ error: "Não foi possível criar o link no Stripe. Confira a configuração da conta e tente novamente." });
  }
}
