// pages/api/checkout-session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const PROFESSIONAL_PRICE_ID = process.env.STRIPE_PRICE_PROFESSIONAL?.trim();
const PROFESSIONAL_PRODUCT_ID = process.env.STRIPE_PRODUCT_PROFESSIONAL?.trim();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, promoCode } = req.body as { email?: string; promoCode?: string };

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY não configurada." });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });

    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório." });
    }

    let resolvedPriceId = PROFESSIONAL_PRICE_ID;

    if (!resolvedPriceId && PROFESSIONAL_PRODUCT_ID) {
      const prices = await stripe.prices.list({
        product: PROFESSIONAL_PRODUCT_ID,
        active: true,
        type: "recurring",
        limit: 1,
      });
      resolvedPriceId = prices.data[0]?.id;
    }

    if (!resolvedPriceId) {
      return res.status(500).json({
        error:
          "Defina STRIPE_PRICE_PROFESSIONAL (price_...) ou STRIPE_PRODUCT_PROFESSIONAL (prod_...) com preço recorrente ativo.",
      });
    }

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      metadata: {
        email: email.toLowerCase(),
        source: "doctor_checkout",
      },
      subscription_data: {
        metadata: {
          email: email.toLowerCase(),
          source: "doctor_checkout",
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?canceled=true`,
    };

    const normalizedPromoCode = (promoCode || "").trim();
    if (normalizedPromoCode) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: normalizedPromoCode,
          active: true,
          limit: 1,
        });

        const promotionCodeId = promotionCodes.data[0]?.id;
        if (promotionCodeId) {
          checkoutParams.discounts = [{ promotion_code: promotionCodeId }];
        } else {
          const coupon = await stripe.coupons.retrieve(normalizedPromoCode);
          if (coupon && !(coupon as any).deleted && coupon.valid) {
            checkoutParams.discounts = [{ coupon: coupon.id }];
          } else {
            return res.status(400).json({ error: `Cupom inválido ou inativo: ${normalizedPromoCode}` });
          }
        }
      } catch {
        return res.status(400).json({ error: `Cupom inválido ou inativo: ${normalizedPromoCode}` });
      }
    }

    if (!checkoutParams.discounts || checkoutParams.discounts.length === 0) {
      checkoutParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(checkoutParams);
    res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}