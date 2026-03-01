import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type DoctorItem = {
  email: string;
  name: string;
};

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] || email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
    return res.status(200).json({ doctors: [] });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey || "");

  try {
    let data: any[] | null = null;

    const fullQuery = await supabase
      .from("profiles")
      .select("email, plan_status, subscription_status, doctor_name, full_name, name")
      .limit(1000);

    if (!fullQuery.error) {
      data = (fullQuery.data as any[]) ?? [];
    } else {
      const fallbackQuery = await supabase
        .from("profiles")
        .select("email, plan_status, subscription_status")
        .limit(1000);

      if (fallbackQuery.error) {
        return res.status(200).json({ doctors: [] });
      }

      data = (fallbackQuery.data as any[]) ?? [];
    }

    const doctorsMap = new Map<string, DoctorItem>();
    const activeStatusSet = new Set([
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "ativo",
      "premium",
    ]);

    for (const row of data) {
      const email = String(row?.email ?? "").trim().toLowerCase();
      if (!email) continue;

      const normalizedPlan = String(row?.plan_status ?? "").toLowerCase();
      const normalizedSubscription = String(row?.subscription_status ?? "").toLowerCase();

      const isActive =
        activeStatusSet.has(normalizedPlan) || activeStatusSet.has(normalizedSubscription);

      if (!isActive) continue;

      const name =
        String(row?.doctor_name ?? "").trim() ||
        String(row?.full_name ?? "").trim() ||
        String(row?.name ?? "").trim() ||
        displayNameFromEmail(email);

      doctorsMap.set(email, { email, name });
    }

    const subscriptionsQuery = await supabase
      .from("subscriptions")
      .select("email, status")
      .limit(2000);

    if (!subscriptionsQuery.error) {
      for (const row of subscriptionsQuery.data ?? []) {
        const email = String((row as any)?.email ?? "").trim().toLowerCase();
        const status = String((row as any)?.status ?? "").toLowerCase();
        if (!email || !activeStatusSet.has(status)) continue;
        if (doctorsMap.has(email)) continue;

        doctorsMap.set(email, {
          email,
          name: displayNameFromEmail(email),
        });
      }
    }

    const availabilityQuery = await supabase
      .from("doctor_availability")
      .select("doctor_email,is_active")
      .limit(5000);

    if (!availabilityQuery.error) {
      for (const row of availabilityQuery.data ?? []) {
        const email = String((row as any)?.doctor_email ?? "").trim().toLowerCase();
        if (!email) continue;
        if (doctorsMap.has(email)) continue;

        doctorsMap.set(email, {
          email,
          name: displayNameFromEmail(email),
        });
      }
    }

    const appointmentsQuery = await supabase
      .from("appointments")
      .select("doctor_email,doctor_name")
      .limit(5000);

    if (!appointmentsQuery.error) {
      for (const row of appointmentsQuery.data ?? []) {
        const email = String((row as any)?.doctor_email ?? "").trim().toLowerCase();
        if (!email) continue;
        if (doctorsMap.has(email)) continue;

        const name = String((row as any)?.doctor_name ?? "").trim() || displayNameFromEmail(email);

        doctorsMap.set(email, {
          email,
          name,
        });
      }
    }

    const doctors = Array.from(doctorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({ doctors });
  } catch (err: any) {
    console.error("doctors api error", err);
    return res.status(200).json({ doctors: [] });
  }
}
