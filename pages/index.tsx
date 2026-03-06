"use client";

import * as React from "react";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
  UploadCloud,
  UserRound,
  Users,
  Lock,
  ClipboardList,
  Plus,
  Trash2,
  Baby,
  Phone,
  Settings,
  XCircle,
  CreditCard,
} from "lucide-react";

import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import jsPDF from "jspdf";

import { supabase } from "@/lib/supabaseClient";

const WHO_DATA = {
  height: {
    // Meses: [p5, p50, p95]
    M: { 0: [46.1, 49.9, 53.7], 6: [63.3, 67.6, 71.9], 12: [71.0, 75.7, 80.5], 24: [81.7, 87.1, 92.5] },
    F: { 0: [45.4, 49.1, 52.9], 6: [61.2, 65.7, 70.3], 12: [68.9, 74.0, 79.2], 24: [80.0, 85.7, 91.3] }
  },
  weight: {
    M: { 0: [2.5, 3.3, 4.3], 6: [6.4, 7.9, 9.8], 12: [7.8, 9.6, 12.0], 24: [9.7, 12.2, 15.3] },
    F: { 0: [2.4, 3.2, 4.2], 6: [5.8, 7.3, 9.2], 12: [7.1, 8.9, 11.3], 24: [9.0, 11.5, 14.8] }
  }
};

type GrowthCurveMetric = "weight" | "height" | "head";
type GrowthSexKey = "M" | "F";

const WHO_CURVE_TABLE: Record<
  GrowthCurveMetric,
  Record<GrowthSexKey, Record<number, { z3: number; z2: number; z1?: number; z0: number; zm1?: number; zm2: number; zm3: number }>>
> = {
  height: {
    M: {
      0: { z3: 56.0, z2: 54.0, z0: 50.0, zm2: 46.0, zm3: 44.0 },
      6: { z3: 73.0, z2: 71.0, z0: 66.0, zm2: 61.0, zm3: 59.0 },
      12: { z3: 82.0, z2: 79.0, z0: 75.0, zm2: 70.0, zm3: 67.0 },
      24: { z3: 97.0, z2: 94.0, z0: 88.0, zm2: 81.0, zm3: 78.0 },
    },
    F: {
      0: { z3: 55.0, z2: 53.0, z0: 49.0, zm2: 45.0, zm3: 43.0 },
      6: { z3: 71.5, z2: 69.5, z0: 64.5, zm2: 60.0, zm3: 58.0 },
      12: { z3: 80.5, z2: 78.0, z0: 73.8, zm2: 69.0, zm3: 66.5 },
      24: { z3: 95.0, z2: 92.0, z0: 86.5, zm2: 80.0, zm3: 77.0 },
    },
  },
  weight: {
    M: {
      0: { z3: 5.0, z2: 4.3, z0: 3.3, zm2: 2.4, zm3: 2.1 },
      6: { z3: 10.8, z2: 9.4, z0: 7.9, zm2: 6.1, zm3: 5.6 },
      12: { z3: 13.2, z2: 12.0, z0: 9.7, zm2: 7.5, zm3: 6.8 },
      24: { z3: 17.2, z2: 15.2, z0: 12.2, zm2: 9.7, zm3: 8.8 },
    },
    F: {
      0: { z3: 4.8, z2: 4.2, z0: 3.2, zm2: 2.4, zm3: 2.0 },
      6: { z3: 9.9, z2: 8.9, z0: 7.3, zm2: 5.8, zm3: 5.2 },
      12: { z3: 12.2, z2: 11.3, z0: 8.9, zm2: 7.1, zm3: 6.4 },
      24: { z3: 15.8, z2: 14.8, z0: 11.5, zm2: 9.0, zm3: 8.1 },
    },
  },
  head: {
    M: {
      0: { z3: 38.5, z2: 37.5, z1: 36.5, z0: 35.5, zm1: 34.5, zm2: 33.5, zm3: 31.0 },
      6: { z3: 47.0, z2: 46.0, z1: 45.0, z0: 44.0, zm1: 43.0, zm2: 42.0, zm3: 40.5 },
      12: { z3: 50.0, z2: 48.8, z1: 47.5, z0: 46.5, zm1: 45.5, zm2: 44.0, zm3: 42.5 },
      24: { z3: 52.5, z2: 51.0, z1: 49.5, z0: 48.5, zm1: 47.0, zm2: 45.6, zm3: 44.3 },
    },
    F: {
      0: { z3: 37.8, z2: 36.9, z1: 35.9, z0: 34.9, zm1: 33.9, zm2: 32.9, zm3: 30.4 },
      6: { z3: 46.0, z2: 45.0, z1: 44.0, z0: 43.0, zm1: 42.0, zm2: 41.0, zm3: 39.6 },
      12: { z3: 48.8, z2: 47.8, z1: 46.6, z0: 45.6, zm1: 44.6, zm2: 43.2, zm3: 41.8 },
      24: { z3: 51.0, z2: 49.8, z1: 48.4, z0: 47.2, zm1: 46.0, zm2: 44.8, zm3: 43.5 },
    },
  },
};

function interpolateWhoCurve(
  metric: GrowthCurveMetric,
  sex: GrowthSexKey,
  ageMonths: number,
  key: "z3" | "z2" | "z1" | "z0" | "zm1" | "zm2" | "zm3"
): number | null {
  const table = WHO_CURVE_TABLE[metric][sex] as Record<number, Record<string, number | undefined>>;
  if (ageMonths in table) {
    const value = table[ageMonths][key];
    return value == null ? null : value;
  }

  const ages = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const lower = ages.filter((age) => age < ageMonths).pop();
  const higher = ages.find((age) => age > ageMonths);

  if (lower == null && higher == null) return null;
  if (lower == null) {
    const value = table[higher!][key];
    return value == null ? null : value;
  }
  if (higher == null) {
    const value = table[lower][key];
    return value == null ? null : value;
  }

  const vLow = table[lower][key];
  const vHigh = table[higher][key];
  if (vLow == null || vHigh == null) return null;
  return vLow + ((vHigh - vLow) * (ageMonths - lower)) / (higher - lower);
}





/**
 * Ricardo B. Gurgel Pediatria — Web App
 *
 * ✅ Portal do Paciente:
 *    - Login (Supabase)
 *    - Meus filhos (salvo no Supabase / tabela children)
 *    - Marcar consulta ()
 *    - Dúvidas ()
 *    - Documentos / Informações ()
 *
 * ✅ Área do Pediatra:
 *    - Acesso liberado para qualquer médico com plano ativo
 *    - Aba Pacientes: lista de crianças reais do Supabase
 *    - Aba Gravar consulta: formulário (ainda não salva no banco)
 */

// ---------- Tipos ----------

type Role = "guardian" | "doctor";

type AppUser = {
  role: Role;
  email: string;
};

type Child = {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  sex: "M" | "F" | "O";
  guardianEmail?: string | null;
  guardianPhone?: string | null;
  pediatricianEmail?: string | null;
  pediatricianName?: string | null;
};



type ConsultationSummary = {
  id: string;
  dateISO: string;
  childName: string;
  conduta: string;
  orientacoes: string;
  retorno: string;
  exames: string;
  receitas: string;
  pdfUrl?: string | null;
  // biometria opcional
  weight?: string;
  height?: string;
  headCircumference?: string;
};


// ---------- Constantes ----------

const BRAND = {
  name: "Ricardo B. Gurgel Pediatria",
  subtitle: "Portal do paciente e área profissional",
  primary: "#0f172a",
  accent: "#1d4ed8",
};

type DoctorPdfSettings = {
  doctorName: string;
  specialty: string;
  registration: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  logoBase64: string;
};

function doctorPdfSettingsStorageKey(email: string) {
  return `rbgp_doctor_pdf_settings_${email.trim().toLowerCase()}`;
}

function getBaseDoctorPdfSettings(): DoctorPdfSettings {
  return {
    doctorName: DOCTOR_HEADER.doctorName,
    specialty: DOCTOR_HEADER.specialty,
    registration: DOCTOR_HEADER.registration,
    clinicName: DOCTOR_HEADER.clinicName,
    clinicAddress: DOCTOR_HEADER.clinicAddress,
    clinicPhone: DOCTOR_HEADER.clinicPhone,
    logoBase64: LOGO_BASE64,
  };
}

function getDoctorPdfSettings(email?: string | null): DoctorPdfSettings {
  const base = getBaseDoctorPdfSettings();
  if (!email || typeof window === "undefined") return base;

  try {
    const raw = localStorage.getItem(doctorPdfSettingsStorageKey(email));
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<DoctorPdfSettings>;
    return {
      ...base,
      ...parsed,
      doctorName: (parsed.doctorName ?? base.doctorName).trim(),
      registration: (parsed.registration ?? base.registration).trim(),
      clinicAddress: (parsed.clinicAddress ?? base.clinicAddress).trim(),
      clinicPhone: (parsed.clinicPhone ?? base.clinicPhone).trim(),
      logoBase64: (parsed.logoBase64 ?? base.logoBase64).trim(),
    };
  } catch {
    return base;
  }
}

function saveDoctorPdfSettings(email: string, settings: DoctorPdfSettings) {
  if (!email || typeof window === "undefined") return;
  localStorage.setItem(doctorPdfSettingsStorageKey(email), JSON.stringify(settings));
}

function getImageFormatFromBase64(dataUrl: string): "PNG" | "JPEG" {
  const value = (dataUrl || "").toLowerCase();
  if (value.startsWith("data:image/png")) return "PNG";
  return "JPEG";
}

// ---------- Utils ----------



function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateBR(dateStr: string) {
  if (!dateStr) return "";

  // Garante que estamos lidando só com "YYYY-MM-DD"
  const s = dateStr.slice(0, 10); // corta "2025-01-20T00:00:00Z" -> "2025-01-20"
  const [year, month, day] = s.split("-");

  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }

  // Se vier em outro formato inesperado, devolve como está
  return dateStr;
}

function calcAgeText(birthDateISO: string, refDateISO: string) {
  try {
    const b = new Date(birthDateISO);
    const r = new Date(refDateISO);

    let years = r.getFullYear() - b.getFullYear();
    let months = r.getMonth() - b.getMonth();
    let days = r.getDate() - b.getDate();

    if (days < 0) {
      months -= 1;
      days += 30; // aprox
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) years = 0;

    const parts: string[] = [];
    if (years > 0) parts.push(`${years}a`);
    parts.push(`${months}m`);
    parts.push(`${days}d`);
    return parts.join(" ");
  } catch {
    return "";
  }
}
async function handleCopyConsultPdfLink(pdfUrl: string) {
  try {
    await navigator.clipboard.writeText(pdfUrl);
    alert("Link do PDF da consulta copiado! Agora é só colar no WhatsApp.");
  } catch (err) {
    console.error(err);
    alert(
      "Não foi possível copiar automaticamente. Abra o link e compartilhe manualmente."
    );
  }
}
function storageKeyDiagnosis(childId: string) {
  return `rbgp_diag_${childId}`;
}

function daysUntil(iso: string) {
  try {
    const now = new Date();
    const target = new Date(iso);
    const diffMs = target.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60 * 24); // dias (pode ser fracionado)
  } catch {
    return Infinity;
  }
}

function handleSendWhatsAppReminder(
  childName: string,
  guardianPhone: string | null | undefined,
  startAtIso: string
) {
  if (typeof window === "undefined") return;

  if (!guardianPhone) {
    alert("Este paciente ainda não tem telefone de responsável cadastrado.");
    return;
  }

  // tenta limpar o número (só dígitos)
  const phoneDigits = guardianPhone.replace(/\D+/g, "");
  if (!phoneDigits) {
    alert("Número de telefone inválido para este paciente.");
    return;
  }

  const dateStr = new Date(startAtIso).toLocaleString("pt-BR", {
    timeZone: "America/Recife",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const msg = `Olá! Está é uma mensagem automática.\nLembramos que a consulta de ${childName} está marcada para ${dateStr}.\n\nSe precisar remarcar, entre em contato.`;
  const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
}

function handleSendWhatsAppConsult(
  pdfUrl: string | null | undefined,
  childName: string,
  guardianPhone?: string | null
) {
  if (typeof window === "undefined") return;

  const baseMsg = `Olá! Segue o PDF da consulta de ${childName}: `;
  const msg = pdfUrl ? baseMsg + pdfUrl : baseMsg + "(sem link anexado)";
  const encodedMsg = encodeURIComponent(msg);

  // Se não tiver telefone → abre WhatsApp genérico
  if (!guardianPhone) {
    alert(
      "Este paciente não tem telefone cadastrado. Vou abrir o WhatsApp só com a mensagem para você escolher o contato."
    );
    const genericUrl = `https://wa.me/?text=${encodedMsg}`;
    window.open(genericUrl, "_blank");
    return;
  }

  // Limpa tudo que não for número
  const digits = guardianPhone.replace(/\D/g, "");

  if (digits.length < 10) {
    alert(
      "Telefone do responsável parece incompleto. Vou abrir o WhatsApp só com a mensagem para você escolher o contato."
    );
    const genericUrl = `https://wa.me/?text=${encodedMsg}`;
    window.open(genericUrl, "_blank");
    return;
  }

  // Se não tiver DDI, prefixa 55 (Brasil)
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;

  const whatsappUrl = `https://wa.me/${withCountry}?text=${encodedMsg}`;
  window.open(whatsappUrl, "_blank");
}

async function handleSendEmailConsult(pdfUrl: string, childName: string, toEmail?: string | null) {
  if (typeof window === "undefined") return;
  const normalizedEmail = String(toEmail || "").trim();

  if (!normalizedEmail) {
    alert("Preencha o e-mail do responsável.");
    return;
  }

  if (!pdfUrl) {
    alert("PDF ainda não disponível.");
    return;
  }

  try {
    const response = await fetch("/api/send-consult-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toEmail: normalizedEmail,
        childName,
        pdfUrl,
        doctorName: DOCTOR_HEADER.doctorName,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Não foi possível enviar o e-mail.");
    }

    alert("E-mail enviado com sucesso.");
  } catch (error: any) {
    alert(error?.message || "Não foi possível enviar o e-mail.");
  }
}


function storageKeyConsultations(email: string) {
  return `rbgp_consults_${email.toLowerCase()}`;
}

function safeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// ---------- UI Primitives ----------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">{children}</div>
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-white shadow-sm ring-1 ring-slate-200", className)}>
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : variant === "secondary"
      ? "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
      : "bg-transparent text-slate-700 hover:bg-slate-100";
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(base, styles, className)}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      <span className="text-slate-600">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-700">{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/40 focus:ring-2"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-700">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/40 focus:ring-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-700">{label}</div>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500/40 focus:ring-2"
      />
    </label>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <div className="text-base font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------- Auth (Supabase) ----------

function useSupabaseSession() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setEmail(data.session?.user?.email ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setEmail(null);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, email };
}

function LoginModal({
  open,
  mode,
  onClose,
  onLoggedIn,
}: {
  open: boolean;
  mode: Role;
  onClose: () => void;
  onLoggedIn: (u: AppUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword("");
    setPromoCode("");
    setBusy(false);
  }, [open]);

  const title = mode === "guardian" ? "Acesso do responsável" : "Acesso do pediatra";
  const subtitle =
    mode === "guardian"
      ? "Crie sua conta ou entre para ver Meus filhos."
      : "Área profissional (login).";

  async function handleSignUp() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        return;
      }
      alert("Verifique seu e-mail para confirmar a conta. Depois disso, você já pode entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function getServerPlanStatus(emailToCheck: string) {
    const res = await fetch("/api/plan-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailToCheck.toLowerCase() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "Falha ao verificar status do plano");
    }

    return data?.status ?? "Cancelado";
  }

  async function handleSubscribePlan() {
    if (mode !== "doctor") return;

    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      alert("Informe seu e-mail profissional para assinar o plano.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, promoCode: promoCode.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao iniciar assinatura");
      }

      alert("Checkout iniciado. Após confirmar o pagamento, o acesso da área do pediatra será liberado automaticamente.");
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      alert(`Erro ao assinar plano: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    setBusy(true);
    try {
      if (mode === "doctor") {
        const normalized = email.trim().toLowerCase();

        const planStatus = await getServerPlanStatus(normalized);
        if (planStatus !== "Ativo") {
          alert(
            "Seu plano não está ativo. Clique em Assinar plano e conclua a assinatura para liberar o acesso."
          );
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
        return;
      }

      onLoggedIn({ role: mode, email });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={title} subtitle={subtitle} onClose={onClose}>
      <div className="grid gap-4">
        <Input
          label="E-mail"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="seuemail@exemplo.com"
        />
        <Input
          label="Senha"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Coloque uma senha mesmo se for assinar"
        />

        {mode === "doctor" ? (
          <Input
            label="Cupom (opcional)"
            value={promoCode}
            onChange={setPromoCode}
            placeholder="Insira um cupom se tiver"
          />
        ) : null}

        <div className="grid gap-2">
          {mode === "doctor" ? (
            <div className="grid gap-2 md:grid-cols-2">
              <Button onClick={handleSignIn} disabled={busy || !email || password.length < 6}>
                <LogIn className="h-4 w-4" /> Entrar
              </Button>
              <Button variant="secondary" onClick={handleSubscribePlan} disabled={busy || !email}>
                <CreditCard className="h-4 w-4" /> Assinar plano
              </Button>
            </div>
          ) : (
            <Button onClick={handleSignIn} disabled={busy || !email || password.length < 6}>
              <LogIn className="h-4 w-4" /> Entrar
            </Button>
          )}

          {mode === "guardian" ? (
            <Button
              variant="secondary"
              onClick={handleSignUp}
              disabled={busy || !email || password.length < 6}
            >
              <UserRound className="h-4 w-4" /> Criar conta
            </Button>
          ) : null}

          <div className="mt-1 text-xs text-slate-500">
            * Por segurança, a criação de conta fica só para responsáveis (Portal).
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Portal do Paciente ----------

function GuardianHome({
  user,
  onLogout,
}: {
  user: AppUser;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<"home" | "children" | "appointments" | "questions" | "docs">(
    "home"
  );

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader
          title={BRAND.name}
          subtitle="Portal do Paciente"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Pill icon={<Mail className="h-4 w-4" />} label={user.email} />
              <Button variant="secondary" onClick={onLogout}>
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          }
        />
        <div className="p-5">
          {tab === "home" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <QuickAction
                title="Meus filhos"
                desc="Cadastre e selecione a criança para ver documentos, consultas e crescimento."
                icon={<Baby className="h-5 w-5" />}
                onClick={() => setTab("children")}
              />
              <QuickAction
                title="Marcar consulta"
                desc="Escolha um horário de 30 minutos."
                icon={<CalendarDays className="h-5 w-5" />}
                onClick={() => setTab("appointments")}
              />
              <QuickAction
  title="Status da consulta"
  desc="Veja se a consulta foi confirmada, cancelada ou está aguardando."
  icon={<ClipboardList className="h-5 w-5" />}
  onClick={() => setTab("questions")}
/>

              <QuickAction
                title="Documentos / Informações"
                desc="PDFs + Consultas + Crescimento."
                icon={<FileText className="h-5 w-5" />}
                onClick={() => setTab("docs")}
              />
            </div>
          ) : null}

          {tab === "children" ? (
            <MyChildren user={user} onBack={() => setTab("home")} />
          ) : null}

          {tab === "appointments" ? (
            <AppointmentsMock user={user} onBack={() => setTab("home")} />
          ) : null}


{tab === "questions" ? (
  <AppointmentStatus user={user} onBack={() => setTab("home")} />
) : null}


          {tab === "docs" ? (
            <DocumentsInfoMock user={user} onBack={() => setTab("home")} />
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function QuickAction({
  title,
  desc,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
          </div>
          <div className="mt-1 text-sm text-slate-500">{desc}</div>
        </div>
      </div>
    </button>
  );
}

// ---------- Meus filhos (Supabase) ----------

function MyChildren({ user, onBack }: { user: AppUser; onBack: () => void }) {
  type DoctorOption = { email: string; name: string };
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  async function loadDoctors() {
    try {
      const res = await fetch("/api/doctors");
      const data = await res.json();
      const list = (data?.doctors ?? []) as DoctorOption[];
      const sanitized = list
        .filter((d) => d?.email)
        .map((d) => ({
          email: String(d.email).trim().toLowerCase(),
          name: String(d.name || d.email).trim(),
        }));
      setDoctors(sanitized);
    } catch {
      setDoctors([]);
    }
  }

async function loadChildren() {
  setLoading(true);
  setErr(null);

  try {
    // 1) Pega usuário logado (responsável)
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const uid = auth.user?.id ?? null;
    const emailRaw = auth.user?.email ?? null;
    const email = emailRaw ? emailRaw.toLowerCase() : null;

    if (!uid || !email) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    // 2) Busca filhos:
    //    - já ligados ao guardian_id
    //    - OU com guardian_email igual ao e-mail desse usuário
    const { data, error } = await supabase
      .from("children")
      .select(
        "id,name,birth_date,sex,guardian_id,guardian_email,guardian_phone,pediatrician_email,pediatrician_name"
      )
      .or(`guardian_id.eq.${uid},guardian_email.eq.${email}`)
      .order("created_at", { ascending: false });

    let rows: any[] = (data as any[]) ?? [];
    let fetchError: any = error;

    if (fetchError && /pediatrician_email|pediatrician_name/i.test(fetchError.message || "")) {
      const legacyQuery = await supabase
        .from("children")
        .select("id,name,birth_date,sex,guardian_id,guardian_email,guardian_phone")
        .or(`guardian_id.eq.${uid},guardian_email.eq.${email}`)
        .order("created_at", { ascending: false });

      rows = legacyQuery.data ?? [];
      fetchError = legacyQuery.error;
    }

    if (fetchError) throw fetchError;

    // 3) “Claim automático”:
    //    se o pediatra cadastrou com guardian_email igual ao do login,
    //    e ainda não tem guardian_id, agora amarramos no uid do responsável.
    const toClaim = rows.filter(
      (r: any) =>
        !r.guardian_id &&
        r.guardian_email &&
        typeof r.guardian_email === "string" &&
        r.guardian_email.toLowerCase() === email
    );

    if (toClaim.length > 0) {
      const ids = toClaim.map((r: any) => r.id);

      const { error: claimError } = await supabase
        .from("children")
        .update({ guardian_id: uid })
        .in("id", ids);

      if (claimError) {
        console.error("Erro ao vincular filhos ao responsável:", claimError);
      } else {
        // recarrega rows já com guardian_id atualizado
        const { data: data2, error: error2 } = await supabase
          .from("children")
          .select(
            "id,name,birth_date,sex,guardian_id,guardian_email,guardian_phone,pediatrician_email,pediatrician_name"
          )
          .or(`guardian_id.eq.${uid},guardian_email.eq.${email}`)
          .order("created_at", { ascending: false });

        if (!error2) {
          rows.splice(0, rows.length, ...((data2 as any[]) ?? []));
        } else if (/pediatrician_email|pediatrician_name/i.test((error2 as any)?.message || "")) {
          const data2Legacy = await supabase
            .from("children")
            .select("id,name,birth_date,sex,guardian_id,guardian_email,guardian_phone")
            .or(`guardian_id.eq.${uid},guardian_email.eq.${email}`)
            .order("created_at", { ascending: false });

          if (!data2Legacy.error) {
            rows.splice(0, rows.length, ...(data2Legacy.data ?? []));
          }
        }
      }
    }

    // 4) Mapeia para o tipo Child usado no front
    const mapped: Child[] = rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      birthDate: String(r.birth_date),
      sex: (r.sex as Child["sex"]) ?? "O",
      guardianEmail: (r.guardian_email as string) ?? null,
      guardianPhone: (r.guardian_phone as string) ?? null,
      pediatricianEmail: (r.pediatrician_email as string) ?? null,
      pediatricianName: (r.pediatrician_name as string) ?? null,
    }));

    setChildren(mapped);

    // 5) Mantém ou define o filho selecionado
    setSelectedId((prev) => {
      if (prev && mapped.some((c) => c.id === prev)) return prev;
      return mapped[0]?.id ?? "";
    });

    // 6) Salva o filho selecionado no localStorage para outras telas
    const firstId = mapped[0]?.id;
    if (firstId) {
      localStorage.setItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`,
        firstId
      );
    }
  } catch (e: any) {
    console.error(e);
    setErr(e?.message ?? "Falha ao carregar filhos.");
    setChildren([]);
    setSelectedId("");
  } finally {
    setLoading(false);
  }
}





  useEffect(() => {
    loadChildren();
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);

  // sempre que mudar o selecionado, grava no localStorage
  useEffect(() => {
    if (!selectedId) return;
    const storageKey = `rbgp_selected_child_${user.email.toLowerCase()}`;
    localStorage.setItem(storageKey, selectedId);
  }, [selectedId, user.email]);

function AddChildModal({
  open,
  onClose,
  onAdd,
  doctors,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: Omit<Child, "id">) => void;
  doctors: Array<{ email: string; name: string }>;
}) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Child["sex"]>("M");

  // ✅ novos campos
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [pediatricianEmail, setPediatricianEmail] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setBirthDate("");
    setSex("M");
    setGuardianEmail("");
    setGuardianPhone("");
    setPediatricianEmail(doctors[0]?.email ?? "");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!pediatricianEmail && doctors[0]?.email) {
      setPediatricianEmail(doctors[0].email);
    }
  }, [doctors, open, pediatricianEmail]);

  return (
    <Modal
      open={open}
      title="Cadastrar filho"
      subtitle="Dados do paciente e do responsável"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <Input
          label="Nome da criança"
          value={name}
          onChange={setName}
          placeholder="Ex: Rafael"
        />
        <Input
          label="Data de nascimento"
          value={birthDate}
          onChange={setBirthDate}
          type="date"
        />
        <Select
          label="Sexo"
          value={sex}
          onChange={(v) => setSex(v as Child["sex"])}
          options={[
            { label: "Masculino", value: "M" },
            { label: "Feminino", value: "F" },
            { label: "Outro", value: "O" },
          ]}
        />

        {/* ✅ dados do responsável */}
        <Input
          label="E-mail do responsável"
          value={guardianEmail}
          onChange={setGuardianEmail}
          type="email"
          placeholder="responsavel@exemplo.com"
        />
        <Input
          label="Telefone do responsável"
          value={guardianPhone}
          onChange={setGuardianPhone}
          type="tel"
          placeholder="(DDD) 99999-9999"
        />

        {doctors.length === 0 ? (
          <Input
            label="E-mail do pediatra vinculado"
            value={pediatricianEmail}
            onChange={setPediatricianEmail}
            type="email"
            placeholder="pediatra@exemplo.com"
          />
        ) : (
          <Select
            label="Pediatra vinculado"
            value={pediatricianEmail}
            onChange={setPediatricianEmail}
            options={doctors.map((d) => ({ label: d.name, value: d.email }))}
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) return alert("Informe o nome.");
              if (!birthDate) return alert("Informe a data de nascimento.");
              if (!guardianEmail.trim()) return alert("Informe o e-mail do responsável.");
              if (!guardianPhone.trim()) return alert("Informe o telefone do responsável.");
              if (!pediatricianEmail.trim()) return alert("Selecione o pediatra vinculado.");

              const selectedDoctor = doctors.find((d) => d.email === pediatricianEmail);
              const manualDoctorName = pediatricianEmail.trim().split("@")[0] || pediatricianEmail.trim();

              onAdd({
                name: name.trim(),
                birthDate,
                sex,
                guardianEmail: guardianEmail.trim(),
                guardianPhone: guardianPhone.trim(),
                pediatricianEmail: pediatricianEmail.trim().toLowerCase(),
                pediatricianName: selectedDoctor?.name ?? manualDoctorName,
              });
              onClose();
            }}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}



  async function addChild(child: Omit<Child, "id">) {
    setLoading(true);
    setErr(null);

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const guardianId = auth.user?.id ?? null;

      const basePayload = {
        name: child.name,
        birth_date: child.birthDate,
        sex: child.sex,
        guardian_id: guardianId,
        guardian_email: child.guardianEmail,
        guardian_phone: child.guardianPhone,
        doctor_id: auth.user?.id,
      };

      const withPediatricianPayload = {
        ...basePayload,
        pediatrician_email: child.pediatricianEmail ?? null,
        pediatrician_name: child.pediatricianName ?? null,
      };

      let insert = await supabase
        .from("children")
        .insert(withPediatricianPayload)
        .select("id")
        .single();

      if (insert.error && /pediatrician_email|pediatrician_name/i.test(insert.error.message || "")) {
        insert = await supabase
          .from("children")
          .insert(basePayload)
          .select("id")
          .single();
      }

      if (insert.error) throw insert.error;

      const newChild: Child = {
        id: String((insert.data as any).id),
        name: child.name,
        birthDate: child.birthDate,
        sex: child.sex,
        guardianEmail: child.guardianEmail,
        guardianPhone: child.guardianPhone,
        pediatricianEmail: child.pediatricianEmail ?? null,
        pediatricianName: child.pediatricianName ?? null,
      };

      if (child.pediatricianEmail) {
        const linkKey = `rbgp_child_doctor_link_${user.email.toLowerCase()}`;
        const raw = localStorage.getItem(linkKey);
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        map[newChild.id] = child.pediatricianEmail;
        localStorage.setItem(linkKey, JSON.stringify(map));
      }

      setChildren((prev) => [newChild, ...prev]);
      setSelectedId(newChild.id);
      localStorage.setItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`,
        newChild.id
      );

      alert("Filho cadastrado com sucesso!");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Falha ao cadastrar filho.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    const ok = confirm("Remover este cadastro?");
    if (!ok) return;

    setLoading(true);
    setErr(null);
    try {
      const { error } = await supabase.from("children").delete().eq("id", id);
      if (error) throw error;

      setChildren((prev) => {
        const next = prev.filter((c) => c.id !== id);
        let newSelected = selectedId;

        if (!next.length) {
          newSelected = "";
        } else if (id === selectedId) {
          newSelected = next[0].id;
        }

        setSelectedId(newSelected);
        return next;
      });
    } catch (e: any) {
      alert(e?.message ?? "Não foi possível remover.");
    } finally {
      setLoading(false);
    }
  }

  const selected = children.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">Meus filhos</div>
          <div className="mt-1 text-sm text-slate-500">
            Cadastre e selecione a criança para usar o portal. (Agora salvo na nuvem)
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={() => setOpenAdd(true)} disabled={loading}>
            <Plus className="h-4 w-4" /> Cadastrar filho
          </Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <div className="p-4">
            {loading ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Carregando...
              </div>
            ) : children.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma criança cadastrada ainda. Clique em <b>Cadastrar filho</b>.
              </div>
            ) : (
              <div className="grid gap-2">
                {children.map((c) => (
  <button
    key={c.id}
    type="button"
    onClick={() => {
      setSelectedId(c.id);
      localStorage.setItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`,
        c.id
      );
    }}
    className={cn(
      "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
      selectedId === c.id
        ? "border-slate-900 bg-slate-50"
        : "border-slate-200 bg-white hover:bg-slate-50"
    )}
  >
    <div className="truncate text-sm font-semibold text-slate-900">
      {c.name}
    </div>
    <div className="text-xs text-slate-500">
      Nasc.: {formatDateBR(c.birthDate)} • Sexo: {c.sex}
    </div>

    {c.guardianEmail && (
      <div className="text-xs text-slate-500">
        E-mail do responsável: <b>{c.guardianEmail}</b>
      </div>
    )}

    {c.guardianPhone && (
      <div className="text-xs text-slate-500">
        Telefone do responsável: <b>{c.guardianPhone}</b>
      </div>
    )}

    {c.pediatricianEmail && (
      <div className="text-xs text-slate-500">
        Pediatra vinculado: <b>{c.pediatricianName || c.pediatricianEmail}</b>
      </div>
    )}
  </button>
))}

              </div>
            )}
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="p-4">
            {selected ? (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill icon={<Baby className="h-4 w-4" />} label={selected.name} />
                  <Pill
                    icon={<CalendarDays className="h-4 w-4" />}
                    label={`Nascimento: ${formatDateBR(selected.birthDate)}`}
                  />
                  <Pill icon={<ShieldCheck className="h-4 w-4" />} label={`Sexo: ${selected.sex}`} />
                  {selected.pediatricianEmail ? (
                    <Pill
                      icon={<Stethoscope className="h-4 w-4" />}
                      label={`Pediatra: ${selected.pediatricianName || selected.pediatricianEmail}`}
                    />
                  ) : null}
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Próximo passo: em <b>Documentos/Informações</b>, vamos usar este filho
                  selecionado para listar consultas, PDFs e crescimento.
                </div>

                <div className="flex justify-end">
                  <Button variant="secondary" onClick={loadChildren} disabled={loading}>
                    Recarregar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Selecione uma criança à esquerda.
              </div>
            )}
          </div>
        </Card>
      </div>

      <AddChildModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onAdd={addChild}
        doctors={doctors}
      />
    </div>
  );
}

function AddChildModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: Omit<Child, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Child["sex"]>("M");

  // ✅ novos campos
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setBirthDate("");
    setSex("M");
    setGuardianEmail("");
    setGuardianPhone("");
  }, [open]);

  return (
    <Modal
      open={open}
      title="Cadastrar filho"
      subtitle="Dados do paciente e do responsável"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <Input
          label="Nome da criança"
          value={name}
          onChange={setName}
          placeholder="Ex: Rafael"
        />
        <Input
          label="Data de nascimento"
          value={birthDate}
          onChange={setBirthDate}
          type="date"
        />
        <Select
          label="Sexo"
          value={sex}
          onChange={(v) => setSex(v as Child["sex"])}
          options={[
            { label: "Masculino", value: "M" },
            { label: "Feminino", value: "F" },
            { label: "Outro", value: "O" },
          ]}
        />

        {/* ✅ dados do responsável */}
        <Input
          label="E-mail do responsável"
          value={guardianEmail}
          onChange={setGuardianEmail}
          type="email"
          placeholder="responsavel@exemplo.com"
        />
        <Input
          label="Telefone do responsável"
          value={guardianPhone}
          onChange={setGuardianPhone}
          type="tel"
          placeholder="(DDD) 99999-9999"
        />

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) return alert("Informe o nome.");
              if (!birthDate) return alert("Informe a data de nascimento.");
              if (!guardianEmail.trim()) return alert("Informe o e-mail do responsável.");
              if (!guardianPhone.trim()) return alert("Informe o telefone do responsável.");

              onAdd({
                name: name.trim(),
                birthDate,
                sex,
                guardianEmail: guardianEmail.trim(),
                guardianPhone: guardianPhone.trim(),
              });
              onClose();
            }}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}


function AppointmentsMock({ user, onBack }: { user: AppUser; onBack: () => void }) {
  type DoctorOption = { email: string; name: string };
  const RECIFE_OFFSET = "-03:00";
  const today = new Date();
  const selectedChildStorageKey = `rbgp_selected_child_${user.email.toLowerCase()}`;
  const childDoctorLinkStorageKey = `rbgp_child_doctor_link_${user.email.toLowerCase()}`;

  // Mês/ano exibidos no calendário
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  // Dia selecionado dentro do mês exibido
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorEmail, setSelectedDoctorEmail] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [linkedDoctorEmail, setLinkedDoctorEmail] = useState("");
  const [linkedDoctorName, setLinkedDoctorName] = useState("");

  // pedidos do responsável (lista de baixo)
  const [myAppts, setMyAppts] = useState<
    Array<{
      id: string;
      start_at: string;
      status: string;
      child_id: string;
      childName: string;
      doctorEmail?: string;
      doctorName?: string;
    }>
  >([]);
  const [loadingMyAppts, setLoadingMyAppts] = useState(false);
  const [errMyAppts, setErrMyAppts] = useState<string | null>(null);

  // disponibilidade real do dia (slot -> existe availability ativa?)
  const [dayAvail, setDayAvail] = useState<Record<string, boolean>>({});
  const [daySlotDurationMin, setDaySlotDurationMin] = useState<Record<string, number>>({});
  // horários já ocupados (appointment requested/confirmed)
  const [dayBusy, setDayBusy] = useState<Record<string, boolean>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errSlots, setErrSlots] = useState<string | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);

  // disponibilidade por dia do mês (YYYY-MM-DD -> tem pelo menos 1 horário?)
  const [monthAvail, setMonthAvail] = useState<Record<string, boolean>>({});
  const [loadingMonthAvail, setLoadingMonthAvail] = useState(false);

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  function ymd(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function recifeISO(dateStr: string, hh: number, mm: number) {
    return `${dateStr}T${pad2(hh)}:${pad2(mm)}:00${RECIFE_OFFSET}`;
  }

  function dayBounds(dateStr: string) {
    const start = `${dateStr}T00:00:00${RECIFE_OFFSET}`;
    const end = `${dateStr}T23:59:59${RECIFE_OFFSET}`;
    return { start, end };
  }

  function doctorDisplayName(doctorEmail?: string, doctorName?: string) {
    if (doctorName && doctorName.trim()) return doctorName.trim();
    if (!doctorEmail) return "Pediatra não informado";
    const found = doctors.find((d) => d.email === doctorEmail.toLowerCase());
    if (found) return found.name;
    return doctorEmail;
  }

  function isDuplicateBookingMessage(message: string) {
    const normalized = (message || "").toLowerCase();
    return (
      normalized.includes("não pode ser realizado novamente") ||
      normalized.includes("nao pode ser realizado novamente") ||
      normalized.includes("duplicate key") ||
      normalized.includes("already exists") ||
      normalized.includes("already booked")
    );
  }

  function displayNameFromEmail(email: string) {
    const local = email.split("@")[0] || email;
    return local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getStoredChildDoctor(childId: string) {
    try {
      const raw = localStorage.getItem(childDoctorLinkStorageKey);
      if (!raw) return "";
      const parsed = JSON.parse(raw) as Record<string, string>;
      return String(parsed?.[childId] ?? "").trim().toLowerCase();
    } catch {
      return "";
    }
  }

  async function loadLinkedDoctorFromSelectedChild() {
    const childId = localStorage.getItem(selectedChildStorageKey) || "";
    if (!childId) {
      setLinkedDoctorEmail("");
      setLinkedDoctorName("");
      return;
    }

    try {
      const query = await supabase
        .from("children")
        .select("pediatrician_email,pediatrician_name")
        .eq("id", childId)
        .maybeSingle();

      if (!query.error) {
        const email = String((query.data as any)?.pediatrician_email ?? "").trim().toLowerCase();
        const name = String((query.data as any)?.pediatrician_name ?? "").trim();
        if (email) {
          setLinkedDoctorEmail(email);
          setLinkedDoctorName(name || displayNameFromEmail(email));
          setSelectedDoctorEmail(email);
          return;
        }
      }

      const legacyQuery = await supabase
        .from("children")
        .select("pediatrician_email")
        .eq("id", childId)
        .maybeSingle();

      if (!legacyQuery.error) {
        const legacyEmail = String((legacyQuery.data as any)?.pediatrician_email ?? "")
          .trim()
          .toLowerCase();
        if (legacyEmail) {
          setLinkedDoctorEmail(legacyEmail);
          setLinkedDoctorName(displayNameFromEmail(legacyEmail));
          setSelectedDoctorEmail(legacyEmail);
          return;
        }
      }

      const fromStorage = getStoredChildDoctor(childId);
      if (fromStorage) {
        setLinkedDoctorEmail(fromStorage);
        setLinkedDoctorName(displayNameFromEmail(fromStorage));
        setSelectedDoctorEmail(fromStorage);
        return;
      }

      setLinkedDoctorEmail("");
      setLinkedDoctorName("");
    } catch {
      const fromStorage = getStoredChildDoctor(childId);
      if (fromStorage) {
        setLinkedDoctorEmail(fromStorage);
        setLinkedDoctorName(displayNameFromEmail(fromStorage));
        setSelectedDoctorEmail(fromStorage);
      } else {
        setLinkedDoctorEmail("");
        setLinkedDoctorName("");
      }
    }
  }

  async function loadDoctors() {
    setLoadingDoctors(true);
    try {
      const res = await fetch("/api/doctors");
      const data = await res.json();
      const list = (data?.doctors ?? []) as DoctorOption[];

      const sanitized = list
        .filter((d) => d?.email)
        .map((d) => ({
          email: String(d.email).toLowerCase(),
          name: String(d.name || d.email),
        }));

      setDoctors(sanitized);
      setSelectedDoctorEmail((prev) => {
        if (prev && sanitized.some((d) => d.email === prev)) return prev;
        return sanitized[0]?.email ?? "";
      });
    } catch (e) {
      console.error(e);
      setDoctors([]);
      setSelectedDoctorEmail("");
    } finally {
      setLoadingDoctors(false);
    }
  }


  // limite de 60 dias à frente
  const maxDateAllowed = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 60);
    return d;
  }, []);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  function isBeyondLimit(date: Date) {
    return date.getTime() > maxDateAllowed.getTime();
  }

  function isPast(date: Date) {
    return date.getTime() < todayStart.getTime();
  }

  const monthNames = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];

  // calendário do mês exibido
  const days = useMemo(() => {
    const res: Array<{ day: number; date: Date }> = [];
    const d = new Date(viewYear, viewMonth, 1);

    while (d.getMonth() === viewMonth) {
      res.push({
        day: d.getDate(),
        date: new Date(d.getTime()),
      });
      d.setDate(d.getDate() + 1);
    }

    return res;
  }, [viewYear, viewMonth]);

  // slots do dia (dinâmicos pela disponibilidade do pediatra)
  const slots = useMemo(() => {
    const dynamicSlots = Object.keys(dayAvail).filter((key) => /^\d{2}:\d{2}$/.test(key));
    const baseSlots: string[] = [];
    const start = 0;
    const end = 24;
    for (let h = start; h < end; h++) {
      baseSlots.push(`${pad2(h)}:00`);
      baseSlots.push(`${pad2(h)}:30`);
    }
    return Array.from(new Set([...baseSlots, ...dynamicSlots])).sort();
  }, [dayAvail]);

  function getSelectedDate() {
    return new Date(viewYear, viewMonth, selectedDay);
  }

  // --- CARREGAR MEUS PEDIDOS ---

  async function loadMyAppointments() {
    setLoadingMyAppts(true);
    setErrMyAppts(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const guardianId = authData.user?.id;
      if (!guardianId) throw new Error("Sessão expirada.");

      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("id,name");

      if (childrenError) throw childrenError;

      const childMap = new Map<string, string>();
      (childrenData ?? []).forEach((c: any) => {
        childMap.set(String(c.id), String(c.name));
      });
    


      const withDoctorColumns = await supabase
        .from("appointments")
        .select("id, start_at, status, child_id, doctor_email, doctor_name")
        .eq("guardian_id", guardianId)
        .order("start_at", { ascending: true });

      let data: any[] | null = withDoctorColumns.data as any[] | null;
      let error: any = withDoctorColumns.error;

      if (error && /doctor_email|doctor_name/i.test(error.message || "")) {
        const legacy = await supabase
          .from("appointments")
          .select("id, start_at, status, child_id")
          .eq("guardian_id", guardianId)
          .order("start_at", { ascending: true });
        data = legacy.data;
        error = legacy.error;
      }

      if (error) throw error;

      const mapped = (data ?? []).map((a: any) => ({
        id: String(a.id),
        start_at: String(a.start_at),
        status: String(a.status ?? "requested"),
        child_id: String(a.child_id ?? ""),
        childName: childMap.get(String(a.child_id)) ?? "Paciente",
        doctorEmail: String(a.doctor_email ?? "") || undefined,
        doctorName: String(a.doctor_name ?? "") || undefined,
      }));

      setMyAppts(mapped);
    } catch (e: any) {
      console.error(e);
      setErrMyAppts(e?.message ?? "Falha ao carregar seus pedidos.");
      setMyAppts([]);
    } finally {
      setLoadingMyAppts(false);
    }
  }

  // --- CARREGAR DISPONIBILIDADE POR DIA DO MÊS (pra pintar o calendário) ---

  async function loadMonthAvailability(year: number, month: number) {
    setLoadingMonthAvail(true);
    try {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0); // último dia do mês

      // recorta para o limite de 60 dias à frente
      const startDate = new Date(firstDay.getTime());
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(lastDay.getTime());
      endDate.setHours(23, 59, 59, 999);

      if (endDate.getTime() > maxDateAllowed.getTime()) {
        endDate.setTime(maxDateAllowed.getTime());
        endDate.setHours(23, 59, 59, 999);
      }

      const startStr = `${ymd(startDate)}T00:00:00${RECIFE_OFFSET}`;
      const endStr = `${ymd(endDate)}T23:59:59${RECIFE_OFFSET}`;

      let query = supabase
        .from("doctor_availability")
        .select("start_at,is_active")
        .eq("doctor_email", selectedDoctorEmail)
        .eq("is_active", true)
        .gte("start_at", startStr)
        .lte("start_at", endStr);

      const { data, error } = await query;

      let availRows = data;
      if (error) {
        if ((error.message || "").toLowerCase().includes("doctor_email")) {
          const legacy = await supabase
            .from("doctor_availability")
            .select("start_at,is_active")
            .eq("is_active", true)
            .gte("start_at", startStr)
            .lte("start_at", endStr);
          if (legacy.error) throw legacy.error;
          availRows = legacy.data;
        } else {
          throw error;
        }
      }

      const map: Record<string, boolean> = {};

      (availRows ?? []).forEach((a: any) => {
        // pega a data no fuso de Recife
        const dateKey = new Date(a.start_at).toLocaleDateString("en-CA", {
          timeZone: "America/Recife",
        }); // formato YYYY-MM-DD
        map[dateKey] = true;
      });
      

      setMonthAvail(map);
    } catch (e: any) {
      console.error(e);
      setMonthAvail({});
    } finally {
      setLoadingMonthAvail(false);
    }
  }

  // --- CARREGAR DISPONIBILIDADE DE SLOTS DO DIA SELECIONADO ---

  async function loadDayData(day: number, year = viewYear, month = viewMonth) {
    setLoadingSlots(true);
    setErrSlots(null);
    try {
      const dateObj = new Date(year, month, day);
      const dateStr = ymd(dateObj);
      const { start, end } = dayBounds(dateStr);

      let availQuery = supabase
        .from("doctor_availability")
        .select("id,start_at,end_at,is_active,duration_minutes")
        .eq("doctor_email", selectedDoctorEmail)
        .eq("is_active", true)
        .gte("start_at", start)
        .lte("start_at", end);

      const { data: availData, error: availError } = await availQuery;

      let dayAvailRows: any[] | null = availData as any[] | null;
      if (availError) {
        if (
          (availError.message || "").toLowerCase().includes("doctor_email") ||
          (availError.message || "").toLowerCase().includes("duration_minutes")
        ) {
          const legacy = await supabase
            .from("doctor_availability")
            .select("id,start_at,end_at,is_active")
            .eq("is_active", true)
            .gte("start_at", start)
            .lte("start_at", end);
          if (legacy.error) throw legacy.error;
          dayAvailRows = legacy.data;
        } else {
          throw availError;
        }
      }

      const availMap: Record<string, boolean> = {};
      const durationMap: Record<string, number> = {};
      (dayAvailRows ?? []).forEach((a: any) => {
        const startDate = new Date(a.start_at);
        const endDate = a.end_at ? new Date(a.end_at) : null;
        const diffMinutes =
          endDate && !Number.isNaN(endDate.getTime())
            ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
            : 0;
        const resolvedDuration = Number(a.duration_minutes ?? 0) || diffMinutes || 30;

        const d = startDate;
        const hh = pad2(d.getHours());
        const mm = pad2(d.getMinutes());
        const key = `${hh}:${mm}`;
        availMap[key] = true;
        durationMap[key] = resolvedDuration;
      });

      let apptsQuery = supabase
        .from("appointments")
        .select("start_at,status")
        .eq("doctor_email", selectedDoctorEmail)
        .in("status", ["requested", "confirmed"])
        .gte("start_at", start)
        .lte("start_at", end);

      const { data: apptsData, error: apptsError } = await apptsQuery;

      let apptRows = apptsData;
      if (apptsError) {
        if ((apptsError.message || "").toLowerCase().includes("doctor_email")) {
          const legacy = await supabase
            .from("appointments")
            .select("start_at,status")
            .in("status", ["requested", "confirmed"])
            .gte("start_at", start)
            .lte("start_at", end);
          if (legacy.error) throw legacy.error;
          apptRows = legacy.data;
        } else {
          throw apptsError;
        }
      }

      const busyMap: Record<string, boolean> = {};
      (apptRows ?? []).forEach((a: any) => {
        const d = new Date(a.start_at);
        const hh = pad2(d.getHours());
        const mm = pad2(d.getMinutes());
        const key = `${hh}:${mm}`;
        busyMap[key] = true;
      });

      setDayAvail(availMap);
      setDaySlotDurationMin(durationMap);
      setDayBusy(busyMap);
    } catch (e: any) {
      console.error(e);
      setErrSlots(e?.message ?? "Falha ao carregar horários deste dia.");
      setDayAvail({});
      setDaySlotDurationMin({});
      setDayBusy({});
    } finally {
      setLoadingSlots(false);
    }
  }

  // carrega pedidos do responsável
  useEffect(() => {
    loadDoctors();
    loadLinkedDoctorFromSelectedChild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!linkedDoctorEmail) return;
    setSelectedDoctorEmail(linkedDoctorEmail);
  }, [linkedDoctorEmail]);

  useEffect(() => {
    loadMyAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sempre que mudar o mês/ano, recarrega mapa de disponibilidade de dias
  useEffect(() => {
    if (!selectedDoctorEmail) {
      setMonthAvail({});
      return;
    }
    loadMonthAvailability(viewYear, viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, selectedDoctorEmail]);

  // sempre que mudar o dia/mês/ano, recarrega slots daquele dia
  useEffect(() => {
    if (!selectedDoctorEmail) {
      setDayAvail({});
      setDayBusy({});
      setErrSlots("Selecione o pediatra para visualizar os horários.");
      return;
    }
    loadDayData(selectedDay, viewYear, viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, viewYear, viewMonth, selectedDoctorEmail]);

  // --- MARCAR CONSULTA ---

  async function handleRequest(slot: string) {
    if (bookingSlot) return;
    setBookingSlot(slot);
    try {
      if (!selectedDoctorEmail) {
        alert("Selecione o pediatra antes de marcar a consulta.");
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const guardianId = authData.user?.id;
      if (!guardianId) {
        alert("Sessão expirada. Faça login novamente.");
        return;
      }

      const selectedChildId = localStorage.getItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`
      );
      if (!selectedChildId) {
        alert("Escolha primeiro um filho em 'Meus filhos'.");
        return;
      }

      const dateObj = getSelectedDate();
      const dateStr = ymd(dateObj);

      const now = new Date();
      const diffMs = dateObj.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 60) {
        alert("Só é possível marcar consulta com até 60 dias de antecedência.");
        return;
      }

      if (isPast(dateObj)) {
        alert("Não é possível marcar consulta em datas passadas.");
        return;
      }

      if (!dayAvail[slot]) {
        alert(
          "Esse horário não está disponível na agenda do pediatra para este dia."
        );
        return;
      }

      if (dayBusy[slot]) {
        alert("Esse horário já foi ocupado. Escolha outro.");
        return;
      }

      const [hh, mm] = slot.split(":").map((v) => Number(v));

      const start_at = recifeISO(dateStr, hh, mm);
      const slotDuration = Number(daySlotDurationMin[slot] ?? 30);
      const endMinutes = hh * 60 + mm + slotDuration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const end_at = recifeISO(dateStr, endH, endM);

      const selectedDoctor = doctors.find((d) => d.email === selectedDoctorEmail);
      const basePayload = {
        guardian_id: guardianId,
        child_id: selectedChildId,
        start_at,
        end_at,
        status: "requested",
      };

      const withDoctorPayload = {
        ...basePayload,
        doctor_email: selectedDoctorEmail,
        doctor_name: selectedDoctor?.name ?? null,
      };

      let { error: insertError } = await supabase.from("appointments").insert(withDoctorPayload);

      if (insertError && /doctor_email|doctor_name/i.test(insertError.message || "")) {
        const fallbackInsert = await supabase.from("appointments").insert(basePayload);
        insertError = fallbackInsert.error;
      }

      if (insertError) {
        if (isDuplicateBookingMessage(insertError.message || "")) {
          await loadMyAppointments();
          await loadDayData(selectedDay, viewYear, viewMonth);
          await loadMonthAvailability(viewYear, viewMonth);
          return;
        }
        console.error(insertError);
        alert("Erro ao registrar pedido: " + insertError.message);
        return;
      }

      alert(
        `Pedido de consulta registrado com ${selectedDoctor?.name ?? selectedDoctorEmail}! Aguardando confirmação do pediatra.`
      );
      await loadMyAppointments();
      await loadDayData(selectedDay, viewYear, viewMonth);
      await loadMonthAvailability(viewYear, viewMonth);
    } catch (e: any) {
      if (isDuplicateBookingMessage(e?.message || "")) {
        await loadMyAppointments();
        await loadDayData(selectedDay, viewYear, viewMonth);
        await loadMonthAvailability(viewYear, viewMonth);
        return;
      }
      console.error(e);
      alert("Erro inesperado: " + (e?.message ?? "desconhecido"));
    } finally {
      setBookingSlot(null);
    }
  }

  function formatDateTimeRecife(iso: string) {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Recife",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function goToMonth(offset: number) {
    const base = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setSelectedDay(1);
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">
            Marcar consulta
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Duração definida pelo pediatra na agenda. Só é possível marcar até 60 dias à frente.
          </div>
        </div>
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <div className="p-4">
            {loadingDoctors ? (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Carregando lista de pediatras...
              </div>
            ) : doctors.length === 0 && !linkedDoctorEmail ? (
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
                Nenhum pediatra ativo encontrado no momento.
              </div>
            ) : (
              <Select
                label="Pediatra"
                value={selectedDoctorEmail}
                onChange={setSelectedDoctorEmail}
                options={[
                  ...(linkedDoctorEmail
                    ? [
                        {
                          label: `${linkedDoctorName || displayNameFromEmail(linkedDoctorEmail)} (vinculado ao paciente)`,
                          value: linkedDoctorEmail,
                        },
                      ]
                    : []),
                  ...doctors
                    .filter((d) => d.email !== linkedDoctorEmail)
                    .map((d) => ({ label: d.name, value: d.email })),
                ]}
              />
            )}
            {linkedDoctorEmail ? (
              <div className="mt-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
                Paciente liberado com: <b>{linkedDoctorName || linkedDoctorEmail}</b>
              </div>
            ) : null}
          </div>
        </Card>

        {/* Calendário */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">
                Calendário
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Button
                  variant="ghost"
                  onClick={() => goToMonth(-1)}
                  className="px-2 py-1"
                >
                  ◀
                </Button>
                <span className="font-semibold">
                  {monthNames[viewMonth]} / {viewYear}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => goToMonth(1)}
                  className="px-2 py-1"
                >
                  ▶
                </Button>
              </div>
            </div>

            {loadingMonthAvail ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Carregando disponibilidade do mês...
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-7 gap-2">
              {days.map((d) => {
                const date = d.date;
                const dateKey = ymd(date);
                const hasAvail = !!monthAvail[dateKey];
                const beyondLimit = isBeyondLimit(date);
                const past = isPast(date);

                let colorClass =
                  "border-emerald-200 bg-emerald-50 text-emerald-800"; // dia com disponibilidade

                if (!hasAvail) {
                  colorClass =
                    "border-rose-200 bg-rose-50 text-rose-800"; // dia sem disponibilidade
                }

                if (beyondLimit || past) {
                  colorClass =
                    "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"; // não agendável
                }

                const disabled = beyondLimit || past || !hasAvail;

                return (
                  <button
                    key={d.day}
                    onClick={() => {
                      if (disabled) return;
                      setSelectedDay(d.day);
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-sm font-semibold",
                      colorClass,
                      !disabled && selectedDay === d.day
                        ? "ring-2 ring-slate-900/20"
                        : ""
                    )}
                    disabled={disabled}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-slate-500 space-y-1">
              <div>Verde = dia com pelo menos 1 horário disponível na agenda.</div>
              <div>Vermelho = dia dentro dos 60 dias, mas sem horários disponíveis.</div>
              <div>Cinza = data passada ou além de 60 dias (não agendável).</div>
            </div>
          </div>
        </Card>

        {/* Horários */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">
                Horários
              </div>
              <Pill
                icon={<Clock className="h-4 w-4" />}
                label={getSelectedDate().toLocaleDateString("pt-BR")}
              />
            </div>

            {loadingSlots ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Carregando disponibilidade...
              </div>
            ) : errSlots ? (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
                {errSlots}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {slots.map((s) => {
                  const isAvailable = dayAvail[s];
                  const isBusy = dayBusy[s];

                  let slotClass =
                    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900";

                  if (!isAvailable) {
                    slotClass =
                      "rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed";
                  }

                  if (isAvailable && isBusy) {
                    slotClass =
                      "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 cursor-not-allowed";
                  }

                  return (
                    <button
                      key={s}
                      onClick={() => {
                        if (!isAvailable || isBusy || bookingSlot) return;
                        handleRequest(s);
                      }}
                      className={slotClass}
                      disabled={!isAvailable || isBusy || !!bookingSlot}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 text-xs text-slate-500">
              Verde = horário disponível. Amarelo = já ocupado. Cinza = fora da agenda.
            </div>
          </div>
        </Card>
      </div>

      {/* Meus pedidos */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">
              Meus pedidos de consulta
            </div>
            <Button variant="secondary" onClick={loadMyAppointments} disabled={loadingMyAppts}>
              Atualizar
            </Button>
          </div>

          {loadingMyAppts ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Carregando...
            </div>
          ) : errMyAppts ? (
            <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
              {errMyAppts}
            </div>
          ) : myAppts.length === 0 ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Você ainda não fez nenhum pedido.
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {myAppts.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {a.childName}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateTimeRecife(a.start_at)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Pediatra: {doctorDisplayName(a.doctorEmail, a.doctorName)}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        a.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                          : a.status === "cancelled"
                          ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                      )}
                    >
                      {a.status === "confirmed"
                        ? "Confirmada"
                        : a.status === "cancelled"
                        ? "Cancelada"
                        : "Aguardando confirmação"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        Logado como: <b>{user.email}</b> (portal)
      </div>
    </div>
  );
}





function AppointmentStatus({ user, onBack }: { user: AppUser; onBack: () => void }) {
  const [items, setItems] = useState<
    Array<{
      id: string;
      start_at: string;
      status: string;
      childName: string;
      doctorEmail?: string;
      doctorName?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function formatDateTimeRecife(iso: string) {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Recife",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const guardianId = authData.user?.id;
      if (!guardianId) throw new Error("Sessão expirada.");

      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("id,name");

      if (childrenError) throw childrenError;

      const childMap = new Map<string, string>();
      (childrenData ?? []).forEach((c: any) => {
        childMap.set(String(c.id), String(c.name));
      });

      const withDoctorColumns = await supabase
        .from("appointments")
        .select("id, start_at, status, child_id, doctor_email, doctor_name")
        .eq("guardian_id", guardianId)
        .order("start_at", { ascending: false });

      let data: any[] | null = withDoctorColumns.data as any[] | null;
      let error: any = withDoctorColumns.error;

      if (error && /doctor_email|doctor_name/i.test(error.message || "")) {
        const legacy = await supabase
          .from("appointments")
          .select("id, start_at, status, child_id")
          .eq("guardian_id", guardianId)
          .order("start_at", { ascending: false });
        data = legacy.data;
        error = legacy.error;
      }

      if (error) throw error;

      const mapped = (data ?? []).map((a: any) => ({
        id: String(a.id),
        start_at: String(a.start_at),
        status: String(a.status ?? "requested"),
        child_id: String(a.child_id ?? ""),
        childName: childMap.get(String(a.child_id)) ?? "Paciente",
        doctorEmail: String(a.doctor_email ?? "") || undefined,
        doctorName: String(a.doctor_name ?? "") || undefined,
      }));

      setItems(mapped);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Falha ao carregar status.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">Status das consultas</div>
          <div className="mt-1 text-sm text-slate-500">
            Acompanhe suas solicitações de consulta.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack}>
            Voltar
          </Button>
          <Button variant="secondary" onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4">
          {loading ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Carregando...</div>
          ) : err ? (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
              {err}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Você ainda não fez nenhum pedido.
            </div>
          ) : (
            <div className="grid gap-2">
              {items.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{a.childName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateTimeRecife(a.start_at)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Pediatra: {a.doctorName || a.doctorEmail || ""}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        a.status === "confirmed"
                          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                          : a.status === "cancelled"
                          ? "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                          : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                      )}
                    >
                      {a.status === "confirmed"
                        ? "Confirmada"
                        : a.status === "cancelled"
                        ? "Cancelada"
                        : "Aguardando confirmação"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        Logado como: <b>{user.email}</b> (portal)
      </div>
    </div>
  );
}





const PDF_BUCKET = "child-docs"; // <= troque aqui se seu bucket tiver outro nome
async function uploadPdfToSupabase(path: string, blob: Blob) {
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}



function DocumentsInfoMock({ user, onBack }: { user: AppUser; onBack: () => void }) {
  const [subtab, setSubtab] = useState<"pdf" | "consults" | "growth">("pdf");

  // ---- Consultas ----
  const [consults, setConsults] = useState<ConsultationSummary[]>([]);
  const [loadingConsults, setLoadingConsults] = useState(false);
  const [errorConsults, setErrorConsults] = useState<string | null>(null);

  // ---- Crescimento ----
  const [growthMetric, setGrowthMetric] = useState<"weight" | "height">("weight");
  const [growthData, setGrowthData] = useState<
    Array<{
      dateISO: string;
      ageMonths: number;
      weightKg: number | null;
      heightCm: number | null;
    }>
  >([]);
  const [growthChild, setGrowthChild] = useState<Child | null>(null);
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [errorGrowth, setErrorGrowth] = useState<string | null>(null);
  const [growthChildName, setGrowthChildName] = useState<string>("");

  // junta curva de referência + dados da criança
  // retorna o valor estimado da OMS para um determinado percentil
  function whoPercentile(
    metric: "weight" | "height",
    sexKey: "M" | "F",
    age: number,
    idx: 0 | 1 | 2
  ): number | null {
    // converter para um tipo indexável numericamente para evitar erros TS
    const table = WHO_DATA[metric][sexKey] as Record<number, number[]>;
    if (age in table) return table[age][idx];
    const ages = Object.keys(table)
      .map(Number)
      .sort((a, b) => a - b);
    const lower = ages.filter((a) => a < age).pop();
    const higher = ages.find((a) => a > age);
    if (lower != null && higher != null) {
      const vLow = table[lower][idx];
      const vHigh = table[higher][idx];
      // interpolação linear
      return vLow + ((vHigh - vLow) * (age - lower)) / (higher - lower);
    }
    if (lower != null) return table[lower][idx];
    if (higher != null) return table[higher][idx];
    return null;
  }

  const growthChartData = useMemo(() => {
    if (!growthChild) return [];
    const sexKey = growthChild.sex === "F" ? "F" : "M";

    const refAges = Object.keys(WHO_DATA[growthMetric][sexKey]).map((n) =>
      Number(n)
    );
    const childAges = growthData.map((g) => g.ageMonths);
    const allAges = Array.from(new Set([...refAges, ...childAges])).sort(
      (a, b) => a - b
    );

    return allAges.map((age) => {
      const childRec = growthData.find((g) => g.ageMonths === age);
      const childVal = childRec
        ? growthMetric === "weight"
          ? childRec.weightKg
          : childRec.heightCm
        : null;
      return {
        ageMonths: age,
        child: childVal,
        p5: whoPercentile(growthMetric, sexKey, age, 0),
        p50: whoPercentile(growthMetric, sexKey, age, 1),
        p95: whoPercentile(growthMetric, sexKey, age, 2),
      };
    });
  }, [growthMetric, growthData, growthChild]);

  const hasChildGrowthData = useMemo(
    () =>
      growthData.some((g) =>
        growthMetric === "weight" ? g.weightKg != null : g.heightCm != null
      ),
    [growthData, growthMetric]
  );

  // ---- PDFs ----
  const [pdfs, setPdfs] = useState<Array<{ name: string; url: string }>>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [errorPdfs, setErrorPdfs] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // --------- CONSULTAS (Supabase) ---------
  async function loadConsultations() {
    // used in the *guardian* section (patient portal).
    // the doctor area uses `loadConsultationsForChild` instead.
    setLoadingConsults(true);
    setErrorConsults(null);
    try {
      // a criança selecionada pelo responsável é salva no localStorage
      const selectedChildId = localStorage.getItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`
      );

      if (!selectedChildId) {
        // nada a buscar se não tiver filho escolhido
        setConsults([]);
        setErrorConsults("Selecione um filho na aba 'Meus filhos' para ver as consultas.");
        return;
      }

      const { data, error } = await supabase
        .from("consultations")
        .select(
          "id, child_id, child_name, date, conduta, orientacoes, retorno, exames, receitas, pdf_url, weight, height, head_circumference"
        )
        .eq("child_id", selectedChildId) // filtrar pela criança
        .order("date", { ascending: false });

      if (error) throw error;

      const mapped: ConsultationSummary[] = (data ?? []).map((r: any) => ({
        id: String(r.id),
        dateISO: String(r.date),
        childName: String(r.child_name),
        conduta: String(r.conduta ?? ""),
        orientacoes: String(r.orientacoes ?? ""),
        retorno: String(r.retorno ?? ""),
        exames: String(r.exames ?? ""),
        receitas: String(r.receitas ?? ""),
        pdfUrl: r.pdf_url ?? null,
        weight: r.weight ?? undefined,
        height: r.height ?? undefined,
        headCircumference: r.head_circumference ?? undefined,
      }));

      setConsults(mapped);
    } catch (e: any) {
      setErrorConsults(e?.message ?? "Falha ao carregar consultas.");
      setConsults([]);
    } finally {
      setLoadingConsults(false);
    }
  }

  // --------- CRESCIMENTO (busca no Supabase) ---------
  async function loadGrowthData() {
    setLoadingGrowth(true);
    setErrorGrowth(null);
    setGrowthChildName("");
    setGrowthChild(null);
    setGrowthData([]);

    try{
      const selectedChildId = localStorage.getItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`
      );

      if (!selectedChildId) {
        setErrorGrowth("Selecione um filho na aba 'Meus filhos' para ver o crescimento.");
        return;
      }

      // pega nome + nascimento do paciente
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("name,birth_date,sex")
        .eq("id", selectedChildId)
        .single();

      if (childError) throw childError;

      const childName = String(childData.name);
      const birthDateStr = String(childData.birth_date);
      const birthDate = new Date(birthDateStr);

      setGrowthChildName(childName);
      setGrowthChild({
        id: selectedChildId,
        name: childName,
        birthDate: birthDateStr,
        sex: (childData as any).sex || "M",
      });

      // medidas de crescimento
      const { data, error } = await supabase
        .from("growth_records")
        .select("date, weight_kg, height_cm")
        .eq("child_id", selectedChildId)
        .order("date", { ascending: true });

      if (error) throw error;

      const mapped =
        data?.map((r: any) => {
          const d = new Date(r.date);
          // idade em meses aproximada
          const yearsDiff = d.getFullYear() - birthDate.getFullYear();
          const monthsDiff = d.getMonth() - birthDate.getMonth();
          const daysDiff = d.getDate() - birthDate.getDate();
          let ageMonths = yearsDiff * 12 + monthsDiff;
          if (daysDiff < 0) {
            ageMonths -= 1;
          }
          if (ageMonths < 0) ageMonths = 0;

          return {
            dateISO: String(r.date),
            ageMonths,
            weightKg:
              r.weight_kg != null ? Number(String(r.weight_kg)) : null,
            heightCm:
              r.height_cm != null ? Number(String(r.height_cm)) : null,
          };
        }) ?? [];

      setGrowthData(mapped);
    } catch (e: any) {
      console.error(e);
      setErrorGrowth(e?.message ?? "Falha ao carregar dados de crescimento.");
      setGrowthData([]);
    } finally {
      setLoadingGrowth(false);
    }
  }

  // --------- PDFs ---------
  async function loadPdfs() {
    setLoadingPdfs(true);
    setErrorPdfs(null);

    try {
      const selectedChildId = localStorage.getItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`
      );

      if (!selectedChildId) {
        setErrorPdfs("Selecione um filho na aba 'Meus filhos' para ver os PDFs.");
        setPdfs([]);
        return;
      }

      const { data, error } = await supabase.storage
        .from(PDF_BUCKET)
        .list(selectedChildId, {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      const list = (data ?? []).map((f: any) => {
        const path = `${selectedChildId}/${f.name}`;
        const { data: publicData } = supabase
          .storage
          .from(PDF_BUCKET)
          .getPublicUrl(path);

        return {
          name: f.name as string,
          url: publicData.publicUrl as string,
        };
      });

      setPdfs(list);
    } catch (e: any) {
      console.error(e);
      setErrorPdfs(e?.message ?? "Falha ao carregar PDFs.");
      setPdfs([]);
    } finally {
      setLoadingPdfs(false);
    }
  }

  // quando mudar subtab, carrega o que precisa
  useEffect(() => {
    if (subtab === "consults") {
      loadConsultations();
    } else if (subtab === "growth") {
      loadGrowthData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtab, user.email]);

  // Ouve eventos de atualização (ex: quando uma consulta grava medidas)
  useEffect(() => {
    function handleGrowthUpdate(e: Event) {
      try {
        const ev: any = e as any;
        const selectedChildId = localStorage.getItem(
          `rbgp_selected_child_${user.email.toLowerCase()}`
        );
        if (!selectedChildId) return;
        if (!ev?.detail) {
          loadGrowthData();
          return;
        }
        if (ev.detail.childId && ev.detail.childId === selectedChildId) {
          loadGrowthData();
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener("rbgp_growth_updated", handleGrowthUpdate as EventListener);
    return () => window.removeEventListener("rbgp_growth_updated", handleGrowthUpdate as EventListener);
  }, [user.email]);

  useEffect(() => {
    if (subtab === "pdf") {
      loadPdfs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtab, user.email]);

  // upload de PDF
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const selectedChildId = localStorage.getItem(
        `rbgp_selected_child_${user.email.toLowerCase()}`
      );

      if (!selectedChildId) {
        alert("Escolha primeiro um filho na aba 'Meus filhos'.");
        return;
      }

      setUploading(true);

      const filePath = `${selectedChildId}/${Date.now()}_${file.name}`;

      const { error } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error(error);
        alert("Erro ao enviar PDF: " + error.message);
        return;
      }

      alert("PDF enviado com sucesso!");
      await loadPdfs();
    } catch (err: any) {
      console.error(err);
      alert("Erro inesperado ao enviar PDF: " + (err?.message ?? "desconhecido"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }



  const tabs = [
    { key: "pdf" as const, label: "PDFs", icon: <UploadCloud className="h-4 w-4" /> },
    { key: "consults" as const, label: "Consultas", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "growth" as const, label: "Crescimento", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">
            Documentos / Informações
          </div>
          <div className="mt-1 text-sm text-slate-500">
            PDFs + Consultas + Crescimento.
          </div>
        </div>
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubtab(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold",
              subtab === t.key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- ABA PDFs ---- */}
      {subtab === "pdf" && (
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  PDFs do paciente selecionado
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Use a aba <b>Meus filhos</b> para escolher a criança antes de
                  enviar/ver PDFs.
                </div>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-50">
                  <UploadCloud className="h-4 w-4" />
                  <span>{uploading ? "Enviando..." : "Enviar PDF"}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {loadingPdfs ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Carregando PDFs...
              </div>
            ) : errorPdfs ? (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
                {errorPdfs}
              </div>
            ) : pdfs.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhum PDF encontrado para o filho selecionado.
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {pdfs.map((p) => (
                  <a
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">Abrir</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---- ABA CONSULTAS ---- */}
      {subtab === "consults" && (
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Consultas (registradas pelo pediatra)
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Mostrando registros salvos na tabela consultations.
                </div>
              </div>
              <Pill
                icon={<FileText className="h-4 w-4" />}
                label={`${consults.length} registro(s)`}
              />
            </div>

           

            {loadingConsults ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Carregando consultas...
              </div>
            ) : errorConsults ? (
              <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                {errorConsults}
              </div>
            ) : consults.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma consulta registrada ainda.
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {consults.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {c.childName}
                      </div>
                      <Pill
                        icon={<CalendarDays className="h-4 w-4" />}
                        label={formatDateBR(c.dateISO)}
                      />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      {c.weight && (
                        <div>
                          <b>Peso:</b> {c.weight} kg
                        </div>
                      )}  
                      {c.height && (
                        <div>
                          <b>Altura:</b> {c.height} cm
                        </div>
                      )}
                      {c.headCircumference && (
                        <div>
                          <b>Perímetro cefálico:</b> {c.headCircumference} cm
                        </div>
                      )}
                      {c.conduta && (
                        <div>
                          <b>Conduta:</b> {c.conduta}
                        </div>
                      )}
                      {c.orientacoes && (
                        <div>
                          <b>Orientações:</b> {c.orientacoes}
                        </div>
                      )}
                      {c.retorno && (
                        <div>
                          <b>Retorno:</b> {c.retorno}
                        </div>
                      )}
                      {c.exames && (
                        <div>
                          <b>Exames:</b> {c.exames}
                        </div>
                      )}
                      {c.receitas && (
                        <div>
                          <b>Receituário:</b> {c.receitas}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---- ABA CRESCIMENTO ---- */}
      {subtab === "growth" && (
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Crescimento
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Curva de referência da OMS (p5, p50, p95) por idade em meses —
                  comparação com medidas lançadas na tela <b>Gravar consulta</b>.
                </div>
                {growthChildName && (
                  <div className="mt-1 text-xs text-slate-600">
                    Paciente: <b>{growthChildName}</b>
                  </div>
                )}
              </div>

              <div className="inline-flex rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setGrowthMetric("weight")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs md:text-sm font-semibold",
                    growthMetric === "weight"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  )}
                >
                  Peso (kg)
                </button>
                <button
                  type="button"
                  onClick={() => setGrowthMetric("height")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs md:text-sm font-semibold",
                    growthMetric === "height"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600"
                  )}
                >
                  Altura (cm)
                </button>
              </div>
            </div>

            {loadingGrowth ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Carregando dados de crescimento...
              </div>
            ) : errorGrowth ? (
              <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                {errorGrowth}
              </div>
            ) : (
              <>
                <div className="mt-4 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={growthChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="ageMonths"
                        tickFormatter={(v) => (v === 0 ? "Nasc" : `${v}m`)}
                        label={{
                          value: "Idade (meses)",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis
                        label={{
                          value: growthMetric === "weight" ? "Peso (kg)" : "Altura (cm)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                     
                      <Tooltip
                        formatter={(value, name) => {
                          if (typeof value !== "number") return ["", ""];
                          let label = name;
                          if (name === "p5" || name === "p95") label = `Percentil ${name === "p5" ? 5 : 95}`;
                          if (name === "p50") label = "Média (p50)";
                          if (name === "child") label = growthChildName || "Paciente";
                          return [value, label];
                        }}
                        labelFormatter={(label) => {
                          if (label === 0) return "Nascimento";
                          return `Idade: ${label} meses`;
                        }}
                      />

                      <Legend />
                      {/* linhas WHO */}
                      <Line
                        type="monotone"
                        dataKey="p5"
                        stroke="#cbd5e1"
                        strokeDasharray="5 5"
                        dot={false}
                        name="Percentil 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="p50"
                        stroke="#94a3b8"
                        strokeDasharray="5 5"
                        dot={false}
                        name="Média (p50)"
                      />
                      <Line
                        type="monotone"
                        dataKey="p95"
                        stroke="#cbd5e1"
                        strokeDasharray="5 5"
                        dot={false}
                        name="Percentil 95"
                      />
                      {/* linha real da criança */}
                      <Line
                        type="monotone"
                        dataKey="child"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 6, fill: '#2563eb' }}
                        name={growthChildName || "Paciente"}
                        activeDot={{ r: 8 }}
                      />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  {!hasChildGrowthData && (
                    <div>
                      Ainda não há medidas de {growthMetric === "weight" ? "peso" : "altura"} registradas
                      para este paciente. A linha do paciente aparecerá assim que
                      você lançar peso/altura em <b>Gravar consulta</b>.
                    </div>
                  )}
                  <div>
                    As linhas pontilhadas representam os percentis 5, 50 e 95 da OMS
                    para a idade. Os valores são buscados automaticamente com base no
                    sexo e na idade (em meses) do paciente.
                  </div>
                  <div>
                    Linha <b>{growthChildName || "Paciente"}</b> = medidas lançadas
                    a partir das consultas (tabela <code>growth_records</code>).
                  </div>
                  <div>
                    ⚠️ Uso apenas ilustrativo. Para decisão clínica, consulte as curvas
                    oficiais e adapte conforme sua rotina.
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
} // <-- ADDED: missing closing brace for DocumentsInfoMock

// ---------- Área do Pediatra ----------
// ---------- Área do Pediatra ----------
function DoctorHome({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  // Adicionado "settings" no estado inicial
  const [tab, setTab] = useState<
    | "patients"
    | "agenda"
    | "record"
    | "growth"
    | "development"
    | "vaccines"
    | "availability"
    | "medicines"
    | "doc_prescription"
    | "doc_exam"
    | "doc_certificate"
    | "doc_report"
    | "settings"
  >("patients");

  // estado local para exibir banner de plano
  const [planStatus, setPlanStatus] = useState<string>("Carregando");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/plan-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        const data = await res.json();
        const s: string = data.status ?? "Cancelado";
        setPlanStatus(s);
        if (s !== "Ativo") {
          setTab("settings");
        }
      } catch (err) {
        console.error("failed to load plan status", err);
        setPlanStatus("Cancelado");
      }
    }
    load();
    window.addEventListener("rbgp_plan_updated", load);
    return () => window.removeEventListener("rbgp_plan_updated", load);
  }, [user.email]);

  return (
    <div className="grid gap-6">
      <Card>
        {planStatus !== "Ativo" && planStatus !== "Carregando" && (
          <div className="mb-4 rounded-xl bg-rose-100 p-3 text-sm text-rose-800">
            Seu plano está <b>{planStatus.toLowerCase()}</b>. Vá em <b>Configurações / Plano</b> para ativar
            ou renovar (modo de teste).
          </div>
        )}
        <CardHeader
          title={BRAND.name}
          subtitle="Área do Pediatra"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Pill icon={<Stethoscope className="h-4 w-4" />} label={user.email} />
              <Button variant="secondary" onClick={onLogout}>
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          }
        />
        <div className="p-5">
          {/* Menu de Abas Atualizado */}
          <div className="flex flex-wrap items-center gap-2 border-b pb-4 mb-2">
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("patients");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "patients" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <Users className="inline h-4 w-4 mr-2" /> Pacientes
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("agenda");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "agenda" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <CalendarDays className="inline h-4 w-4 mr-2" /> Consultas
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("record");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "record" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <ClipboardList className="inline h-4 w-4 mr-2" /> Atender
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("growth");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "growth" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <BarChart3 className="inline h-4 w-4 mr-2" /> Gráfico
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("development");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "development" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <BarChart3 className="inline h-4 w-4 mr-2" /> Desenvolvimento
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("vaccines");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "vaccines" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <ShieldCheck className="inline h-4 w-4 mr-2" /> Vacinas
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("medicines");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "medicines" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <FileText className="inline h-4 w-4 mr-2" /> Medicamentos
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("doc_prescription");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "doc_prescription" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <FileText className="inline h-4 w-4 mr-2" /> Receituário
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("doc_exam");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "doc_exam" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <FileText className="inline h-4 w-4 mr-2" /> Solicitação de exames
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("doc_certificate");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "doc_certificate" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <FileText className="inline h-4 w-4 mr-2" /> Atestado
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("doc_report");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "doc_report" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <FileText className="inline h-4 w-4 mr-2" /> Relatório médico
            </button>
            <button
              onClick={() => {
                if (planStatus !== "Ativo") {
                  alert("Plano inativo. Ative em Configurações para usar.");
                  return;
                }
                setTab("availability");
              }}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "availability" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <Clock className="inline h-4 w-4 mr-2" /> Disponibilidade
            </button>
            {/* NOVA ABA DE CONFIGURAÇÕES */}
            <button
              onClick={() => setTab("settings")}
              className={cn("px-4 py-2 rounded-xl text-sm font-semibold transition", tab === "settings" ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50")}
            >
              <Settings className="inline h-4 w-4 mr-2" /> Configurações / Plano
            </button>
          </div>

          {/* Conteúdo das Abas */}
          {tab === "patients" && <DoctorPatients />}
          {tab === "agenda" && <DoctorAppointments />}
          {tab === "availability" && <DoctorAvailability />}
          {tab === "record" && <RecordConsultationMock doctorEmail={user.email} />}
          {tab === "growth" && <DoctorGrowthDashboard />}
          {tab === "development" && <DoctorDevelopmentTracker doctorEmail={user.email} />}
          {tab === "vaccines" && <DoctorVaccineTracker doctorEmail={user.email} />}
          {tab === "medicines" && <DoctorMedicineFinder />}
          {tab === "doc_prescription" && <DoctorDocumentComposer doctorEmail={user.email} kind="prescription" />}
          {tab === "doc_exam" && <DoctorDocumentComposer doctorEmail={user.email} kind="exam" />}
          {tab === "doc_certificate" && <DoctorDocumentComposer doctorEmail={user.email} kind="certificate" />}
          {tab === "doc_report" && <DoctorDocumentComposer doctorEmail={user.email} kind="report" />}
          {tab === "settings" && <DoctorSettings user={user} />}
        </div>
      </Card>
    </div>
  );
}
function DoctorSettings({ user }: { user: AppUser }) {
  const [planStatus, setPlanStatus] = useState("Carregando");
  const [planRenewalDate, setPlanRenewalDate] = useState<string | null>(null);
  const [planActiveSince, setPlanActiveSince] = useState<string | null>(null);
  const [planStripeStatus, setPlanStripeStatus] = useState<string | null>(null);
  const [planCancelAtPeriodEnd, setPlanCancelAtPeriodEnd] = useState(false);
  const [planCancelAt, setPlanCancelAt] = useState<string | null>(null);
  const [planSource, setPlanSource] = useState<string>("-");
  const [refreshingPlan, setRefreshingPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfDoctorName, setPdfDoctorName] = useState("");
  const [pdfRegistration, setPdfRegistration] = useState("");
  const [pdfClinicAddress, setPdfClinicAddress] = useState("");
  const [pdfClinicPhone, setPdfClinicPhone] = useState("");
  const [pdfLogoBase64, setPdfLogoBase64] = useState("");

  async function loadPlanStatus(showErrorAlert = false) {
    setRefreshingPlan(true);
    try {
      const res = await fetch("/api/plan-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao buscar plano");
      }

      setPlanStatus(data.status ?? "Cancelado");
      setPlanRenewalDate(data.renewalDate ?? null);
      setPlanActiveSince(data.activeSince ?? null);
      setPlanStripeStatus(data.stripeStatus ?? null);
      setPlanCancelAtPeriodEnd(Boolean(data.cancelAtPeriodEnd));
      setPlanCancelAt(data.cancelAt ?? null);
      setPlanSource(String(data.source || "-"));
    } catch (err) {
      console.error("failed to load plan status", err);
      setPlanStatus("Cancelado");
      setPlanRenewalDate(null);
      setPlanActiveSince(null);
      setPlanStripeStatus(null);
      setPlanCancelAtPeriodEnd(false);
      setPlanCancelAt(null);
      setPlanSource("-");
      if (showErrorAlert) {
        alert(`Não foi possível atualizar o plano: ${err instanceof Error ? err.message : "erro desconhecido"}`);
      }
    } finally {
      setRefreshingPlan(false);
    }
  }

  useEffect(() => {
    loadPlanStatus(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);

  const activeTimeText = useMemo(() => {
    if (!planActiveSince) return "—";
    const start = new Date(planActiveSince).getTime();
    if (Number.isNaN(start)) return "—";
    const now = Date.now();
    const days = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    if (days <= 0) return "Hoje";
    if (days === 1) return "1 dia";
    return `${days} dias`;
  }, [planActiveSince]);

  useEffect(() => {
    const settings = getDoctorPdfSettings(user.email);
    setPdfDoctorName(settings.doctorName);
    setPdfRegistration(settings.registration);
    setPdfClinicAddress(settings.clinicAddress);
    setPdfClinicPhone(settings.clinicPhone);
    setPdfLogoBase64(settings.logoBase64);
  }, [user.email]);

  const handleSavePdfSettings = () => {
    const base = getDoctorPdfSettings(user.email);
    saveDoctorPdfSettings(user.email, {
      ...base,
      doctorName: pdfDoctorName.trim(),
      registration: pdfRegistration.trim(),
      clinicAddress: pdfClinicAddress.trim(),
      clinicPhone: pdfClinicPhone.trim(),
      logoBase64: pdfLogoBase64.trim(),
    });
    alert("Personalização do PDF salva com sucesso.");
  };

  const handleCancelPlan = async () => {
    if (!confirm("Deseja realmente cancelar sua assinatura Premium?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: (user as any).subscriptionId, email: user.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao cancelar assinatura");
      }

      setPlanStatus("Cancelado");
      setPlanRenewalDate(null);
      setPlanCancelAtPeriodEnd(false);
      setPlanCancelAt(null);
      alert("Renovação automática cancelada.");
      window.dispatchEvent(new Event("rbgp_plan_updated"));
    } catch (err) {
      console.error(err);
      alert(`Falha ao cancelar: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao iniciar checkout");
      }

      const { url } = data;
      setPlanStatus("Carregando");
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert(`Erro ao iniciar checkout: ${err instanceof Error ? err.message : "erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 grid gap-6 md:grid-cols-2">
      {/* CARD DO PLANO */}
      <Card className="p-6 border-blue-100 bg-blue-50/30">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-600 p-3 rounded-2xl text-white">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Plano Profissional</h3>
            <p className="text-sm text-slate-500">Acesso ilimitado e PDF com Logotipo</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Status da Assinatura</span>
            <span className={cn(
              "text-xs font-bold px-2 py-1 rounded-lg",
              planStatus === "Ativo" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}>
              {planStatus.toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Assinatura Confirmada</span>
            <span className="text-sm font-bold text-slate-900">
              {planStatus === "Ativo" && planRenewalDate ? "Sim" : "Não"}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Método de Pagamento</span>
            <span className="text-sm font-bold text-slate-900">Cartão de Crédito</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Renovação da Assinatura</span>
            <span className="text-sm font-bold text-slate-900">
              {planRenewalDate ? formatDateBR(planRenewalDate) : "—"}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Tempo ativo</span>
            <span className="text-sm font-bold text-slate-900">{activeTimeText}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Status Stripe</span>
            <span className="text-sm font-bold text-slate-900">{planStripeStatus ? planStripeStatus.toUpperCase() : "—"}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Cancelamento agendado</span>
            <span className="text-sm font-bold text-slate-900">{planCancelAtPeriodEnd ? "Sim" : "Não"}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Encerra em</span>
            <span className="text-sm font-bold text-slate-900">{planCancelAt ? formatDateBR(planCancelAt) : "—"}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600 font-medium">Fonte de validação</span>
            <span className="text-sm font-bold text-slate-900">{planSource === "stripe" ? "Stripe" : planSource === "supabase" ? "Supabase" : "—"}</span>
          </div>
        </div>

        <button
          onClick={() => loadPlanStatus(true)}
          disabled={refreshingPlan || loading}
          className="mt-4 flex items-center gap-2 text-xs text-slate-700 font-bold hover:text-slate-900 transition"
        >
          {refreshingPlan ? "Atualizando status..." : "ATUALIZAR STATUS AGORA"}
        </button>

        {planStatus === "Ativo" && (
          <button 
            onClick={handleCancelPlan}
            disabled={loading}
            className="mt-6 flex items-center gap-2 text-xs text-rose-600 font-bold hover:text-rose-700 transition"
          >
            <XCircle size={14} /> {loading ? "Processando..." : "CANCELAR ASSINATURA"}
          </button>
        )}
        {planStatus !== "Ativo" && (
          <button
            onClick={handleActivatePlan}
            disabled={loading}
            className="mt-6 flex items-center gap-2 text-xs text-emerald-600 font-bold hover:text-emerald-700 transition"
          >
            {loading ? "Processando..." : "ATIVAR PLANO"}
          </button>
        )}
      </Card>

      {/* CARD DE PERSONALIZAÇÃO DO PDF */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-slate-800 p-3 rounded-2xl text-white">
            <Settings size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Personalização</h3>
            <p className="text-sm text-slate-500">Configurações de identidade visual</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input 
            label="Nome exibido no PDF" 
            value={pdfDoctorName}
            onChange={setPdfDoctorName}
          />
          <Input 
            label="Registro (CRM/RQE)" 
            value={pdfRegistration}
            onChange={setPdfRegistration}
          />
          <Input
            label="Telefone"
            value={pdfClinicPhone}
            onChange={setPdfClinicPhone}
          />
          <TextArea
            label="Endereço"
            value={pdfClinicAddress}
            onChange={setPdfClinicAddress}
            placeholder="Endereço exibido no cabeçalho do PDF"
          />
          <TextArea
            label="Logo em Base64"
            value={pdfLogoBase64}
            onChange={setPdfLogoBase64}
            placeholder="Cole aqui no formato data:image/png;base64,..."
          />
          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>Nota:</strong> Salvo por e-mail do médico. PNG e JPEG em data URL funcionam (ex.: data:image/png;base64,...).
            </p>
          </div>
          <Button onClick={handleSavePdfSettings}>
            Salvar personalização do PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
// Lista de pacientes para o pediatra (usa a mesma tabela children)

function DoctorPatients() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
const [openCreate, setOpenCreate] = useState(false);

  const [selectedChildId, setSelectedChildId] = useState<string>("");

  // Consultas do paciente selecionado
  const [consults, setConsults] = useState<ConsultationSummary[]>([]);
  const [loadingConsults, setLoadingConsults] = useState(false);
  const [errConsults, setErrConsults] = useState<string | null>(null);

  // PDFs do paciente selecionado
  const [pdfs, setPdfs] = useState<Array<{ name: string; url: string }>>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [errPdfs, setErrPdfs] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // 🔸 ajuste o nome do bucket se o seu for diferente no Supabase
  const PDF_BUCKET_NAME = "child-docs";

async function loadChildren() {
  setLoading(true);
  setErr(null);
  try {
    // filtra apenas os filhos vinculados ao médico logado
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const currentDoctorId = authData.user?.id;
    if (!currentDoctorId) {
      setErr("Sessão expirada. Faça login novamente.");
      setChildren([]);
      setSelectedChildId("");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("children")
      .select("id,name,birth_date,sex,guardian_email,guardian_phone,doctor_id")
      .eq("doctor_id", currentDoctorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped: Child[] = (data ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      birthDate: String(r.birth_date),
      sex: (r.sex as Child["sex"]) ?? "O",
      guardianEmail: (r.guardian_email as string) ?? null,
      guardianPhone: (r.guardian_phone as string) ?? null,
    }));

    setChildren(mapped);
    setSelectedChildId((prev) => {
      if (prev && mapped.some((c) => c.id === prev)) return prev;
      return mapped[0]?.id ?? "";
    });
  } catch (e: any) {
    setErr(e?.message ?? "Falha ao carregar pacientes.");
    setChildren([]);
    setSelectedChildId("");
  } finally {
    setLoading(false);
  }
}



  // Carregar consultas de um paciente
  async function loadConsultationsForChild(childId: string) {
    if (!childId) {
      setConsults([]);
      setErrConsults(null);
      return;
    }

    setLoadingConsults(true);
    setErrConsults(null);
    try {
      const { data, error } = await supabase
  .from("consultations")
  .select(
    "id, child_id, child_name, date, conduta, orientacoes, retorno, exames, receitas, pdf_url, weight, height, head_circumference"
  )
  .eq("child_id", childId)
  .order("date", { ascending: false });

const mapped: ConsultationSummary[] = (data ?? []).map((r: any) => ({
  id: String(r.id),
  dateISO: String(r.date),
  childName: String(r.child_name),
  conduta: String(r.conduta ?? ""),
  orientacoes: String(r.orientacoes ?? ""),
  retorno: String(r.retorno ?? ""),
  exames: String(r.exames ?? ""),
  receitas: String(r.receitas ?? ""),
  pdfUrl: r.pdf_url ?? null,
  weight: r.weight ?? undefined,
  height: r.height ?? undefined,
  headCircumference: r.head_circumference ?? undefined,
}));

      setConsults(mapped);
    } catch (e: any) {
      setErrConsults(e?.message ?? "Falha ao carregar consultas desse paciente.");
      setConsults([]);
    } finally {
      setLoadingConsults(false);
    }
  }

  // Carregar PDFs de um paciente
  async function loadPdfsForChild(childId: string) {
    if (!childId) {
      setPdfs([]);
      setErrPdfs(null);
      return;
    }

    setLoadingPdfs(true);
    setErrPdfs(null);

    try {
      const { data, error } = await supabase.storage
        .from(PDF_BUCKET_NAME)
        .list(childId, {
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      const list = (data ?? []).map((f: any) => {
        const path = `${childId}/${f.name}`;
        const { data: publicData } = supabase
          .storage
          .from(PDF_BUCKET_NAME)
          .getPublicUrl(path);

        return {
          name: f.name as string,
          url: publicData.publicUrl as string,
        };
      });

      setPdfs(list);
    } catch (e: any) {
      console.error(e);
      setErrPdfs(e?.message ?? "Falha ao carregar PDFs desse paciente.");
      setPdfs([]);
    } finally {
      setLoadingPdfs(false);
    }
  }

  // Upload de PDF feito pelo pediatra para o paciente selecionado
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedChildId) {
      alert("Selecione um paciente na lista antes de enviar o PDF.");
      return;
    }

    try {
      setUploadingPdf(true);

      const filePath = `${selectedChildId}/${Date.now()}_${file.name}`;

      const { error } = await supabase.storage
        .from(PDF_BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error(error);
        alert("Erro ao enviar PDF: " + error.message);
        return;
      }

      alert("PDF enviado com sucesso para o paciente!");
      await loadPdfsForChild(selectedChildId);
    } catch (err: any) {
      console.error(err);
      alert("Erro inesperado ao enviar PDF: " + (err?.message ?? "desconhecido"));
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  }


async function createPatient(data: any) {
  setLoading(true);
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentDoctorId = authData.user?.id;

    if (!currentDoctorId) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    const { error } = await supabase.from("children").insert({
      name: data.name.trim(),
      birth_date: data.birthDate,
      sex: data.sex,
      guardian_email: data.guardianEmail.trim().toLowerCase(),
      guardian_phone: data.guardianPhone.trim() || null,
      doctor_id: currentDoctorId // ✅ Vincula o médico logado
    });

    if (error) throw error;
    alert("Paciente cadastrado!");
    setOpenCreate(false);
    loadChildren();
  } catch (e: any) {
    alert(e.message);
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
    loadChildren();
  }, []);

  // sempre que mudar o paciente selecionado, recarrega consultas e PDFs
  useEffect(() => {
    if (!selectedChildId) return;
    loadConsultationsForChild(selectedChildId);
    loadPdfsForChild(selectedChildId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? null;

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      {err ? (
        <div className="md:col-span-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {err}
        </div>
      ) : null}

      {/* Lista de pacientes (esquerda) */}
      <Card className="md:col-span-1">
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
  <div>
    <div className="text-sm font-semibold text-slate-900">
      Pacientes (children do Supabase)
    </div>
    <div className="mt-1 text-sm text-slate-500">
      Clique em um paciente para ver consultas e PDFs.
    </div>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="secondary" onClick={loadChildren} disabled={loading}>
      Recarregar
    </Button>
    <Button onClick={() => setOpenCreate(true)} disabled={loading}>
      <Plus className="h-4 w-4" /> Cadastrar paciente
    </Button>
  </div>
</div>

          {loading ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Carregando...
            </div>
          ) : children.length === 0 ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Nenhuma criança cadastrada ainda.
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                    selectedChildId === c.id
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {c.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Nasc.: {formatDateBR(c.birthDate)} • Sexo: {c.sex}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Detalhes do paciente selecionado (direita) */}
      <Card className="md:col-span-2">
        <div className="p-5">
          {!selectedChild ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Selecione um paciente à esquerda para ver consultas e PDFs.
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Header do paciente */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill icon={<Baby className="h-4 w-4" />} label={selectedChild.name} />
                  <Pill
                    icon={<CalendarDays className="h-4 w-4" />}
                    label={`Nasc.: ${formatDateBR(selectedChild.birthDate)}`}
                  />
                  <Pill
                    icon={<ShieldCheck className="h-4 w-4" />}
                    label={`Sexo: ${selectedChild.sex}`}
                  />
                  {selectedChild.guardianEmail && (
  <Pill
    icon={<Mail className="h-4 w-4" />}
    label={selectedChild.guardianEmail}
  />
)}

{selectedChild.guardianPhone && (
  <Pill
    icon={<Phone className="h-4 w-4" />}
    label={selectedChild.guardianPhone}
  />
)}

                </div>

                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs md:text-sm font-semibold text-slate-900 cursor-pointer hover:bg-slate-50">
                  <UploadCloud className="h-4 w-4" />
                  <span>{uploadingPdf ? "Enviando PDF..." : "Enviar PDF para este paciente"}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                    disabled={uploadingPdf}
                  />
                </label>
              </div>

              {/* Consultas */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-slate-600" />
                    <div className="text-sm font-semibold text-slate-900">
                      Consultas desse paciente
                    </div>
                  </div>
                  <Pill
                    icon={<FileText className="h-4 w-4" />}
                    label={`${consults.length} registro(s)`}
                  />
                </div>

                {loadingConsults ? (
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                    Carregando consultas...
                  </div>
                ) : errConsults ? (
                  <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
                    {errConsults}
                  </div>
                ) : consults.length === 0 ? (
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                    Nenhuma consulta registrada ainda para este paciente.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {consults.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold">{c.childName}</div>
                          <Pill
                            icon={<CalendarDays className="h-4 w-4" />}
                            label={formatDateBR(c.dateISO)}
                          />
                        </div>
                        <div className="mt-2 grid gap-1">
                          {c.weight && (
                            <div>
                              <b>Peso:</b> {c.weight} kg
                            </div>
                          )}
                          {c.height && (
                            <div>
                              <b>Altura:</b> {c.height} cm
                            </div>
                          )}
                          {c.headCircumference && (
                            <div>
                              <b>Perímetro cefálico:</b> {c.headCircumference} cm
                            </div>
                          )}
                        {c.conduta && (
                            <div>
                              <b>Conduta:</b> {c.conduta}
                            </div>
                          )}
                          {c.orientacoes && (
                            <div>
                              <b>Orientações:</b> {c.orientacoes}
                            </div>
                          )}
                          {c.retorno && (
                            <div>
                              <b>Retorno:</b> {c.retorno}
                            </div>
                          )}
                          {c.exames && (
                            <div>
                              <b>Exames:</b> {c.exames}
                            </div>
                          )}
                          {c.receitas && (
                            <div>
                              <b>Receituário:</b> {c.receitas}
                            </div>
                          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
  {/* Só mostra "Abrir" e "Copiar link" se existir URL */}
  {c.pdfUrl && (
    <>
      <a
        href={c.pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Abrir PDF da consulta
      </a>

      <button
        type="button"
        onClick={() => handleCopyConsultPdfLink(c.pdfUrl!)}
        className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
      >
        Copiar link
      </button>
    </>
  )}

  {/* 👇 ESTE botão agora aparece SEMPRE */}
  <button
    type="button"
    onClick={() =>
      handleSendWhatsAppConsult(
        c.pdfUrl ?? null,
        c.childName,
        selectedChild.guardianPhone // usa o telefone salvo
      )
    }
    className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
  >
    Enviar via WhatsApp
  </button>

<button
  type="button"
  onClick={() => handleSendEmailConsult(c.pdfUrl!, c.childName, selectedChild?.guardianEmail)}
  className="rounded-xl bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
>
  Enviar por e-mail
</button>

  {/* Mensagem se ainda não tiver PDF vinculado */}
  {!c.pdfUrl && (
    <span className="text-[11px] text-slate-500">
      Esta consulta ainda não tem PDF salvo no sistema.  
      Use “Salvar consulta em PDF” na tela Gravar consulta.
    </span>
  )}
</div>


                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              

              {/* PDFs */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <div className="text-sm font-semibold text-slate-900">
                      PDFs desse paciente
                    </div>
                  </div>
                </div>

                {loadingPdfs ? (
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                    Carregando PDFs...
                  </div>
                ) : errPdfs ? (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
                    {errPdfs}
                  </div>
                ) : pdfs.length === 0 ? (
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                    Nenhum PDF enviado ainda para este paciente.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {pdfs.map((p) => (
                      <a
                        key={p.url}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">Abrir</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
      <DoctorCreatePatientModal
  open={openCreate}
  onClose={() => setOpenCreate(false)}
  onCreate={createPatient}
/>
    </div>
  );
}

function DoctorCreatePatientModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    birthDate: string;
    sex: Child["sex"];
    guardianEmail: string;
    guardianPhone: string; 
    doctor_id: string;
  // 👈 ADDED doctor_id aqui
  }) => void;
}) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<Child["sex"]>("M");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setBirthDate("");
    setSex("M");
    setGuardianEmail("");
    setGuardianPhone("");
  }, [open]);

  return (
    <Modal
      open={open}
      title="Cadastrar paciente"
      subtitle="Cadastro feito pelo pediatra, vinculado depois ao responsável."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <Input
          label="Nome da criança"
          value={name}
          onChange={setName}
          placeholder="Ex: João Silva"
        />
        <Input
          label="Data de nascimento"
          value={birthDate}
          onChange={setBirthDate}
          type="date"
        />
        <Select
          label="Sexo"
          value={sex}
          onChange={(v) => setSex(v as Child["sex"])}
          options={[
            { label: "Masculino", value: "M" },
            { label: "Feminino", value: "F" },
            { label: "Outro", value: "O" },
            
          ]}
        />
        <Input
          label="E-mail do responsável"
          value={guardianEmail}
          onChange={setGuardianEmail}
          type="email"
          placeholder="responsavel@exemplo.com"
        />
        <Input
          label="Telefone do responsável"
          value={guardianPhone}
          onChange={setGuardianPhone}
          type="tel"
          placeholder="(DDD) 99999-9999"
        />

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onCreate({
                name,
                birthDate,
                sex,
                guardianEmail,
                guardianPhone,
                doctor_id: "doctor-uuid", // 👈 ADDED doctor_id aqui
              })
            }
          >
            Salvar paciente
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DoctorAvailability() {
  type AvailabilityItem = {
    id: string;
    start_at: string;
    end_at: string;
    is_active: boolean;
    duration_minutes?: number;
  };

  const RECIFE_OFFSET = "-03:00";
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<string>(
    today.toISOString().slice(0, 10)
  );
  const [doctorEmail, setDoctorEmail] = useState<string>("");
  const [slotDurationMin, setSlotDurationMin] = useState<string>("30");
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  // slots dinâmicos conforme duração escolhida (dia inteiro)
  const slots: string[] = useMemo(() => {
    const generated: string[] = [];
    const step = Math.max(5, Number(slotDurationMin) || 30);
    const start = 0;
    const end = 24;
    for (let minutes = start * 60; minutes < end * 60; minutes += step) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      generated.push(`${pad2(h)}:${pad2(m)}`);
    }

    const existing = items.map((a) => {
      const d = new Date(a.start_at);
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    });

    return Array.from(new Set([...generated, ...existing])).sort();
  }, [slotDurationMin, items]);

  function dayBounds(dateStr: string) {
    const start = `${dateStr}T00:00:00${RECIFE_OFFSET}`;
    const end = `${dateStr}T23:59:59${RECIFE_OFFSET}`;
    return { start, end };
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setDoctorEmail((data.user?.email || "").toLowerCase());
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function load() {
    if (!selectedDate || !doctorEmail) return;
    setLoading(true);
    setErr(null);
    try {
      const { start, end } = dayBounds(selectedDate);

      const { data, error } = await supabase
        .from("doctor_availability")
        .select("id,start_at,end_at,is_active,duration_minutes")
        .eq("is_active", true)
        .eq("doctor_email", doctorEmail)
        .gte("start_at", start)
        .lte("start_at", end)
        .order("start_at", { ascending: true });

      let rows: any[] | null = data as any[] | null;
      if (error) {
        if (
          (error.message || "").toLowerCase().includes("doctor_email") ||
          (error.message || "").toLowerCase().includes("duration_minutes")
        ) {
          const legacy = await supabase
            .from("doctor_availability")
            .select("id,start_at,end_at,is_active")
            .eq("is_active", true)
            .gte("start_at", start)
            .lte("start_at", end)
            .order("start_at", { ascending: true });
          if (legacy.error) throw legacy.error;
          rows = legacy.data;
        } else {
          throw error;
        }
      }

      setItems(
        (rows ?? []).map((r: any) => ({
          id: String(r.id),
          start_at: String(r.start_at),
          end_at: String(r.end_at),
          is_active: Boolean(r.is_active),
          duration_minutes:
            Number(r.duration_minutes ?? 0) ||
            Math.max(
              0,
              Math.round(
                (new Date(String(r.end_at)).getTime() - new Date(String(r.start_at)).getTime()) /
                  60000
              )
            ) ||
            30,
        }))
      );
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Falha ao carregar disponibilidade.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, doctorEmail]);

  // mapa HH:MM -> id da availability ativa naquele horário
  const slotMap = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((a) => {
      const d = new Date(a.start_at);
      const hh = pad2(d.getHours());
      const mm = pad2(d.getMinutes());
      const key = `${hh}:${mm}`;
      m.set(key, a.id);
    });
    return m;
  }, [items]);

  function recifeISO(dateStr: string, hh: number, mm: number) {
    return `${dateStr}T${pad2(hh)}:${pad2(mm)}:00${RECIFE_OFFSET}`;
  }

  async function toggleSlot(slot: string) {
    if (!selectedDate || !doctorEmail) return;
    setLoading(true);
    try {
      const existingId = slotMap.get(slot);

      const [hhStr, mmStr] = slot.split(":");
      const hh = Number(hhStr);
      const mm = Number(mmStr);

      if (existingId) {
        // desativa
        const { error } = await supabase
          .from("doctor_availability")
          .update({ is_active: false })
          .eq("id", existingId)
          .eq("doctor_email", doctorEmail);

        if (error) {
          if ((error.message || "").toLowerCase().includes("doctor_email")) {
            const legacy = await supabase
              .from("doctor_availability")
              .update({ is_active: false })
              .eq("id", existingId);
            if (legacy.error) throw legacy.error;
          } else {
            throw error;
          }
        }
      } else {
        // cria disponibilidade
        const start_at = recifeISO(selectedDate, hh, mm);
        const duration = Math.max(5, Number(slotDurationMin) || 30);
        const endMinutes = hh * 60 + mm + duration;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        const end_at = recifeISO(selectedDate, endH, endM);

        let { error } = await supabase.from("doctor_availability").insert({
          start_at,
          end_at,
          is_active: true,
          doctor_email: doctorEmail,
          duration_minutes: duration,
        });

        if (
          error &&
          ((error.message || "").toLowerCase().includes("doctor_email") ||
            (error.message || "").toLowerCase().includes("duration_minutes"))
        ) {
          const legacy = await supabase.from("doctor_availability").insert({
            start_at,
            end_at,
            is_active: true,
          });
          error = legacy.error;
        }

        if (error) throw error;
      }

      await load();
    } catch (e: any) {
      console.error(e);
      if ((e?.message || "").toLowerCase().includes("row-level security")) {
        alert(
          "Erro de permissão (RLS) na tabela doctor_availability. " +
            "Crie/ajuste a policy para permitir insert/update do médico logado."
        );
        return;
      }
      alert(
        "Erro ao atualizar disponibilidade: " +
          (e?.message ?? "desconhecido")
      );
    } finally {
      setLoading(false);
    }
  }

  // limite de 60 dias na agenda do médico (só pro input date)
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  }, []);

  return (
    <div className="mt-5 grid gap-4">
      {err ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {err}
        </div>
      ) : null}

      <Card>
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Disponibilidade do dia
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Clique nos horários para ativar/desativar a agenda desse dia
                (blocos com a duração escolhida).
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                label="Data"
                value={selectedDate}
                onChange={setSelectedDate}
                type="date"
              />
              <Select
                label="Duração"
                value={slotDurationMin}
                onChange={setSlotDurationMin}
                options={[
                  { label: "15 min", value: "15" },
                  { label: "20 min", value: "20" },
                  { label: "30 min", value: "30" },
                  { label: "45 min", value: "45" },
                  { label: "60 min", value: "60" },
                ]}
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Carregando...
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {slots.map((s) => {
                const active = slotMap.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSlot(s)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-semibold",
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    )}
                    disabled={loading}
                  >
                    {s} {active ? "• Disponível" : ""}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-xs text-slate-500">
            O paciente só verá horários:{" "}
            <b>com disponibilidade ativa</b>, <b>não ocupados</b> e{" "}
            <b>dentro de 60 dias</b>.
          </div>
        </div>
      </Card>
    </div>
  );
}

type DoctorDocumentKind = "prescription" | "exam" | "certificate" | "report";

type MedicineOffer = {
  title: string;
  price: number;
  storeName: string;
  url: string;
};

type MedicineSearchPayload = {
  query: string;
  lowestPrice: MedicineOffer | null;
  offers: MedicineOffer[];
  priceWarning?: string | null;
  leaflet: {
    title: string;
    summary: string;
    sourceUrl: string;
  } | null;
  leafletSearchUrl: string;
};

type DevelopmentMilestone = {
  id: string;
  title: string;
  howTo: string;
  minMonth: number;
  maxMonth: number;
};

type DevelopmentMark = {
  acquired: boolean;
  acquiredMonth: string;
};

type VaccineSection = "ate12" | "apos12" | "campanhas";

type VaccineScheduleItem = {
  id: string;
  section: VaccineSection;
  vaccine: string;
  dose: string;
  minMonth: number;
  maxMonth: number;
};

type VaccineMark = {
  done: boolean;
};

const VACCINE_SCHEDULE: VaccineScheduleItem[] = [
  { id: "vac_001", section: "ate12", vaccine: "BCG", dose: "Dose única", minMonth: 0, maxMonth: 1 },
  { id: "vac_002", section: "ate12", vaccine: "Hepatite B", dose: "Dose ao nascer", minMonth: 0, maxMonth: 1 },
  { id: "vac_003", section: "ate12", vaccine: "Penta", dose: "1ª dose", minMonth: 2, maxMonth: 2 },
  { id: "vac_004", section: "ate12", vaccine: "Penta", dose: "2ª dose", minMonth: 4, maxMonth: 4 },
  { id: "vac_005", section: "ate12", vaccine: "Penta", dose: "3ª dose", minMonth: 6, maxMonth: 6 },
  { id: "vac_006", section: "ate12", vaccine: "Rotavírus humano", dose: "1ª dose", minMonth: 2, maxMonth: 2 },
  { id: "vac_007", section: "ate12", vaccine: "Rotavírus humano", dose: "2ª dose", minMonth: 4, maxMonth: 4 },
  { id: "vac_008", section: "ate12", vaccine: "Pneumocócica 10V (conjugada)", dose: "1ª dose", minMonth: 2, maxMonth: 2 },
  { id: "vac_009", section: "ate12", vaccine: "Pneumocócica 10V (conjugada)", dose: "2ª dose", minMonth: 4, maxMonth: 4 },
  { id: "vac_010", section: "ate12", vaccine: "VIP", dose: "1ª dose", minMonth: 2, maxMonth: 2 },
  { id: "vac_011", section: "ate12", vaccine: "VIP", dose: "2ª dose", minMonth: 4, maxMonth: 4 },
  { id: "vac_012", section: "ate12", vaccine: "VIP", dose: "3ª dose", minMonth: 6, maxMonth: 6 },
  { id: "vac_013", section: "ate12", vaccine: "Meningocócica C (conjugada)", dose: "1ª dose", minMonth: 3, maxMonth: 3 },
  { id: "vac_014", section: "ate12", vaccine: "Meningocócica C (conjugada)", dose: "2ª dose", minMonth: 5, maxMonth: 5 },
  { id: "vac_015", section: "ate12", vaccine: "Febre amarela", dose: "Dose", minMonth: 9, maxMonth: 9 },
  { id: "vac_016", section: "ate12", vaccine: "Tríplice viral", dose: "1ª dose", minMonth: 12, maxMonth: 12 },
  { id: "vac_017", section: "ate12", vaccine: "Covid-19", dose: "1ª dose", minMonth: 6, maxMonth: 8 },
  { id: "vac_018", section: "ate12", vaccine: "Covid-19", dose: "2ª dose", minMonth: 7, maxMonth: 9 },
  { id: "vac_019", section: "ate12", vaccine: "Covid-19", dose: "3ª dose", minMonth: 8, maxMonth: 11 },
  { id: "vac_020", section: "apos12", vaccine: "Pneumocócica 10V (conjugada)", dose: "Reforço", minMonth: 12, maxMonth: 15 },
  { id: "vac_021", section: "apos12", vaccine: "Meningocócica C (conjugada)", dose: "Reforço", minMonth: 12, maxMonth: 15 },
  { id: "vac_022", section: "apos12", vaccine: "DTP", dose: "1º reforço", minMonth: 15, maxMonth: 18 },
  { id: "vac_023", section: "apos12", vaccine: "DTP", dose: "2º reforço", minMonth: 48, maxMonth: 60 },
  { id: "vac_024", section: "apos12", vaccine: "VOP", dose: "1º reforço", minMonth: 15, maxMonth: 18 },
  { id: "vac_025", section: "apos12", vaccine: "VOP", dose: "2º reforço", minMonth: 48, maxMonth: 60 },
  { id: "vac_026", section: "apos12", vaccine: "Tetraviral", dose: "Dose única", minMonth: 15, maxMonth: 15 },
  { id: "vac_027", section: "apos12", vaccine: "Varicela", dose: "Uma dose", minMonth: 48, maxMonth: 60 },
  { id: "vac_028", section: "apos12", vaccine: "Febre amarela", dose: "Dose de reforço", minMonth: 48, maxMonth: 60 },
  { id: "vac_029", section: "apos12", vaccine: "Hepatite A", dose: "Uma dose", minMonth: 15, maxMonth: 24 },
  { id: "vac_030", section: "apos12", vaccine: "HPV", dose: "1ª dose", minMonth: 108, maxMonth: 168 },
  { id: "vac_031", section: "apos12", vaccine: "HPV", dose: "2ª dose", minMonth: 114, maxMonth: 174 },
  { id: "vac_032", section: "apos12", vaccine: "Pneumocócica 23V (povos indígenas)", dose: "Uma dose", minMonth: 24, maxMonth: 999 },
  { id: "vac_033", section: "campanhas", vaccine: "Influenza", dose: "Anual", minMonth: 6, maxMonth: 999 },
  { id: "vac_034", section: "campanhas", vaccine: "Dengue", dose: "1ª dose", minMonth: 120, maxMonth: 168 },
  { id: "vac_035", section: "campanhas", vaccine: "Dengue", dose: "2ª dose", minMonth: 123, maxMonth: 171 },
];

const DEVELOPMENT_MILESTONES: DevelopmentMilestone[] = [
  {
    id: "m01",
    title: "Postura: pernas e braços fletidos, cabeça lateralizada",
    howTo: "Deite em superfície plana e observe se mantém flexão dos membros e cabeça lateralizada.",
    minMonth: 0,
    maxMonth: 0,
  },
  {
    id: "m02",
    title: "Observa um rosto",
    howTo: "Aproxime seu rosto (~30cm) e observe contato visual.",
    minMonth: 0,
    maxMonth: 0,
  },
  {
    id: "m03",
    title: "Reage ao som",
    howTo: "Produza som suave próximo às orelhas e observe reação.",
    minMonth: 0,
    maxMonth: 0,
  },
  {
    id: "m04",
    title: "Eleva a cabeça",
    howTo: "Em decúbito ventral, observe se eleva a cabeça.",
    minMonth: 0,
    maxMonth: 0,
  },
  {
    id: "m05",
    title: "Sorri quando estimulada",
    howTo: "Converse e sorria para a criança, observando resposta.",
    minMonth: 1,
    maxMonth: 2,
  },
  {
    id: "m06",
    title: "Abre as mãos",
    howTo: "Observe espontaneamente em diferentes momentos.",
    minMonth: 1,
    maxMonth: 2,
  },
  {
    id: "m07",
    title: "Emite sons",
    howTo: "Observe vocalizações simples no ambiente domiciliar ou consulta.",
    minMonth: 1,
    maxMonth: 2,
  },
  {
    id: "m08",
    title: "Movimenta os membros",
    howTo: "Observe movimentação ativa de membros superiores e inferiores.",
    minMonth: 1,
    maxMonth: 2,
  },
  {
    id: "m09",
    title: "Responde ativamente ao contato social",
    howTo: "Converse com o bebê e observe resposta social e sons.",
    minMonth: 3,
    maxMonth: 4,
  },
  {
    id: "m10",
    title: "Segura objetos",
    howTo: "Toque dorso da mão com objeto e observe preensão.",
    minMonth: 3,
    maxMonth: 4,
  },
  {
    id: "m11",
    title: "Emite sons, ri alto",
    howTo: "Observe risadas e sons com interação social.",
    minMonth: 3,
    maxMonth: 4,
  },
  {
    id: "m12",
    title: "Levanta a cabeça e apoia-se nos antebraços, de bruços",
    howTo: "Em decúbito ventral, observar apoio em antebraços.",
    minMonth: 3,
    maxMonth: 4,
  },
  {
    id: "m13",
    title: "Busca ativa de objetos",
    howTo: "Mostre objeto ao alcance visual e observe tentativa de alcance.",
    minMonth: 5,
    maxMonth: 6,
  },
  {
    id: "m14",
    title: "Leva objetos à boca",
    howTo: "Ofereça objeto seguro na mão e observe exploração oral.",
    minMonth: 5,
    maxMonth: 6,
  },
  {
    id: "m15",
    title: "Localiza o som",
    howTo: "Produza som suave e observe orientação da cabeça.",
    minMonth: 5,
    maxMonth: 6,
  },
  {
    id: "m16",
    title: "Muda de posição (rola)",
    howTo: "Observe rolar durante estímulo em superfície plana.",
    minMonth: 5,
    maxMonth: 6,
  },
  {
    id: "m17",
    title: "Brinca de esconde-achou",
    howTo: "Brinque de aparecer/desaparecer e observe procura.",
    minMonth: 6,
    maxMonth: 8,
  },
  {
    id: "m18",
    title: "Transfere objetos de uma mão para outra",
    howTo: "Ofereça objeto e observe transferência manual.",
    minMonth: 6,
    maxMonth: 8,
  },
  {
    id: "m19",
    title: "Duplica sílabas",
    howTo: "Observe emissão de sílabas repetidas (ex.: da-da).",
    minMonth: 6,
    maxMonth: 8,
  },
  {
    id: "m20",
    title: "Senta-se sem apoio",
    howTo: "Observe se mantém sedestação sem apoio manual.",
    minMonth: 6,
    maxMonth: 8,
  },
  {
    id: "m21",
    title: "Imita gestos",
    howTo: "Demonstre gestos simples e observe imitação.",
    minMonth: 10,
    maxMonth: 12,
  },
  {
    id: "m22",
    title: "Faz pinça",
    howTo: "Observe preensão de objeto pequeno com polegar/indicador.",
    minMonth: 10,
    maxMonth: 12,
  },
  {
    id: "m23",
    title: "Produz jargão",
    howTo: "Observe vocalização com padrão de conversa sem palavras claras.",
    minMonth: 10,
    maxMonth: 12,
  },
  {
    id: "m24",
    title: "Anda com apoio",
    howTo: "Observe passos com apoio em móvel/adulto.",
    minMonth: 10,
    maxMonth: 12,
  },
  {
    id: "m25",
    title: "Mostra o que quer",
    howTo: "Observe se aponta/estende mão para comunicar desejo.",
    minMonth: 13,
    maxMonth: 15,
  },
  {
    id: "m26",
    title: "Coloca blocos na caneca",
    howTo: "Demonstre e observe se coloca blocos em recipiente.",
    minMonth: 13,
    maxMonth: 15,
  },
  {
    id: "m27",
    title: "Diz uma palavra",
    howTo: "Observe emissão de pelo menos uma palavra com significado.",
    minMonth: 13,
    maxMonth: 15,
  },
  {
    id: "m28",
    title: "Anda sem apoio",
    howTo: "Observe marcha independente com equilíbrio.",
    minMonth: 13,
    maxMonth: 15,
  },
  {
    id: "m29",
    title: "Usa colher ou garfo",
    howTo: "Observe autoalimentação com utensílio.",
    minMonth: 16,
    maxMonth: 18,
  },
  {
    id: "m30",
    title: "Constrói torre de 2 cubos",
    howTo: "Observe se empilha dois cubos sem derrubar imediatamente.",
    minMonth: 16,
    maxMonth: 18,
  },
  {
    id: "m31",
    title: "Fala 3 palavras",
    howTo: "Observe uso de três palavras com significado.",
    minMonth: 16,
    maxMonth: 18,
  },
  {
    id: "m32",
    title: "Anda para trás",
    howTo: "Solicite deslocamento curto para trás e observe execução.",
    minMonth: 16,
    maxMonth: 18,
  },
];

function DoctorDevelopmentTracker({ doctorEmail }: { doctorEmail: string }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [evalDate, setEvalDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, DevelopmentMark>>({});
  const [pdfUrl, setPdfUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sendPhone, setSendPhone] = useState("");
  const [sendEmail, setSendEmail] = useState("");

  const doctorPdf = useMemo(() => getDoctorPdfSettings(doctorEmail), [doctorEmail]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === patientId) ?? null,
    [children, patientId]
  );

  useEffect(() => {
    const initial: Record<string, DevelopmentMark> = {};
    DEVELOPMENT_MILESTONES.forEach((item) => {
      initial[item.id] = { acquired: false, acquiredMonth: "" };
    });
    setMarks(initial);
  }, []);

  useEffect(() => {
    setSendPhone(selectedChild?.guardianPhone ?? "");
    setSendEmail(selectedChild?.guardianEmail ?? "");
  }, [selectedChild?.guardianPhone, selectedChild?.guardianEmail]);

  async function loadChildren() {
    setLoadingChildren(true);
    try {
      let data: any[] | null = null;
      let error: any = null;

      ({ data, error } = await supabase
        .from("children")
        .select("id,name,birth_date,sex,guardian_email,guardian_phone")
        .order("created_at", { ascending: false }));

      if (error && /guardian_email|guardian_phone/i.test(String(error.message || ""))) {
        ({ data, error } = await supabase
          .from("children")
          .select("id,name,birth_date,sex")
          .order("created_at", { ascending: false }));
      }

      if (error) throw error;

      const mapped: Child[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        birthDate: String(row.birth_date || ""),
        sex: (row.sex as Child["sex"]) ?? "O",
        guardianEmail: row.guardian_email ? String(row.guardian_email) : null,
        guardianPhone: row.guardian_phone ? String(row.guardian_phone) : null,
      }));

      setChildren(mapped);
      if (!patientId && mapped[0]?.id) {
        setPatientId(mapped[0].id);
      }
    } catch (err: any) {
      alert(`Erro ao carregar pacientes: ${err?.message || "desconhecido"}`);
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  }

  useEffect(() => {
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ageMonths = useMemo(() => {
    if (!selectedChild?.birthDate || !evalDate) return null;
    const birth = new Date(selectedChild.birthDate);
    const ref = new Date(evalDate);
    if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return null;
    let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
    if (ref.getDate() < birth.getDate()) months -= 1;
    return Math.max(0, months);
  }, [selectedChild?.birthDate, evalDate]);

  const visibleMilestones = useMemo(() => {
    if (ageMonths == null) return DEVELOPMENT_MILESTONES;
    return DEVELOPMENT_MILESTONES.filter((item) => item.minMonth <= ageMonths);
  }, [ageMonths]);

  function updateMark(id: string, patch: Partial<DevelopmentMark>) {
    setMarks((prev) => ({
      ...prev,
      [id]: {
        acquired: prev[id]?.acquired ?? false,
        acquiredMonth: prev[id]?.acquiredMonth ?? "",
        ...patch,
      },
    }));
  }

  function getStatus(item: DevelopmentMilestone, mark: DevelopmentMark | undefined) {
    if (!mark?.acquired) {
      return { label: "Pendente", className: "bg-slate-100 text-slate-700" };
    }

    const month = Number(mark.acquiredMonth);
    if (!Number.isFinite(month)) {
      return { label: "Sem idade", className: "bg-amber-100 text-amber-800" };
    }

    if (month >= item.minMonth && month <= item.maxMonth) {
      return { label: "Adequado", className: "bg-emerald-100 text-emerald-800" };
    }

    return { label: "Fora da faixa", className: "bg-rose-100 text-rose-800" };
  }

  const summary = useMemo(() => {
    let adequate = 0;
    let outOfRange = 0;
    let pending = 0;

    visibleMilestones.forEach((item) => {
      const status = getStatus(item, marks[item.id]);
      if (status.label === "Adequado") adequate += 1;
      else if (status.label === "Fora da faixa") outOfRange += 1;
      else pending += 1;
    });

    return { adequate, outOfRange, pending };
  }, [marks, visibleMilestones]);

  function buildPdfBlob() {
    if (!selectedChild) throw new Error("Selecione um paciente.");
    const child = selectedChild;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const tableWidth = pageWidth - marginX * 2;
    const colWidths = [82, 24, 18, 20, 46];
    const rowPaddingY = 2.5;
    const lineHeight = 4.2;
    let y = 12;

    function drawTopHeader() {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(doctorPdf.doctorName, marginX, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${doctorPdf.specialty} • ${doctorPdf.registration}`, marginX, y, { maxWidth: pageWidth - marginX * 2 });
      y += 4.5;
      doc.text(`${doctorPdf.clinicName} • ${doctorPdf.clinicPhone}`, marginX, y, { maxWidth: pageWidth - marginX * 2 });
      y += 6;

      doc.setLineWidth(0.3);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 7;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Marcos do desenvolvimento infantil", pageWidth / 2, y, { align: "center" });
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Paciente: ${child.name}`, marginX, y);
      y += 4.8;
      doc.text(`Data da avaliação: ${formatDateBR(evalDate)}${ageMonths != null ? ` • Idade: ${ageMonths} meses` : ""}`, marginX, y);
      y += 6;
    }

    function drawSummaryCards() {
      const cardW = (tableWidth - 6) / 3;
      const cardH = 12;
      const baseY = y;
      const cards = [
        { label: "Adequados", value: summary.adequate, fill: [220, 252, 231], text: [6, 95, 70] },
        { label: "Fora da faixa", value: summary.outOfRange, fill: [254, 226, 226], text: [127, 29, 29] },
        { label: "Pendentes", value: summary.pending, fill: [241, 245, 249], text: [51, 65, 85] },
      ];

      cards.forEach((card, idx) => {
        const x = marginX + idx * (cardW + 3);
        doc.setFillColor(card.fill[0], card.fill[1], card.fill[2]);
        doc.roundedRect(x, baseY, cardW, cardH, 1.5, 1.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(card.text[0], card.text[1], card.text[2]);
        doc.text(card.label, x + 2, baseY + 4.5);

        doc.setFontSize(11);
        doc.text(String(card.value), x + 2, baseY + 9.5);
      });

      doc.setTextColor(15, 23, 42);
      y += cardH + 5;
    }

    function drawLegend() {
      const items = [
        { label: "Adequado", fill: [220, 252, 231] as [number, number, number] },
        { label: "Fora da faixa", fill: [254, 226, 226] as [number, number, number] },
        { label: "Pendente", fill: [241, 245, 249] as [number, number, number] },
      ];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Legenda:", marginX, y);

      let x = marginX + 18;
      items.forEach((item) => {
        doc.setFillColor(item.fill[0], item.fill[1], item.fill[2]);
        doc.rect(x, y - 3.5, 4, 4, "F");
        doc.setFont("helvetica", "normal");
        doc.text(item.label, x + 6, y);
        x += 42;
      });
      y += 7;
    }

    function drawTableHeader() {
      const headers = ["Marco", "Faixa", "Adquiriu", "Idade", "Status"];
      const headerH = 8;

      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, y, tableWidth, headerH, "F");

      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, y, tableWidth, headerH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);

      let x = marginX;
      headers.forEach((header, idx) => {
        doc.text(header, x + 1.5, y + 5.2);
        x += colWidths[idx];
        if (idx < headers.length - 1) {
          doc.line(x, y, x, y + headerH);
        }
      });

      y += headerH;
    }

    function drawRow(item: DevelopmentMilestone, index: number) {
      const mark = marks[item.id] ?? { acquired: false, acquiredMonth: "" };
      const status = getStatus(item, mark);
      const faixa = `${item.minMonth}-${item.maxMonth}m`;
      const adquiriu = mark.acquired ? "Sim" : "Não";
      const idade = mark.acquiredMonth || "-";

      const marcoLines = doc.splitTextToSize(`${index + 1}. ${item.title}`, colWidths[0] - 3);
      const statusLines = doc.splitTextToSize(status.label, colWidths[4] - 3);
      const lineCount = Math.max(marcoLines.length, statusLines.length, 1);
      const rowH = lineCount * lineHeight + rowPaddingY * 2;

      if (y + rowH > pageHeight - 14) {
        doc.addPage();
        y = 14;
        drawTableHeader();
      }

      if (status.label === "Adequado") {
        doc.setFillColor(240, 253, 244);
        doc.rect(marginX, y, tableWidth, rowH, "F");
      } else if (status.label === "Fora da faixa") {
        doc.setFillColor(254, 242, 242);
        doc.rect(marginX, y, tableWidth, rowH, "F");
      } else {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, tableWidth, rowH, "F");
      }

      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, y, tableWidth, rowH);

      let x = marginX;
      for (let i = 0; i < colWidths.length - 1; i += 1) {
        x += colWidths[i];
        doc.line(x, y, x, y + rowH);
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);

      const textY = y + rowPaddingY + lineHeight - 0.5;

      doc.text(marcoLines, marginX + 1.5, textY);
      doc.text(faixa, marginX + colWidths[0] + 1.5, textY);
      doc.text(adquiriu, marginX + colWidths[0] + colWidths[1] + 1.5, textY);
      doc.text(idade, marginX + colWidths[0] + colWidths[1] + colWidths[2] + 1.5, textY);
      doc.text(statusLines, marginX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 1.5, textY);

      y += rowH;
    }

    drawTopHeader();
    drawSummaryCards();
    drawLegend();
    drawTableHeader();

    visibleMilestones.forEach((item, index) => {
      drawRow(item, index);
    });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Uso clínico de apoio. Correlacionar com exame pediátrico completo.", marginX, pageHeight - 7);

    return doc.output("blob");
  }

  async function handleGeneratePdf() {
    if (!selectedChild) {
      alert("Selecione um paciente.");
      return;
    }

    setGenerating(true);
    try {
      const blob = buildPdfBlob();
      const fileName = `desenvolvimento_${selectedChild.id}_${Date.now()}.pdf`;
      const filePath = `${selectedChild.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("child-docs")
        .upload(filePath, blob, { contentType: "application/pdf", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("child-docs").getPublicUrl(filePath);
      setPdfUrl(data.publicUrl);

      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(localUrl);

      alert("PDF de desenvolvimento gerado com sucesso.");
    } catch (err: any) {
      alert(`Erro ao gerar PDF: ${err?.message || "desconhecido"}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4">
      <Card>
        <div className="p-5 grid gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Marcos do desenvolvimento</div>
            <div className="mt-1 text-sm text-slate-500">
              Marque os marcos adquiridos na idade (em meses) e gere o PDF para envio ao responsável.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Paciente"
              value={patientId}
              onChange={setPatientId}
              options={
                children.length === 0
                  ? [{ label: loadingChildren ? "Carregando..." : "Nenhuma criança cadastrada", value: "" }]
                  : children.map((c) => ({ label: c.name, value: c.id }))
              }
            />
            <Input label="Data da avaliação" value={evalDate} onChange={setEvalDate} type="date" />
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              <b>Adequados:</b> {summary.adequate}
            </div>
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
              <b>Fora da faixa:</b> {summary.outOfRange}
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <b>Pendentes:</b> {summary.pending}
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 ring-1 ring-blue-200">
              <b>Idade atual:</b> {ageMonths == null ? "—" : `${ageMonths} meses`}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Mostrando {visibleMilestones.length} marcos até a idade correspondente
            {ageMonths == null ? " do paciente" : ` (${ageMonths} meses)`}.
          </div>

          <div className="overflow-auto rounded-xl ring-1 ring-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Marco</th>
                  <th className="px-3 py-2 text-left">Faixa esperada</th>
                  <th className="px-3 py-2 text-left">Adquiriu</th>
                  <th className="px-3 py-2 text-left">Idade (meses)</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleMilestones.map((item) => {
                  const mark = marks[item.id] ?? { acquired: false, acquiredMonth: "" };
                  const status = getStatus(item, mark);

                  return (
                    <tr key={item.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 min-w-[320px]">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-600 mt-1">{item.howTo}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {item.minMonth}-{item.maxMonth} meses
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={mark.acquired}
                          onChange={(e) =>
                            updateMark(item.id, {
                              acquired: e.target.checked,
                              acquiredMonth: e.target.checked ? mark.acquiredMonth : "",
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={24}
                          value={mark.acquiredMonth}
                          onChange={(e) =>
                            updateMark(item.id, {
                              acquiredMonth: e.target.value,
                              acquired: e.target.value.trim() ? true : mark.acquired,
                            })
                          }
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex rounded-lg px-2 py-1 text-xs font-semibold", status.className)}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Telefone (WhatsApp)"
              value={sendPhone}
              onChange={setSendPhone}
              placeholder="(DDD) 99999-9999"
            />
            <Input
              label="E-mail do responsável"
              value={sendEmail}
              onChange={setSendEmail}
              type="email"
              placeholder="responsavel@exemplo.com"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 break-all">
            <b>Link do PDF:</b> {pdfUrl || "Gere o PDF para criar o link."}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={handleGeneratePdf} disabled={generating || !patientId}>
              {generating ? "Gerando PDF..." : "Gerar PDF"}
            </Button>

            <Button
              variant="secondary"
              onClick={async () => {
                if (!pdfUrl) {
                  alert("Gere o PDF antes de copiar o link.");
                  return;
                }
                try {
                  await navigator.clipboard.writeText(pdfUrl);
                  alert("Link copiado!");
                } catch {
                  alert("Não consegui copiar automaticamente.");
                }
              }}
              disabled={!pdfUrl}
            >
              Copiar link
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleSendWhatsAppConsult(pdfUrl, `desenvolvimento de ${selectedChild?.name || "paciente"}`, sendPhone)}
              disabled={!pdfUrl}
            >
              Enviar por WhatsApp
            </Button>

            <Button
              onClick={() => handleSendEmailConsult(pdfUrl, `desenvolvimento de ${selectedChild?.name || "paciente"}`, sendEmail)}
              disabled={!pdfUrl}
            >
              Enviar por e-mail
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DoctorVaccineTracker({ doctorEmail }: { doctorEmail: string }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [marks, setMarks] = useState<Record<string, VaccineMark>>({});
  const [pdfUrl, setPdfUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sendPhone, setSendPhone] = useState("");
  const [sendEmail, setSendEmail] = useState("");

  const doctorPdf = useMemo(() => getDoctorPdfSettings(doctorEmail), [doctorEmail]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === patientId) ?? null,
    [children, patientId]
  );

  useEffect(() => {
    const initial: Record<string, VaccineMark> = {};
    VACCINE_SCHEDULE.forEach((item) => {
      initial[item.id] = { done: false };
    });
    setMarks(initial);
  }, []);

  useEffect(() => {
    setSendPhone(selectedChild?.guardianPhone ?? "");
    setSendEmail(selectedChild?.guardianEmail ?? "");
  }, [selectedChild?.guardianPhone, selectedChild?.guardianEmail]);

  async function loadChildren() {
    setLoadingChildren(true);
    try {
      let data: any[] | null = null;
      let error: any = null;

      ({ data, error } = await supabase
        .from("children")
        .select("id,name,birth_date,sex,guardian_email,guardian_phone")
        .order("created_at", { ascending: false }));

      if (error && /guardian_email|guardian_phone/i.test(String(error.message || ""))) {
        ({ data, error } = await supabase
          .from("children")
          .select("id,name,birth_date,sex")
          .order("created_at", { ascending: false }));
      }

      if (error) throw error;

      const mapped: Child[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        birthDate: String(row.birth_date || ""),
        sex: (row.sex as Child["sex"]) ?? "O",
        guardianEmail: row.guardian_email ? String(row.guardian_email) : null,
        guardianPhone: row.guardian_phone ? String(row.guardian_phone) : null,
      }));

      setChildren(mapped);
      if (!patientId && mapped[0]?.id) {
        setPatientId(mapped[0].id);
      }
    } catch (err: any) {
      alert(`Erro ao carregar pacientes: ${err?.message || "desconhecido"}`);
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  }

  useEffect(() => {
    loadChildren();
  }, []);

  const ageMonths = useMemo(() => {
    if (!selectedChild?.birthDate) return null;
    const birth = new Date(selectedChild.birthDate);
    const ref = new Date();
    if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return null;
    let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
    if (ref.getDate() < birth.getDate()) months -= 1;
    return Math.max(0, months);
  }, [selectedChild?.birthDate]);

  function getVaccineStatus(item: VaccineScheduleItem, mark: VaccineMark | undefined) {
    if (mark?.done) {
      return { label: "Realizada", className: "bg-emerald-100 text-emerald-800" };
    }

    if (ageMonths == null) {
      return { label: "Pendente", className: "bg-slate-100 text-slate-700" };
    }

    if (ageMonths > item.maxMonth) {
      return { label: "Em atraso", className: "bg-rose-100 text-rose-800" };
    }

    if (ageMonths >= item.minMonth) {
      return { label: "Prevista e pendente", className: "bg-amber-100 text-amber-800" };
    }

    return { label: "Ainda não prevista", className: "bg-blue-100 text-blue-800" };
  }

  const summary = useMemo(() => {
    let done = 0;
    let duePending = 0;
    let future = 0;

    VACCINE_SCHEDULE.forEach((item) => {
      const status = getVaccineStatus(item, marks[item.id]);
      if (status.label === "Realizada") done += 1;
      else if (status.label === "Prevista e pendente" || status.label === "Em atraso") duePending += 1;
      else future += 1;
    });

    return { done, duePending, future };
  }, [marks, ageMonths]);

  const groupedRows = useMemo(() => {
    const bySection: Record<VaccineSection, VaccineScheduleItem[]> = {
      ate12: [],
      apos12: [],
      campanhas: [],
    };

    VACCINE_SCHEDULE.forEach((item) => {
      bySection[item.section].push(item);
    });

    return bySection;
  }, []);

  function updateMark(id: string, patch: Partial<VaccineMark>) {
    setMarks((prev) => ({
      ...prev,
      [id]: {
        done: prev[id]?.done ?? false,
        ...patch,
      },
    }));
  }

  function buildPdfBlob() {
    if (!selectedChild) throw new Error("Selecione um paciente.");
    const child = selectedChild;

    const pdfMaxMonth = ageMonths == null ? Number.POSITIVE_INFINITY : ageMonths + 3;
    const pdfRows: Record<VaccineSection, VaccineScheduleItem[]> = {
      ate12: groupedRows.ate12.filter((item) => item.minMonth <= pdfMaxMonth),
      apos12: groupedRows.apos12.filter((item) => item.minMonth <= pdfMaxMonth),
      campanhas: groupedRows.campanhas.filter((item) => item.minMonth <= pdfMaxMonth),
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const tableWidth = pageWidth - marginX * 2;
    const colWidths = [74, 30, 24, 52];
    const lineHeight = 4.2;
    let y = 12;

    function ensurePage(nextHeight: number) {
      if (y + nextHeight <= pageHeight - 12) return;
      doc.addPage();
      y = 12;
      drawTableHeader();
    }

    function drawTableHeader() {
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, y, tableWidth, 8, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, y, tableWidth, 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);

      const headers = ["Vacina", "Dose", "Faixa", "Status"];
      let x = marginX;
      headers.forEach((header, idx) => {
        doc.text(header, x + 1.3, y + 5.1);
        x += colWidths[idx];
        if (idx < headers.length - 1) {
          doc.line(x, y, x, y + 8);
        }
      });

      y += 8;
    }

    function drawSectionTitle(title: string) {
      ensurePage(9);
      doc.setFillColor(226, 232, 240);
      doc.rect(marginX, y, tableWidth, 7, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, y, tableWidth, 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.6);
      doc.setTextColor(30, 41, 59);
      doc.text(title, marginX + 1.6, y + 4.8);
      y += 7;
      doc.setTextColor(15, 23, 42);
    }

    function drawRow(item: VaccineScheduleItem, index: number) {
      const mark = marks[item.id] ?? { done: false };
      const status = getVaccineStatus(item, mark);
      const faixa = `${item.minMonth}-${item.maxMonth}m`;

      const vaccineText = `${index + 1}. ${item.vaccine}`;
      const vaccineLines = doc.splitTextToSize(vaccineText, colWidths[0] - 3);
      const statusLines = doc.splitTextToSize(status.label, colWidths[3] - 3);
      const rowLines = Math.max(vaccineLines.length, statusLines.length, 1);
      const rowHeight = rowLines * lineHeight + 5;

      ensurePage(rowHeight);

      if (status.label === "Realizada") {
        doc.setFillColor(240, 253, 244);
      } else if (status.label === "Prevista e pendente" || status.label === "Em atraso") {
        doc.setFillColor(254, 242, 242);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(marginX, y, tableWidth, rowHeight, "F");

      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, y, tableWidth, rowHeight);

      let x = marginX;
      for (let i = 0; i < colWidths.length - 1; i += 1) {
        x += colWidths[i];
        doc.line(x, y, x, y + rowHeight);
      }

      const textY = y + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(vaccineLines, marginX + 1.4, textY);
      doc.text(item.dose, marginX + colWidths[0] + 1.4, textY);
      doc.text(faixa, marginX + colWidths[0] + colWidths[1] + 1.4, textY);
      doc.text(statusLines, marginX + colWidths[0] + colWidths[1] + colWidths[2] + 1.4, textY);

      y += rowHeight;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(doctorPdf.doctorName, marginX, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${doctorPdf.specialty} • ${doctorPdf.registration}`, marginX, y, { maxWidth: pageWidth - marginX * 2 });
    y += 4.5;
    doc.text(`${doctorPdf.clinicName} • ${doctorPdf.clinicPhone}`, marginX, y, { maxWidth: pageWidth - marginX * 2 });
    y += 6;

    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Registro de Vacinação", pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Paciente: ${child.name}`, marginX, y);
    y += 6;
    doc.text(`Idade atual: ${ageMonths != null ? `${ageMonths} meses` : "—"}`, marginX, y);
    y += 6;

    doc.setFontSize(9);
    doc.text(`Resumo: Realizadas ${summary.done} • Previstas pendentes ${summary.duePending} • Futuras ${summary.future}`, marginX, y);
    y += 6;
    doc.text(
      ageMonths == null
        ? "Recorte do PDF: todas as faixas etárias."
        : `Recorte do PDF: vacinas previstas até ${ageMonths + 3} meses.`,
      marginX,
      y
    );
    y += 6;

    drawTableHeader();
    let rowIndex = 0;

    if (pdfRows.ate12.length > 0) {
      drawSectionTitle("Até 12 meses");
      pdfRows.ate12.forEach((item) => {
        drawRow(item, rowIndex);
        rowIndex += 1;
      });
    }

    if (pdfRows.apos12.length > 0) {
      drawSectionTitle("A partir de 12 meses");
      pdfRows.apos12.forEach((item) => {
        drawRow(item, rowIndex);
        rowIndex += 1;
      });
    }

    if (pdfRows.campanhas.length > 0) {
      drawSectionTitle("Outras vacinas e campanhas");
      pdfRows.campanhas.forEach((item) => {
        drawRow(item, rowIndex);
        rowIndex += 1;
      });
    }

    if (rowIndex === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Nenhuma vacina encontrada dentro do recorte de idade deste PDF.", marginX, y);
    }

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Documento de apoio. Confirmar condutas com calendário vigente do PNI e avaliação clínica.", marginX, pageHeight - 7);

    return doc.output("blob");
  }

  async function handleGeneratePdf() {
    if (!selectedChild) {
      alert("Selecione um paciente.");
      return;
    }

    setGenerating(true);
    try {
      const blob = buildPdfBlob();
      const fileName = `vacinas_${selectedChild.id}_${Date.now()}.pdf`;
      const filePath = `${selectedChild.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("child-docs")
        .upload(filePath, blob, { contentType: "application/pdf", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("child-docs").getPublicUrl(filePath);
      setPdfUrl(data.publicUrl);

      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(localUrl);

      alert("PDF de vacinas gerado com sucesso.");
    } catch (err: any) {
      alert(`Erro ao gerar PDF: ${err?.message || "desconhecido"}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4">
      <Card>
        <div className="p-5 grid gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Registro de vacinas</div>
            <div className="mt-1 text-sm text-slate-500">
              Marque as vacinas já realizadas e destaque automaticamente as previstas para a idade e ainda pendentes.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-1">
            <Select
              label="Paciente"
              value={patientId}
              onChange={setPatientId}
              options={
                children.length === 0
                  ? [{ label: loadingChildren ? "Carregando..." : "Nenhuma criança cadastrada", value: "" }]
                  : children.map((c) => ({ label: c.name, value: c.id }))
              }
            />
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              <b>Realizadas:</b> {summary.done}
            </div>
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
              <b>Previstas pendentes:</b> {summary.duePending}
            </div>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 ring-1 ring-blue-200">
              <b>Futuras:</b> {summary.future}
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <b>Idade atual:</b> {ageMonths == null ? "—" : `${ageMonths} meses`}
            </div>
          </div>

          <div className="overflow-auto rounded-xl ring-1 ring-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Vacina</th>
                  <th className="px-3 py-2 text-left">Dose</th>
                  <th className="px-3 py-2 text-left">Faixa prevista</th>
                  <th className="px-3 py-2 text-left">Realizada</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { key: "ate12", title: "Até 12 meses" },
                  { key: "apos12", title: "A partir de 12 meses" },
                  { key: "campanhas", title: "Outras vacinas e campanhas" },
                ] as Array<{ key: VaccineSection; title: string }>).map((section) => (
                  <React.Fragment key={section.key}>
                    <tr className="border-t border-slate-200 bg-slate-100">
                      <td className="px-3 py-2 text-xs font-bold uppercase text-slate-700" colSpan={5}>
                        {section.title}
                      </td>
                    </tr>

                    {groupedRows[section.key].map((item) => {
                      const mark = marks[item.id] ?? { done: false };
                      const status = getVaccineStatus(item, mark);

                      const highlightClass =
                        status.label === "Em atraso" || status.label === "Prevista e pendente"
                          ? "bg-rose-50"
                          : status.label === "Realizada"
                            ? "bg-emerald-50"
                            : "bg-white";

                      return (
                        <tr key={item.id} className={cn("border-t border-slate-100 align-top", highlightClass)}>
                          <td className="px-3 py-2 min-w-[260px] font-semibold text-slate-900">{item.vaccine}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{item.dose}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {item.minMonth}-{item.maxMonth} meses
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={mark.done}
                              onChange={(e) =>
                                updateMark(item.id, {
                                  done: e.target.checked,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn("inline-flex rounded-lg px-2 py-1 text-xs font-semibold", status.className)}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Telefone (WhatsApp)"
              value={sendPhone}
              onChange={setSendPhone}
              placeholder="(DDD) 99999-9999"
            />
            <Input
              label="E-mail do responsável"
              value={sendEmail}
              onChange={setSendEmail}
              type="email"
              placeholder="responsavel@exemplo.com"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 break-all">
            <b>Link do PDF:</b> {pdfUrl || "Gere o PDF para criar o link."}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={handleGeneratePdf} disabled={generating || !patientId}>
              {generating ? "Gerando PDF..." : "Gerar PDF"}
            </Button>

            <Button
              variant="secondary"
              onClick={async () => {
                if (!pdfUrl) {
                  alert("Gere o PDF antes de copiar o link.");
                  return;
                }
                try {
                  await navigator.clipboard.writeText(pdfUrl);
                  alert("Link copiado!");
                } catch {
                  alert("Não consegui copiar automaticamente.");
                }
              }}
              disabled={!pdfUrl}
            >
              Copiar link
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleSendWhatsAppConsult(pdfUrl, `vacinas de ${selectedChild?.name || "paciente"}`, sendPhone)}
              disabled={!pdfUrl}
            >
              Enviar por WhatsApp
            </Button>

            <Button
              onClick={() => handleSendEmailConsult(pdfUrl, `vacinas de ${selectedChild?.name || "paciente"}`, sendEmail)}
              disabled={!pdfUrl}
            >
              Enviar por e-mail
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DoctorGrowthDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [errorGrowth, setErrorGrowth] = useState<string | null>(null);
  const [rows, setRows] = useState<
    Array<{
      dateISO: string;
      ageMonths: number;
      weightKg: number | null;
      heightCm: number | null;
      headCm: number | null;
    }>
  >([]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === patientId) ?? null,
    [children, patientId]
  );

  async function loadChildren() {
    setLoadingChildren(true);
    try {
      const { data, error } = await supabase
        .from("children")
        .select("id,name,birth_date,sex")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: Child[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        birthDate: String(row.birth_date || ""),
        sex: (row.sex as Child["sex"]) ?? "O",
      }));

      setChildren(mapped);
      if (!patientId && mapped[0]?.id) {
        setPatientId(mapped[0].id);
      }
    } catch (err: any) {
      alert(`Erro ao carregar pacientes: ${err?.message || "desconhecido"}`);
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  }

  async function loadGrowthData(childId: string) {
    if (!childId) {
      setRows([]);
      setErrorGrowth("Selecione um paciente.");
      return;
    }

    setLoadingGrowth(true);
    setErrorGrowth(null);
    try {
      let data: any[] | null = null;
      let error: any = null;

      ({ data, error } = await supabase
        .from("growth_records")
        .select("date,weight_kg,height_cm,head_cm")
        .eq("child_id", childId)
        .order("date", { ascending: true }));

      if (error && /head_cm/i.test(String(error.message || ""))) {
        ({ data, error } = await supabase
          .from("growth_records")
          .select("date,weight_kg,height_cm")
          .eq("child_id", childId)
          .order("date", { ascending: true }));
      }

      if (error) throw error;

      const child = children.find((c) => c.id === childId);
      const birthDate = child?.birthDate || "";

      const mapped = (data ?? []).map((r: any) => ({
        dateISO: String(r.date || "").slice(0, 10),
        ageMonths: (() => {
          if (!birthDate || !r.date) return 0;
          const birth = new Date(String(birthDate));
          const ref = new Date(String(r.date));
          if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return 0;
          let months = (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth());
          if (ref.getDate() < birth.getDate()) months -= 1;
          return Math.max(0, Math.min(24, months));
        })(),
        weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
        heightCm: r.height_cm == null ? null : Number(r.height_cm),
        headCm: r.head_cm == null ? null : Number(r.head_cm),
      }));

      setRows(mapped);
      if (mapped.length === 0) {
        setErrorGrowth("Nenhum dado de crescimento registrado para este paciente.");
      }
    } catch (err: any) {
      setRows([]);
      setErrorGrowth(err?.message || "Falha ao carregar crescimento.");
    } finally {
      setLoadingGrowth(false);
    }
  }

  useEffect(() => {
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!patientId) return;
    loadGrowthData(patientId);
  }, [patientId, children]);

  const sexKey: GrowthSexKey = selectedChild?.sex === "F" ? "F" : "M";

  const chartBaseAges = useMemo(() => {
    const patientAges = rows.map((r) => r.ageMonths).filter((v) => Number.isFinite(v));
    const refAges = Array.from({ length: 25 }, (_, idx) => idx);
    return Array.from(new Set([...refAges, ...patientAges])).sort((a, b) => a - b);
  }, [rows]);

  function buildChartData(metric: GrowthCurveMetric) {
    return chartBaseAges.map((age) => {
      const patientRow = rows.find((r) => r.ageMonths === age);
      const patientValue =
        metric === "weight" ? patientRow?.weightKg : metric === "height" ? patientRow?.heightCm : patientRow?.headCm;

      return {
        ageMonths: age,
        patient: patientValue ?? null,
        z3: interpolateWhoCurve(metric, sexKey, age, "z3"),
        z2: interpolateWhoCurve(metric, sexKey, age, "z2"),
        z1: interpolateWhoCurve(metric, sexKey, age, "z1"),
        z0: interpolateWhoCurve(metric, sexKey, age, "z0"),
        zm1: interpolateWhoCurve(metric, sexKey, age, "zm1"),
        zm2: interpolateWhoCurve(metric, sexKey, age, "zm2"),
        zm3: interpolateWhoCurve(metric, sexKey, age, "zm3"),
      };
    });
  }

  const heightChartData = useMemo(() => buildChartData("height"), [chartBaseAges, rows, sexKey]);
  const weightChartData = useMemo(() => buildChartData("weight"), [chartBaseAges, rows, sexKey]);
  const headChartData = useMemo(() => buildChartData("head"), [chartBaseAges, rows, sexKey]);

  function hasPatientSeries(data: Array<{ patient: number | null }>) {
    return data.some((item) => item.patient != null);
  }

  function renderWhoChart(
    title: string,
    unit: string,
    data: Array<{
      ageMonths: number;
      patient: number | null;
      z3: number | null;
      z2: number | null;
      z1: number | null;
      z0: number | null;
      zm1: number | null;
      zm2: number | null;
      zm3: number | null;
    }>,
    includeZ1: boolean
  ) {
    return (
      <div className="rounded-xl ring-1 ring-slate-200 p-3">
        <div className="text-sm font-semibold text-slate-900 mb-1">{title}</div>
        <div className="text-xs text-slate-500 mb-2">Curvas OMS aproximadas (escore-z) + linha do paciente</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageMonths" ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]} />
              <YAxis />
              <Tooltip
                formatter={(value: any, name?: string) => {
                  if (value == null) return ["-", String(name ?? "")];
                  return [Number(value).toFixed(2) + ` ${unit}`, String(name ?? "")];
                }}
                labelFormatter={(label) => `Idade: ${label} meses`}
              />
              <Legend />

              <Line type="monotone" dataKey="z3" name="+3" stroke="#111827" strokeWidth={1.2} dot={false} connectNulls />
              <Line type="monotone" dataKey="z2" name="+2" stroke="#e11d48" strokeWidth={1.1} dot={false} connectNulls />
              {includeZ1 ? <Line type="monotone" dataKey="z1" name="+1" stroke="#f97316" strokeWidth={1.1} dot={false} connectNulls /> : null}
              <Line type="monotone" dataKey="z0" name="0" stroke="#16a34a" strokeWidth={1.2} dot={false} connectNulls />
              {includeZ1 ? <Line type="monotone" dataKey="zm1" name="-1" stroke="#f97316" strokeWidth={1.1} dot={false} connectNulls /> : null}
              <Line type="monotone" dataKey="zm2" name="-2" stroke="#e11d48" strokeWidth={1.1} dot={false} connectNulls />
              <Line type="monotone" dataKey="zm3" name="-3" stroke="#111827" strokeWidth={1.2} dot={false} connectNulls />

              <Line
                type="monotone"
                dataKey="patient"
                name="Paciente"
                stroke="#2563eb"
                strokeWidth={2.2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const hasAnyPatientData = hasPatientSeries(heightChartData) || hasPatientSeries(weightChartData) || hasPatientSeries(headChartData);

  return (
    <div className="mt-5 grid gap-4">
      <Card>
        <div className="p-5 grid gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Gráficos de crescimento (OMS)</div>
            <div className="mt-1 text-sm text-slate-500">Baseado em curvas por idade (0 a 24 meses) com plot da criança.</div>
          </div>

          <div className="grid gap-3 md:grid-cols-1">
            <Select
              label="Paciente"
              value={patientId}
              onChange={setPatientId}
              options={
                children.length === 0
                  ? [{ label: loadingChildren ? "Carregando..." : "Nenhuma criança cadastrada", value: "" }]
                  : children.map((c) => ({ label: c.name, value: c.id }))
              }
            />
          </div>

          {selectedChild ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <b>Paciente:</b> {selectedChild.name} • <b>Sexo:</b> {selectedChild.sex}
            </div>
          ) : null}

          {loadingGrowth ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Carregando gráficos...</div>
          ) : errorGrowth ? (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">{errorGrowth}</div>
          ) : !hasAnyPatientData ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Sem medidas suficientes para plotar a linha do paciente.</div>
          ) : (
            <div className="grid gap-4">
              {renderWhoChart("Estatura para idade (0-24 meses)", "cm", heightChartData, false)}
              {renderWhoChart("Peso para idade (0-24 meses)", "kg", weightChartData, false)}
              {renderWhoChart("Perímetro cefálico para idade (0-24 meses)", "cm", headChartData, true)}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function DoctorMedicineFinder() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MedicineSearchPayload | null>(null);

  async function searchMedicine() {
    const q = query.trim();
    if (!q) {
      alert("Digite o nome do medicamento.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/medicine-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Falha ao pesquisar medicamento");
      }

      setResult(data as MedicineSearchPayload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4">
      <Card>
        <div className="p-5 grid gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Pesquisa de medicamentos</div>
            <div className="mt-1 text-sm text-slate-500">
              Compare preços apenas em Drogasil e Pague Menos e acesse a bula do medicamento.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              label="Medicamento"
              value={query}
              onChange={setQuery}
              placeholder="Ex.: amoxicilina 500mg"
            />
            <div className="md:pt-6">
              <Button onClick={searchMedicine} disabled={loading || !query.trim()}>
                {loading ? "Pesquisando..." : "Pesquisar"}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="grid gap-4">
              {result.priceWarning ? (
                <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
                  {result.priceWarning}
                </div>
              ) : null}

              <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                <div className="text-xs font-semibold uppercase text-emerald-700">Menor preço (Drogasil/Pague Menos)</div>
                {result.lowestPrice ? (
                  <>
                    <div className="mt-1 text-lg font-bold text-emerald-900">
                      R$ {result.lowestPrice.price.toFixed(2).replace(".", ",")}
                    </div>
                    <div className="text-sm text-emerald-900">{result.lowestPrice.title}</div>
                    <div className="text-xs text-emerald-700">Loja: {result.lowestPrice.storeName}</div>
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        onClick={() => window.open(result.lowestPrice!.url, "_blank")}
                      >
                        Abrir oferta
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-emerald-900">
                    Nenhuma oferta com preço foi encontrada para "{result.query}".
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-900">Bula</div>
                {result.leaflet ? (
                  <>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{result.leaflet.title}</div>
                    <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {result.leaflet.summary}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => window.open(result.leaflet!.sourceUrl, "_blank")}>
                        Ver fonte da bula
                      </Button>
                      <Button variant="secondary" onClick={() => window.open(result.leafletSearchUrl, "_blank")}>
                        Buscar bula no Brasil
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-slate-700">
                    Não encontrei conteúdo de bula automático para esse termo.
                    <div className="mt-2">
                      <Button variant="secondary" onClick={() => window.open(result.leafletSearchUrl, "_blank")}>
                        Buscar bula no Brasil
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {result.offers.length > 0 ? (
                <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Outras ofertas (Drogasil/Pague Menos)</div>
                  <div className="mt-3 grid gap-2">
                    {result.offers.slice(0, 5).map((offer, idx) => (
                      <div key={`${offer.url}_${idx}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2">
                        <div className="min-w-[220px] flex-1">
                          <div className="text-sm font-medium text-slate-900">{offer.title}</div>
                          <div className="text-xs text-slate-600">{offer.storeName}</div>
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          R$ {offer.price.toFixed(2).replace(".", ",")}
                        </div>
                        <Button variant="secondary" onClick={() => window.open(offer.url, "_blank")}>
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function DoctorDocumentComposer({ doctorEmail, kind }: { doctorEmail: string; kind: DoctorDocumentKind }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sendPhone, setSendPhone] = useState("");
  const [sendEmail, setSendEmail] = useState("");

  const kindMeta = useMemo(() => {
    if (kind === "prescription") {
      return {
        tabTitle: "Receituário",
        defaultTitle: "Receituário médico",
        pdfHeading: "Receituário",
        placeholder: "Digite aqui o receituário, medicações e posologia...",
      };
    }
    if (kind === "exam") {
      return {
        tabTitle: "Solicitação de exames",
        defaultTitle: "Solicitação de exames",
        pdfHeading: "Solicitação de exames",
        placeholder: "Digite aqui os exames solicitados e justificativa clínica...",
      };
    }
    if (kind === "certificate") {
      return {
        tabTitle: "Atestado",
        defaultTitle: "Atestado médico",
        pdfHeading: "Atestado",
        placeholder: "Digite aqui o texto do atestado...",
      };
    }
    return {
      tabTitle: "Relatório médico",
      defaultTitle: "Relatório médico",
      pdfHeading: "Relatório médico",
      placeholder: "Digite aqui o relatório médico...",
    };
  }, [kind]);

  const doctorPdf = useMemo(() => getDoctorPdfSettings(doctorEmail), [doctorEmail]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === patientId) ?? null,
    [children, patientId]
  );

  useEffect(() => {
    setTitle(kindMeta.defaultTitle);
    setContent("");
    setPdfUrl("");
  }, [kindMeta.defaultTitle]);

  useEffect(() => {
    setSendPhone(selectedChild?.guardianPhone ?? "");
    setSendEmail(selectedChild?.guardianEmail ?? "");
  }, [selectedChild?.guardianPhone, selectedChild?.guardianEmail]);

  async function loadChildren() {
    setLoadingChildren(true);
    try {
      let data: any[] | null = null;
      let error: any = null;

      ({ data, error } = await supabase
        .from("children")
        .select("id,name,birth_date,sex,guardian_email,guardian_phone")
        .order("created_at", { ascending: false }));

      if (error && /guardian_email|guardian_phone/i.test(String(error.message || ""))) {
        ({ data, error } = await supabase
          .from("children")
          .select("id,name,birth_date,sex")
          .order("created_at", { ascending: false }));
      }

      if (error) throw error;

      const mapped: Child[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        birthDate: String(row.birth_date || ""),
        sex: (row.sex as Child["sex"]) ?? "O",
        guardianEmail: row.guardian_email ? String(row.guardian_email) : null,
        guardianPhone: row.guardian_phone ? String(row.guardian_phone) : null,
      }));

      setChildren(mapped);
      if (!patientId && mapped[0]?.id) {
        setPatientId(mapped[0].id);
      }
    } catch (err: any) {
      alert(`Erro ao carregar pacientes: ${err?.message || "desconhecido"}`);
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  }

  useEffect(() => {
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function normalizePhoneDigits(phone: string) {
    return (phone || "").replace(/\D/g, "");
  }

  function buildDocumentPdf(child: Child, documentTitle: string, documentBody: string) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;

    const headerTop = y;
    const logoX = 10;
    const logoY = headerTop;
    const logoWidth = 18;
    const logoHeight = 18;
    const textX = logoX + logoWidth + 4;
    const textRightPadding = 10;
    const textWidth = pageWidth - textX - textRightPadding;

    if (doctorPdf.logoBase64 && doctorPdf.logoBase64.length > 0) {
      const imageFormat = getImageFormatFromBase64(doctorPdf.logoBase64);
      doc.addImage(doctorPdf.logoBase64, imageFormat, logoX, logoY, logoWidth, logoHeight);
    }

    const emissionDate = formatDateBR(new Date().toISOString());

    let textY = headerTop + 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(doctorPdf.doctorName, textX, textY);

    textY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${doctorPdf.specialty} • ${doctorPdf.registration}`, textX, textY, {
      maxWidth: textWidth,
    });

    textY += 4.5;
    doc.text(doctorPdf.clinicName, textX, textY, { maxWidth: textWidth });

    textY += 4.5;
    const addressCompact = [doctorPdf.clinicAddress, doctorPdf.clinicPhone]
      .filter(Boolean)
      .join(" • ");
    doc.text(addressCompact, textX, textY, { maxWidth: textWidth });

    doc.setFontSize(8.5);
    doc.text(`Data: ${emissionDate}`, pageWidth - 10, headerTop + 4, { align: "right" });

    y = Math.max(logoY + logoHeight, textY) + 4;

    doc.setLineWidth(0.3);
    doc.line(10, y, pageWidth - 10, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(documentTitle, pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Paciente: ${child.name}`, 10, y);
    y += 6;
    const ageAtDoc = child.birthDate ? calcAgeText(child.birthDate, date) : "";
    doc.text(`Data do documento: ${formatDateBR(date)}${ageAtDoc ? ` • Idade: ${ageAtDoc}` : ""}`, 10, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text(kindMeta.pdfHeading + ":", 10, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(documentBody.trim(), pageWidth - 20);
    doc.text(lines, 10, y);
    y += lines.length * 5 + 12;

    if (y > 230) {
      doc.addPage();
      y = 200;
    }

    doc.setLineWidth(0.2);
    doc.line(60, 260, pageWidth - 60, 260);
    doc.setFontSize(10);
    doc.text(doctorPdf.doctorName, pageWidth / 2, 266, { align: "center" });
    doc.text(doctorPdf.registration, pageWidth / 2, 272, { align: "center" });

    return doc.output("blob");
  }

  async function handleGeneratePdf() {
    if (!selectedChild) {
      alert("Selecione um paciente.");
      return;
    }
    if (!content.trim()) {
      alert("Preencha o texto do documento.");
      return;
    }

    const normalizedTitle = title.trim() || kindMeta.defaultTitle;
    const pdfBlob = buildDocumentPdf(selectedChild, normalizedTitle, content);

    const fileNameSafe = `${kind}_${Date.now()}.pdf`;
    const filePath = `${selectedChild.id}/${fileNameSafe}`;

    setGenerating(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("child-docs")
        .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("child-docs").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      setPdfUrl(publicUrl);

      const localUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = fileNameSafe;
      a.click();
      URL.revokeObjectURL(localUrl);

      alert("PDF gerado com sucesso.");
    } catch (err: any) {
      alert(`Erro ao gerar/enviar PDF: ${err?.message || "desconhecido"}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleSendWhatsApp() {
    if (!pdfUrl) {
      alert("Gere o PDF antes de enviar.");
      return;
    }
    const digits = normalizePhoneDigits(sendPhone);
    const msg = `Olá! Segue o documento (${kindMeta.tabTitle}) de ${selectedChild?.name || "paciente"}: ${pdfUrl}`;

    if (!digits) {
      const generic = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(generic, "_blank");
      return;
    }

    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <Card>
      <div className="p-5 grid gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{kindMeta.tabTitle}</div>
          <div className="mt-1 text-sm text-slate-500">
            Texto simples, geração de PDF e envio rápido por WhatsApp/e-mail.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Paciente"
            value={patientId}
            onChange={setPatientId}
            options={
              children.length === 0
                ? [{ label: loadingChildren ? "Carregando..." : "Nenhuma criança cadastrada", value: "" }]
                : children.map((c) => ({ label: c.name, value: c.id }))
            }
          />
          <Input label="Data" value={date} onChange={setDate} type="date" />
        </div>

        <Input
          label="Título do documento"
          value={title}
          onChange={setTitle}
          placeholder={kindMeta.defaultTitle}
        />

        <TextArea
          label={kindMeta.tabTitle}
          value={content}
          onChange={setContent}
          placeholder={kindMeta.placeholder}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Telefone (WhatsApp)"
            value={sendPhone}
            onChange={setSendPhone}
            placeholder="(DDD) 99999-9999"
          />
          <Input
            label="E-mail do responsável"
            value={sendEmail}
            onChange={setSendEmail}
            type="email"
            placeholder="responsavel@exemplo.com"
          />
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 break-all">
          <b>Link do PDF:</b> {pdfUrl || "Gere o PDF para criar o link."}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={handleGeneratePdf} disabled={generating || !patientId || !content.trim()}>
            {generating ? "Gerando PDF..." : "Gerar PDF"}
          </Button>

          <Button
            variant="secondary"
            onClick={async () => {
              if (!pdfUrl) {
                alert("Gere o PDF antes de copiar o link.");
                return;
              }
              try {
                await navigator.clipboard.writeText(pdfUrl);
                alert("Link copiado!");
              } catch {
                alert("Não consegui copiar automaticamente.");
              }
            }}
            disabled={!pdfUrl}
          >
            Copiar link
          </Button>

          <Button variant="secondary" onClick={handleSendWhatsApp} disabled={!pdfUrl}>
            Enviar por WhatsApp
          </Button>

          <Button
            onClick={() => handleSendEmailConsult(pdfUrl, selectedChild?.name || "Documento", sendEmail)}
            disabled={!pdfUrl}
          >
            Enviar por e-mail
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DoctorAppointments() {
  type AppointmentItem = {
    id: string;
    childName: string;
    start_at: string;
    end_at: string;
    status: string;
    guardianPhone?: string | null;
  };


  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // helper local para formatar data+hora bonitinho
  function formatDateTime(iso: string) {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleDateString("pt-BR") +
        " " +
        d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return iso;
    }
  }

     async function load() {
    setLoading(true);
    setErr(null);
    try {
      // 1) Buscar crianças (para mostrar o nome + telefone do responsável)
      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("id,name,guardian_phone");

      if (childrenError) throw childrenError;

      const childMap = new Map<string, { name: string; phone: string | null }>();
      (childrenData ?? []).forEach((c: any) => {
        childMap.set(String(c.id), {
          name: String(c.name),
          phone: (c.guardian_phone as string) ?? null,
        });
      });

      // 2) Buscar TODOS os agendamentos
      const { data: apptsData, error: apptsError } = await supabase
        .from("appointments")
        .select("id, child_id, start_at, end_at, status")
        .order("start_at", { ascending: true });

      if (apptsError) throw apptsError;

      const mapped: AppointmentItem[] = (apptsData ?? []).map((r: any) => {
        const child = childMap.get(String(r.child_id)) ?? {
          name: "Paciente sem nome",
          phone: null,
        };

        return {
          id: String(r.id),
          start_at: String(r.start_at),
          end_at: String(r.end_at),
          status: String(r.status ?? "requested"),
          childName: child.name,
          guardianPhone: child.phone,
        };
      });

      setItems(mapped);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Falha ao carregar agenda.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: "confirmed" | "cancelled") {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch (e: any) {
      alert("Erro ao atualizar status: " + (e?.message ?? "desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 grid gap-4">
      {err ? (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
          {err}
        </div>
      ) : null}

      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Agenda de consultas
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Mostrando pedidos de consulta a partir de hoje.
              </div>
            </div>
            <Button variant="secondary" onClick={load} disabled={loading}>
              Recarregar
            </Button>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Carregando...
            </div>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Nenhum pedido de consulta encontrado.
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill icon={<Baby className="h-4 w-4" />} label={a.childName} />
                      <Pill
                        icon={<CalendarDays className="h-4 w-4" />}
                        label={formatDateTime(a.start_at)}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Status:{" "}
                      <b>
                        {a.status === "confirmed"
                          ? "Confirmada"
                          : a.status === "cancelled"
                          ? "Cancelada"
                          : "Pendente"}
                      </b>
                    </div>
                  </div>

                                   <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => updateStatus(a.id, "confirmed")}
                      disabled={loading || a.status === "confirmed"}
                    >
                      Confirmar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => updateStatus(a.id, "cancelled")}
                      disabled={loading || a.status === "cancelled"}
                    >
                      Cancelar
                    </Button>

                    {(() => {
                      const diff = daysUntil(a.start_at);
                      const podeLembrar =
                        a.status === "confirmed" && diff > 0 && diff <= 3;

                      if (!podeLembrar) return null;

                      return (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            handleSendWhatsAppReminder(
                              a.childName,
                              a.guardianPhone,
                              a.start_at
                            )
                          }
                          disabled={loading}
                        >
                          📲 Enviar lembrete WhatsApp
                        </Button>
                      );
                    })()}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// 🔹 Dados fixos do cabeçalho do PDF
const DOCTOR_HEADER = {
  doctorName: "Dr. Ricardo B. Gurgel",
  specialty: "Pediatria",
  registration: "CRM/PE 17168 • RQE 4151", // ajuste
  clinicName: "Espaço Materno Infantil - Gestar",
  clinicAddress: "Hospital Santa Joana - 1º andar, prédio central - Recife/PE",
  clinicPhone: "(81) 979202-0011", // ajuste
};

// 🔹 Logo em base64 (exemplo genérico)
// Substitua a string pelo base64 real da sua logo
// (ex: usando um site tipo "image to base64" e colando aqui)
const LOGO_BASE64 = "data:image/jpeg;base64,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";

// Gravar consulta
function RecordConsultationMock({ doctorEmail }: { doctorEmail: string }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState<string>("");
  const [patientSearchText, setPatientSearchText] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

const [toast, setToast] = useState<string | null>(null);

function showToast(msg: string) {
  setToast(msg);
  setTimeout(() => setToast(null), 3500);
}

  
const [sendBoxOpen, setSendBoxOpen] = useState(false);
const [sendPdfUrl, setSendPdfUrl] = useState<string>("");
const [sendChildName, setSendChildName] = useState<string>("");
const [sendPhone, setSendPhone] = useState<string>(""); // whatsapp
const [sendEmail, setSendEmail] = useState<string>(""); // email
  const [evolucao, setEvolucao] = useState("");
  const [doencas, setDoencas] = useState("");
  const [conduta, setConduta] = useState("");
  const [receitas, setReceitas] = useState("");
  const [exames, setExames] = useState("");
  const [retorno, setRetorno] = useState("");
const [timerRunning, setTimerRunning] = useState(false);
const [timerSeconds, setTimerSeconds] = useState(0);
const doctorPdf = useMemo(() => getDoctorPdfSettings(doctorEmail), [doctorEmail]);
const DOCTOR_HEADER = doctorPdf;
const LOGO_BASE64 = doctorPdf.logoBase64;



useEffect(() => {
  if (!timerRunning) return;
  const id = window.setInterval(() => setTimerSeconds((s) => s + 1), 1000);
  return () => window.clearInterval(id);
}, [timerRunning]);

function formatTimer(secs: number) {
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

  // 🔹 Novos campos: peso e altura para alimentar growth_records
  const [weight, setWeight] = useState(""); // kg
  const [height, setHeight] = useState(""); // cm
  const [headCircumference, setHeadCircumference] = useState(""); // cm
  //✅ modal pós-salvar para WhatsApp/E-mail
  // evita salvamentos concorrentes (ex: double-click)
  const savingRef = useRef(false);

  const selectedChild = useMemo(
  () => children.find((c) => c.id === patientId) ?? null,
  [children, patientId]
);

const ageText = useMemo(() => {
  if (!selectedChild?.birthDate) return "";
  return calcAgeText(selectedChild.birthDate, date);
}, [selectedChild?.birthDate, date]);

function normalizeText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const patientMatches = useMemo(() => {
  const query = normalizeText(patientSearchText);
  if (!query) return children;
  return children.filter((c) => normalizeText(c.name).includes(query));
}, [children, patientSearchText]);

function handlePatientSearchChange(value: string) {
  setPatientSearchText(value);

  const query = normalizeText(value);
  if (!query) {
    setPatientId("");
    return;
  }

  const exact = children.find((c) => normalizeText(c.name) === query);
  if (exact) {
    setPatientId(exact.id);
    return;
  }

  const partial = children.filter((c) => normalizeText(c.name).includes(query));
  if (partial.length === 1) {
    setPatientId(partial[0].id);
    return;
  }

  setPatientId("");
}

useEffect(() => {
  if (!patientId) return;
  const current = children.find((c) => c.id === patientId);
  if (current) {
    setPatientSearchText(current.name);
  }
}, [patientId, children]);

// ✅ 1) Carrega diagnóstico salvo ao trocar de paciente
useEffect(() => {
  if (!patientId) return;
  const saved = localStorage.getItem(storageKeyDiagnosis(patientId));
  if (saved) setDoencas(saved);
  // se quiser limpar quando não tem salvo, use: else setDoencas("")
}, [patientId]);

// ✅ 2) Salva diagnóstico automaticamente enquanto digita
useEffect(() => {
  if (!patientId) return;
  localStorage.setItem(storageKeyDiagnosis(patientId), doencas);
}, [patientId, doencas]);

// ✅ 1) Quando troca o paciente, carrega o diagnóstico fixo do Supabase
useEffect(() => {
  (async () => {
    if (!patientId) return;

    const { data, error } = await supabase
      .from("children")
      .select("last_diagnosis")
      .eq("id", patientId)
      .single();

    if (!error) {
      setDoencas(data?.last_diagnosis ?? "");
    }
  })();
}, [patientId]);

// ✅ 2) Quando editar "Doenças/Diagnóstico", salva no Supabase (com debounce)
useEffect(() => {
  if (!patientId) return;

  const t = setTimeout(async () => {
    await supabase
      .from("children")
      .update({
        last_diagnosis: doencas,
        last_diagnosis_updated_at: new Date().toISOString(),
      })
      .eq("id", patientId);
  }, 700);

  return () => clearTimeout(t);
}, [patientId, doencas]);

  // Carregar lista de crianças do Supabase (pacientes)
  async function loadChildren() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("children")
        .select("id,name,birth_date,sex")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: Child[] = (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name),
        birthDate: String(r.birth_date),
        sex: (r.sex as Child["sex"]) ?? "O",
      }));

      setChildren(mapped);
      if (!patientId && mapped[0]) {
        setPatientId(mapped[0].id);
      }
    } catch (e: any) {
      alert("Erro ao carregar pacientes: " + (e?.message ?? "desconhecido"));
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

useEffect(() => {
  if (!patientId) return;
  const saved = localStorage.getItem(storageKeyDiagnosis(patientId));
  if (saved && !doencas.trim()) {
    setDoencas(saved);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [patientId]);

useEffect(() => {
  if (!patientId) return;
  localStorage.setItem(storageKeyDiagnosis(patientId), doencas);
}, [patientId, doencas]);

  // 🔹 Gera o PDF em memória (Blob), sem baixar no navegador
  function createConsultPdfBlob(child: Child): Blob {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = 10;

    const headerTop = y;
    const logoX = 10;
    const logoY = headerTop;
    const logoWidth = 18;
    const logoHeight = 18;
    const textX = logoX + logoWidth + 4;
    const textRightPadding = 10;
    const textWidth = pageWidth - textX - textRightPadding;

    if (LOGO_BASE64 && LOGO_BASE64.length > 0) {
      const imageFormat = getImageFormatFromBase64(LOGO_BASE64);
      doc.addImage(LOGO_BASE64, imageFormat, logoX, logoY, logoWidth, logoHeight);
    }

    const emissionDate = formatDateBR(new Date().toISOString());

    let textY = headerTop + 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(DOCTOR_HEADER.doctorName, textX, textY);

    textY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${DOCTOR_HEADER.specialty} • ${DOCTOR_HEADER.registration}`, textX, textY, {
      maxWidth: textWidth,
    });

    textY += 4.5;
    doc.text(DOCTOR_HEADER.clinicName, textX, textY, { maxWidth: textWidth });

    textY += 4.5;
    const addressCompact = [DOCTOR_HEADER.clinicAddress, DOCTOR_HEADER.clinicPhone]
      .filter(Boolean)
      .join(" • ");
    doc.text(addressCompact, textX, textY, { maxWidth: textWidth });

    doc.setFontSize(8.5);
    doc.text(`Data: ${emissionDate}`, pageWidth - 10, headerTop + 4, { align: "right" });

    y = Math.max(logoY + logoHeight, textY) + 4;

    // Linha separando o cabeçalho do corpo da ficha
    doc.setLineWidth(0.3);
    doc.line(10, y, pageWidth - 10, y);
    y += 8;

    // --- TÍTULO DA FICHA ---
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Ficha de Consulta Pediátrica", pageWidth / 2, y, {
      align: "center",
    });
    y += 10;

    // --- DADOS DO PACIENTE ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text(`Paciente: ${child.name}`, 10, y);
    y += 6;

    const ageAtConsult = child.birthDate ? calcAgeText(child.birthDate, date) : "";
    doc.text(
      `Data da consulta: ${formatDateBR(date)}${ageAtConsult ? ` • Idade: ${ageAtConsult}` : ""}`,
      10,
      y
    );
    y += 6;

    if (child.birthDate) {
      doc.text(`Nascimento: ${formatDateBR(child.birthDate)}`, 10, y);
      y += 6;
    }

    if (weight.trim()) {
      doc.text(`Peso: ${weight.trim()} kg`, 10, y);
      y += 6;
    }

    if (height.trim()) {
      doc.text(`Altura: ${height.trim()} cm`, 10, y);
      y += 6;
    }
     if (headCircumference.trim()) {
      doc.text(`Perímetro cefálico: ${headCircumference.trim()} cm`, 10, y);
      y += 6;
    }


    // --- FUNÇÃO AUXILIAR PARA BLOCOS DE TEXTO ---
    function bloco(titulo: string, conteudo: string) {
      if (!conteudo.trim()) return;

      if (y > 260) {
        doc.addPage();
        y = 15;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(titulo, 10, y);
      y += 5;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const linhas = doc.splitTextToSize(conteudo.trim(), pageWidth - 20);
      doc.text(linhas, 10, y);
      y += linhas.length * 5 + 6;
    }

    bloco("Doenças / Diagnóstico:", doencas);
    bloco("Evolução / Orientações gerais:", evolucao);
    bloco("Conduta:", conduta);
    bloco("Exames:", exames);
    bloco("Receituário:", receitas);
    bloco("Retorno:", retorno);

    // --- RODAPÉ / ASSINATURA ---
    if (y > 230) {
      doc.addPage();
      y = 200;
    }

    doc.setLineWidth(0.2);
    doc.line(60, 260, pageWidth - 60, 260);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(DOCTOR_HEADER.doctorName, pageWidth / 2, 266, {
      align: "center",
    });
    doc.text(DOCTOR_HEADER.registration, pageWidth / 2, 272, {
      align: "center",
    });

    // 👉 Aqui, em vez de salvar no navegador, devolve um Blob
    const blob = doc.output("blob");
    return blob;
  }
function normalizePhoneDigits(phone: string) {
  return (phone || "").replace(/\D/g, ""); // deixa só números
}

const PDF_BUCKET_NAME = "child-docs"; // bucket do Storage


// 1. A FUNÇÃO DO PDF (Substitua a sua por esta)
function buildPdfForCurrentForm(child: Child) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // --- 1. CABEÇALHO COM LOGO E DADOS DO MÉDICO ---
  // Se você tiver a logo em Base64, insira aqui:"data:image/jpeg;base64,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";
  // doc.addImage(LOGO_BASE64, 'PNG', 20, 10, 30, 30); 
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(44, 62, 80); // Cor azul escuro profissional
  doc.text(DOCTOR_HEADER.doctorName, pageWidth / 2, y, { align: "center" });
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`${DOCTOR_HEADER.specialty} | ${DOCTOR_HEADER.registration}`, pageWidth / 2, y, { align: "center" });
  
  y += 6;
  doc.setFontSize(9);
  doc.text(DOCTOR_HEADER.clinicAddress, pageWidth / 2, y, { align: "center" });
  
  y += 8;
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y); // Linha divisória fina

  // --- 2. DADOS DO PACIENTE ---
  y += 15;
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PACIENTE:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(child.name, 45, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("DATA:", pageWidth - 55, y);
  doc.setFont("helvetica", "normal");
  const ageAtConsult = child.birthDate ? calcAgeText(child.birthDate, date) : "";
  doc.text(
    `${formatDateBR(date)}${ageAtConsult ? ` • ${ageAtConsult}` : ""}`,
    pageWidth - 20,
    y,
    { align: "right" }
  );

  // --- 3. BLOCO DE BIOMETRIA (O que você adicionou agora) ---
  y += 10;
  doc.setFillColor(245, 247, 250); // Fundo cinza clarinho para destacar
  doc.rect(20, y, pageWidth - 40, 10, "F");
  
  y += 6.5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(52, 73, 94);

  // Formatação dos dados que já estão funcionando no seu VS
  const pesoTxt = weight ? `PESO: ${weight} kg` : "";
  const altTxt = height ? `ALTURA: ${height} cm` : "";
  const pcTxt = headCircumference ? `P.C.: ${headCircumference} cm` : "";
  
  const biometriaCompleta = [pesoTxt, altTxt, pcTxt].filter(Boolean).join("    |    ");
  doc.text(biometriaCompleta, pageWidth / 2, y, { align: "center" });

  // --- 4. CONTEÚDO DA CONSULTA (MODELO ANTIGO) ---
  y += 15;
  const secoes = [
    { titulo: "MOTIVO / EVOLUÇÃO", conteudo: evolucao },
    { titulo: "CONDUTA E ORIENTAÇÕES", conteudo: conduta },
    { titulo: "PRESCRIÇÃO / RECEITUÁRIO", conteudo: receitas },
  ];

  secoes.forEach((sec) => {
    if (sec.conteudo && sec.conteudo.trim()) {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(44, 62, 80);
      doc.text(sec.titulo, 20, y);
      
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0);
      const textLines = doc.splitTextToSize(sec.conteudo, pageWidth - 40);
      doc.text(textLines, 20, y);
      y += (textLines.length * 6) + 10;
    }
  });

  return doc;
}

async function salvarConsulta() {
  if (!patientId) return alert("Selecione um paciente.");
  if (!conduta.trim()) return alert("Preencha a conduta.");

  if (savingRef.current) return; // já está salvando
  savingRef.current = true;

  const child = children.find((c) => c.id === patientId);
  if (!child) return alert("Paciente inválido.");

  setLoading(true);
  try {
    // 1. CAPTURA E VALIDAÇÃO DO MÉDICO (Deve ser a primeira coisa)
    const { data: { user } } = await supabase.auth.getUser();
    const doctorEmail = user?.email;

    if (!doctorEmail) {
      throw new Error("Sessão expirada. Por favor, faça login novamente.");
    }

    // 2. GERAÇÃO DO PDF + UPLOAD primeiro (para não deixar registro no banco caso algo falhe)
    const { blob: pdfBlob, fileName } = await gerarPdfConsultaBlob();
    const filePath = `${child.id}/${fileName}`;

    // tenta enviar substituindo caso já exista (upsert evita erro "resource already exists")
    const { error: uploadError } = await supabase.storage
      .from("child-docs")
      .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("child-docs").getPublicUrl(filePath);
    const pdfUrl = urlData.publicUrl;

    // 3. SALVA A CONSULTA (Incluindo os novos campos de biometria para o Banco)
    const { data: consultRow, error: insertError } = await supabase
      .from("consultations")
      .insert({
        child_id: child.id,
        child_name: child.name,
        date,
        conduta: conduta.trim(),
        orientacoes: evolucao.trim(),
        retorno: retorno.trim(),
        exames: exames.trim(),
        receitas: receitas.trim(),
        doctor_email: doctorEmail,
        // Adicione estes campos na sua tabela 'consultations' se ainda não existirem:
        weight: weight ? String(weight) : null,
        height: height ? String(height) : null,
        head_circumference: headCircumference ? String(headCircumference) : null,
        pdf_url: pdfUrl, // já temos o link
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // 4. SALVA NO HISTÓRICO DE CRESCIMENTO (Para os Gráficos)
    if (weight || height || headCircumference) {
      // constrói payload de crescimento sem forçar coluna inexistente
      const growthPayload: any = {
        child_id: child.id,
        date: date,
        weight_kg: weight ? Number(String(weight).replace(',', '.')) : null,
        height_cm: height ? Number(String(height).replace(',', '.')) : null,
      };
      if (headCircumference) {
        growthPayload.head_cm = Number(String(headCircumference).replace(',', '.'));
      }
      if (doctorEmail) {
        growthPayload.doctor_email = doctorEmail;
      }

      let growthDataInserted: any = null;
      let growthError: any = null;

      ({ data: growthDataInserted, error: growthError } = await supabase
        .from("growth_records")
        .insert(growthPayload)
        .select());

      // se falhou por coluna inexistente, tenta novamente sem essa chave
      if (growthError && /head_cm/i.test(growthError.message)) {
        console.warn("head_cm não existe, removendo e reenviando");
        delete growthPayload.head_cm;
        ({ data: growthDataInserted, error: growthError } = await supabase
          .from("growth_records")
          .insert(growthPayload)
          .select());
      }

      if (growthError) {
        console.error("Erro ao salvar growth_records:", growthError);
        // caso seja política de RLS, mostra mensagem mais clara
        if (growthError.message && growthError.message.includes("row-level security")) {
          alert(
            "Não foi possível gravar as medidas porque a política de segurança do banco está bloqueando. " +
              "No painel do Supabase você deve permitir inserts em 'growth_records' (por exemplo, criando uma policy `ALLOW INSERT FOR authenticated`)."
          );
          // não encerrar o processo geral da consulta, só informa
          return;
        }
        throw growthError;
      }

      // avisa outras partes da aplicação (aba Crescimento) que houve atualização
      try {
        window.dispatchEvent(new CustomEvent("rbgp_growth_updated", { detail: { childId: child.id } }));
      } catch (e) {
        // noop
      }
    }

    // 5. prepara modal de envio
    setSendPdfUrl(pdfUrl);
    setSendChildName(child.name);
    setSendBoxOpen(true);


    // 6. LIMPEZA COMPLETA DOS CAMPOS
    setEvolucao(""); 
    setConduta(""); 
    setReceitas(""); 
    setExames(""); 
    setRetorno(""); 
    setWeight(""); // Limpa peso
    setHeight(""); // Limpa altura
    setHeadCircumference(""); // Limpa PC

  } catch (e: any) {
    alert("Erro no processo: " + e.message);
  } finally {
    savingRef.current = false;
    setLoading(false);
  }
}


  // 🔹 Gerar PDF da consulta com os dados preenchidos
  // 🔹 Gerar PDF da consulta com cabeçalho e logo
 async function gerarPdfConsultaBlob() {
  if (!patientId) {
    alert("Selecione um paciente.");
    throw new Error("Sem paciente selecionado");
  }

  const child = children.find((c) => c.id === patientId);
  if (!child) {
    alert("Paciente inválido.");
    throw new Error("Paciente inválido");
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = 10;

  const headerTop = y;
  const logoX = 10;
  const logoY = headerTop;
  const logoWidth = 18;
  const logoHeight = 18;
  const textX = logoX + logoWidth + 4;
  const textRightPadding = 10;
  const textWidth = pageWidth - textX - textRightPadding;

  if (LOGO_BASE64 && LOGO_BASE64.length > 0 && !LOGO_BASE64.includes("SEU_BASE64_AQUI")) {
    const imageFormat = getImageFormatFromBase64(LOGO_BASE64);
    doc.addImage(LOGO_BASE64, imageFormat, logoX, logoY, logoWidth, logoHeight);
  }

  const emissionDate = formatDateBR(new Date().toISOString());

  let textY = headerTop + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(DOCTOR_HEADER.doctorName, textX, textY);

  textY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${DOCTOR_HEADER.specialty} • ${DOCTOR_HEADER.registration}`, textX, textY, {
    maxWidth: textWidth,
  });

  textY += 4.5;
  doc.text(DOCTOR_HEADER.clinicName, textX, textY, { maxWidth: textWidth });

  textY += 4.5;
  const addressCompact = [DOCTOR_HEADER.clinicAddress, DOCTOR_HEADER.clinicPhone]
    .filter(Boolean)
    .join(" • ");
  doc.text(addressCompact, textX, textY, { maxWidth: textWidth });

  doc.setFontSize(8.5);
  doc.text(`Data: ${emissionDate}`, pageWidth - 10, headerTop + 4, { align: "right" });

  y = Math.max(logoY + logoHeight, textY) + 4;

  doc.setLineWidth(0.3);
  doc.line(10, y, pageWidth - 10, y);
  y += 8;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Ficha de Consulta Pediátrica", pageWidth / 2, y, { align: "center" });
  y += 10;

  // Dados do paciente
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Paciente: ${child.name}`, 10, y); y += 6;
  const ageAtConsult = child.birthDate ? calcAgeText(child.birthDate, date) : "";
  doc.text(
    `Data da consulta: ${formatDateBR(date)}${ageAtConsult ? ` • Idade: ${ageAtConsult}` : ""}`,
    10,
    y
  );
  y += 6;

  if (child.birthDate) {
    doc.text(`Nascimento: ${formatDateBR(child.birthDate)}`, 10, y);
    y += 6;
  }

  if (weight.trim()) { doc.text(`Peso: ${weight.trim()} kg`, 10, y); y += 6; }
  if (height.trim()) { doc.text(`Altura: ${height.trim()} cm`, 10, y); y += 6; }
  if (headCircumference.trim()) { doc.text(`Perímetro cefálico: ${headCircumference.trim()} cm`, 10, y); y += 6; }

  y += 6;

  function bloco(titulo: string, conteudo: string) {
    if (!conteudo.trim()) return;

    if (y > 260) { doc.addPage(); y = 15; }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(titulo, 10, y);
    y += 5;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const linhas = doc.splitTextToSize(conteudo.trim(), pageWidth - 20);
    doc.text(linhas, 10, y);
    y += linhas.length * 5 + 6;
  }

  bloco("Doenças / Diagnóstico:", doencas);
  bloco("Evolução / Orientações gerais:", evolucao);
  bloco("Conduta:", conduta);
  bloco("Exames:", exames);
  bloco("Receituário:", receitas);
  bloco("Retorno:", retorno);

  // Gráfico de crescimento (histórico do paciente) no final da ficha
  type GrowthRow = {
    dateISO: string;
    weightKg: number | null;
    heightCm: number | null;
    headCm: number | null;
  };

  let growthRows: GrowthRow[] = [];
  try {
    let data: any[] | null = null;
    let error: any = null;

    ({ data, error } = await supabase
      .from("growth_records")
      .select("date,weight_kg,height_cm,head_cm")
      .eq("child_id", child.id)
      .order("date", { ascending: true }));

    if (error && /head_cm/i.test(String(error.message || ""))) {
      ({ data, error } = await supabase
        .from("growth_records")
        .select("date,weight_kg,height_cm")
        .eq("child_id", child.id)
        .order("date", { ascending: true }));
    }

    if (!error) {
      growthRows = (data ?? []).map((row: any) => ({
        dateISO: String(row.date || ""),
        weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
        heightCm: row.height_cm == null ? null : Number(row.height_cm),
        headCm: row.head_cm == null ? null : Number(row.head_cm),
      }));
    }
  } catch {
    growthRows = [];
  }

  const currentDateISO = date;
  const currentWeight = weight.trim() ? Number(weight.replace(",", ".")) : null;
  const currentHeight = height.trim() ? Number(height.replace(",", ".")) : null;
  const currentHead = headCircumference.trim() ? Number(headCircumference.replace(",", ".")) : null;

  if (currentWeight != null || currentHeight != null || currentHead != null) {
    growthRows.push({
      dateISO: currentDateISO,
      weightKg: Number.isFinite(currentWeight as number) ? currentWeight : null,
      heightCm: Number.isFinite(currentHeight as number) ? currentHeight : null,
      headCm: Number.isFinite(currentHead as number) ? currentHead : null,
    });
  }

  growthRows = growthRows
    .filter((row) => !!row.dateISO)
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

  function drawMetricChart(title: string, points: Array<{ dateISO: string; value: number }>) {
    if (points.length === 0) return;

    const chartX = 10;
    const chartY = y;
    const chartW = pageWidth - 20;
    const chartH = 34;

    if (chartY + chartH + 20 > 270) {
      doc.addPage();
      y = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, chartX, y);
    y += 3;

    const boxY = y;
    doc.setDrawColor(203, 213, 225);
    doc.rect(chartX, boxY, chartW, chartH);

    const values = points.map((p) => p.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = Math.max(maxV - minV, 1);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text(`${maxV.toFixed(1)}`, chartX + 1, boxY + 3.5);
    doc.text(`${minV.toFixed(1)}`, chartX + 1, boxY + chartH - 1.5);
    doc.text(formatDateBR(points[0].dateISO), chartX + 1, boxY + chartH + 4.5);
    doc.text(formatDateBR(points[points.length - 1].dateISO), chartX + chartW - 1, boxY + chartH + 4.5, {
      align: "right",
    });

    const plotLeft = chartX + 12;
    const plotRight = chartX + chartW - 4;
    const plotTop = boxY + 2;
    const plotBottom = boxY + chartH - 3;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);

    points.forEach((point, idx) => {
      const px =
        points.length === 1
          ? (plotLeft + plotRight) / 2
          : plotLeft + (idx / (points.length - 1)) * (plotRight - plotLeft);
      const normalized = (point.value - minV) / range;
      const py = plotBottom - normalized * (plotBottom - plotTop);

      if (idx > 0) {
        const prev = points[idx - 1];
        const ppx =
          points.length === 1
            ? (plotLeft + plotRight) / 2
            : plotLeft + ((idx - 1) / (points.length - 1)) * (plotRight - plotLeft);
        const pNorm = (prev.value - minV) / range;
        const ppy = plotBottom - pNorm * (plotBottom - plotTop);
        doc.line(ppx, ppy, px, py);
      }

      doc.circle(px, py, 0.8, "F");
    });

    doc.setTextColor(0);
    y = boxY + chartH + 8;
  }

  const weightPoints = growthRows
    .filter((row) => row.weightKg != null)
    .map((row) => ({ dateISO: row.dateISO, value: Number(row.weightKg) }));
  const heightPoints = growthRows
    .filter((row) => row.heightCm != null)
    .map((row) => ({ dateISO: row.dateISO, value: Number(row.heightCm) }));
  const headPoints = growthRows
    .filter((row) => row.headCm != null)
    .map((row) => ({ dateISO: row.dateISO, value: Number(row.headCm) }));

  if (weightPoints.length > 0 || heightPoints.length > 0 || headPoints.length > 0) {
    y += 2;
    drawMetricChart("Gráfico de crescimento - Peso (kg)", weightPoints);
    drawMetricChart("Gráfico de crescimento - Altura (cm)", heightPoints);
    drawMetricChart("Gráfico de crescimento - Perímetro cefálico (cm)", headPoints);
  }
 

  // Assinatura
  if (y > 230) { doc.addPage(); y = 200; }

  doc.setLineWidth(0.2);
  doc.line(60, 260, pageWidth - 60, 260);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(DOCTOR_HEADER.doctorName, pageWidth / 2, 266, { align: "center" });
  doc.text(DOCTOR_HEADER.registration, pageWidth / 2, 272, { align: "center" });

  // use id + timestamp for uniqueness (não somente a data)
  const fileName = `consulta_${child.id}_${Date.now()}.pdf`;
  const blob = doc.output("blob");

  return { blob, fileName };
}

  return (
    
   

    <div className="mt-5 grid gap-4">
      <Card>
        {toast && (
  <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
    {toast}
  </div>
)}

        <div className="p-5">
          <div className="text-sm font-semibold text-slate-900">Gravar consulta</div>
          <div className="mt-1 text-sm text-slate-500">
            e,
            se preencher peso/altura, também em <b>growth_records</b> para o gráfico de crescimento.
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
<Input
  label="Paciente (digite o nome)"
  value={patientSearchText}
  onChange={handlePatientSearchChange}
  placeholder={children.length === 0 ? "Nenhuma criança cadastrada" : "Ex.: Maria"}
/>
<div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
  <div className="text-sm text-slate-700">
    <b>Tempo de atendimento:</b> {formatTimer(timerSeconds)}
  </div>

  <div className="flex items-center gap-2">
    <Button
      variant="secondary"
      onClick={() => setTimerRunning((v) => !v)}
      disabled={loading}
    >
      {timerRunning ? "Pausar" : "Iniciar"}
    </Button>

    <Button
      variant="ghost"
      onClick={() => {
        setTimerRunning(false);
        setTimerSeconds(0);
      }}
      disabled={loading}
    >
      Zerar
    </Button>
  </div>
</div>
            <Input
              label="Data"
              value={date}
              onChange={setDate}
              type="date"
            />
          </div>
          {patientSearchText.trim() && !selectedChild ? (
            <div className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">
              {patientMatches.length === 0
                ? "Nenhum paciente encontrado com esse nome."
                : `Foram encontrados ${patientMatches.length} pacientes. Digite mais para selecionar 1.`}
            </div>
          ) : null}
{selectedChild && (
  <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
    <div><b>Paciente:</b> {selectedChild.name}</div>
    {ageText ? <div><b>Idade:</b> {ageText}</div> : null}
  </div>
)}

          {children.length === 0 && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl p-2">
              Cadastros de crianças são feitos pelo Portal (responsável).
            </div>
          )}

          {/* Campos principais da consulta */}
          <div className="mt-4 grid gap-3">
            <TextArea
              label="Evoluções / orientações gerais"
              value={evolucao}
              onChange={setEvolucao}
              placeholder="Evolução, exame físico, orientações gerais..."
            />
            <TextArea
              label="Doenças / Diagnóstico"
              value={doencas}
              onChange={setDoencas}
              placeholder="CID, hipóteses diagnósticas, etc."
            />
            <TextArea
              label="O que fazer (conduta)"
              value={conduta}
              onChange={setConduta}
              placeholder="Conduta principal / plano terapêutico"
            />
            <TextArea
              label="Exames"
              value={exames}
              onChange={setExames}
              placeholder="Exames solicitados (se houver)"
            />
            <TextArea
              label="Receituário"
              value={receitas}
              onChange={setReceitas}
              placeholder="Medicações e posologia"
            />
            <TextArea
              label="Retorno"
              value={retorno}
              onChange={setRetorno}
              placeholder="Prazo e motivo do retorno"
            />
          </div>

                    {/* 🔹 Campos de crescimento (peso/altura/PC) nessa mesma tela */}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Input
              label="Peso (kg)"
              value={weight}  
              onChange={setWeight}
              type="text"
              placeholder="Ex: 8.5 ou 8,5"
            />
            <Input
              label="Altura (cm)"
              value={height}
              onChange={setHeight}
              type="text"
              placeholder="Ex: 68 ou 68,5"
            />
            <Input
              label="Perímetro cefálico (cm)"
              value={headCircumference}
              onChange={setHeadCircumference}
              type="text"
              placeholder="Ex: 44 ou 44,5"
            />
          </div>

         

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
  onClick={async () => {
    const { blob, fileName } = await gerarPdfConsultaBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }}
  disabled={!patientId || children.length === 0}
  variant="secondary"
>
  Abrir consulta em PDF
</Button>

            
            <Button
              onClick={salvarConsulta}
              disabled={loading || children.length === 0}
            >
              Salvar consulta no sistema
            </Button>
          </div>
        </div>
      </Card>
      <Modal
  open={sendBoxOpen}
  title="Consulta salva ✅"
  subtitle="Enviar PDF ao responsável"
  onClose={() => setSendBoxOpen(false)}
>
  <div className="grid gap-4">
    <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
      <div><b>Paciente:</b> {sendChildName}</div>
      <div className="mt-1 break-all"><b>PDF:</b> {sendPdfUrl}</div>
    </div>

    <Input
      label="Telefone (WhatsApp)"
      value={sendPhone}
      onChange={setSendPhone}
      placeholder="(DDD) 99999-9999"
    />

    <Input
      label="E-mail do responsável"
      value={sendEmail}
      onChange={setSendEmail}
      type="email"
      placeholder="responsavel@exemplo.com"
    />

    <div className="flex flex-wrap justify-end gap-2">
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(sendPdfUrl);
            alert("Link copiado!");
          } catch {
            alert("Não consegui copiar automaticamente.");
          }
        }}
      >
        Copiar link
      </Button>

      <Button
        variant="secondary"
        onClick={() => {
          const digits = normalizePhoneDigits(sendPhone);
          if (!digits) return alert("Preencha o telefone.");
          if (!sendPdfUrl) return alert("PDF ainda não disponível.");

          const msg = `Olá! Segue o PDF da consulta de ${sendChildName}: ${sendPdfUrl}`;
          const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
          window.open(url, "_blank");
        }}
      >
        Enviar por WhatsApp
      </Button>

      <Button
        onClick={() => handleSendEmailConsult(sendPdfUrl, sendChildName, sendEmail)}
      >
        Enviar por e-mail
      </Button>
    </div>

    <div className="text-xs text-slate-500">
      WhatsApp abre o app; e-mail é enviado automaticamente pelo sistema.
    </div>
  </div>
</Modal>

    </div>
  );
}


// ---------- Main ----------

export default function IndexPage() {
  const { loading, email } = useSupabaseSession();

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<Role>("guardian");
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!email) {
      setAppUser(null);
      return;
    }
    const storedRole = (localStorage.getItem(
      `rbgp_role_${email.toLowerCase()}`
    ) as Role | null) ?? null;
    setAppUser({ role: storedRole ?? "guardian", email });
  }, [loading, email]);

  async function logout() {
    await supabase.auth.signOut();
    setAppUser(null);
  }

  function onLoggedIn(u: AppUser) {
    localStorage.setItem(`rbgp_role_${u.email.toLowerCase()}`, u.role);
    setAppUser(u);
  }

  return (
    <Shell>
      <div className="grid gap-6">
        <TopBar
          onOpenLogin={(role) => {
            setLoginMode(role);
            setLoginOpen(true);
          }}
          user={appUser}
        />

        {appUser?.role === "guardian" ? (
          <GuardianHome user={appUser} onLogout={logout} />
        ) : appUser?.role === "doctor" ? (
          <DoctorHome user={appUser} onLogout={logout} />
        ) : (
          <Landing
            onGuardian={() => {
              setLoginMode("guardian");
              setLoginOpen(true);
            }}
            onDoctor={() => {
              setLoginMode("doctor");
              setLoginOpen(true);
            }}
            onSubscribeDoctor={() => {
              setLoginMode("doctor");
              setLoginOpen(true);
            }}
          />
        )}

        <LoginModal
          open={loginOpen}
          mode={loginMode}
          onClose={() => setLoginOpen(false)}
          onLoggedIn={onLoggedIn}
        />
      </div>
    </Shell>
  );
}

// ---------- TopBar / Landing ----------

function TopBar({
  user,
  onOpenLogin,
}: {
  user: AppUser | null;
  onOpenLogin: (role: Role) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {/* coloque sua logo em /public/logo.png */}
          <img src="/logo.png" alt="Logo" className="h-full w-full object-contain p-1" />
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-900">{BRAND.name}</div>
          <div className="text-sm text-slate-500">{BRAND.subtitle}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <Pill
            icon={<ShieldCheck className="h-4 w-4" />}
            label={user.role === "guardian" ? "Responsável" : "Pediatra"}
          />
        ) : (
          <>
            <Button variant="secondary" onClick={() => onOpenLogin("guardian")}>
              <UserRound className="h-4 w-4" /> Portal
            </Button>
            <Button onClick={() => onOpenLogin("doctor")}>
              <Stethoscope className="h-4 w-4" /> Pediatra
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Landing({
  onGuardian,
  onDoctor,
  onSubscribeDoctor,
}: {
  onGuardian: () => void;
  onDoctor: () => void;
  onSubscribeDoctor: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Bem-vindo"
        subtitle="Entre como responsável (Portal) ou como pediatra."
      />
      <div className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <UserRound className="h-4 w-4" /> Portal do paciente
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Crie conta e gerencie Meus filhos, agendamento, dúvidas e documentos.
            </div>
            <div className="mt-4">
              <Button onClick={onGuardian}>
                Entrar no Portal <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Stethoscope className="h-4 w-4" /> Área do pediatra
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Acesso profissional: Marcação de consultas, gravação de consulta e mais.
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={onDoctor}>
                  Acessar <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="secondary" onClick={onSubscribeDoctor}>
                  <CreditCard className="h-4 w-4" /> Assinar plano
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <b></b>
        </div>
      </div>
    </Card>
  );
}
