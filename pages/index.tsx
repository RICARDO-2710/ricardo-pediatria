"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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

import { supabase } from "../lib/supabaseClient";



const REF_WEIGHT_CURVE = [
  { ageMonths: 0, value: 3.3 },
  { ageMonths: 1, value: 4.5 },
  { ageMonths: 2, value: 5.6 },
  { ageMonths: 3, value: 6.4 },
  { ageMonths: 4, value: 7.0 },
  { ageMonths: 5, value: 7.5 },
  { ageMonths: 6, value: 7.9 },
  { ageMonths: 9, value: 8.9 },
  { ageMonths: 12, value: 9.6 },
  { ageMonths: 18, value: 10.9 },
  { ageMonths: 24, value: 12.2 },
  { ageMonths: 36, value: 14.3 },
  { ageMonths: 48, value: 16.3 },
  { ageMonths: 60, value: 18.3 },
];

const REF_HEIGHT_CURVE = [
  { ageMonths: 0, value: 49.9 },
  { ageMonths: 1, value: 54.7 },
  { ageMonths: 2, value: 58.4 },
  { ageMonths: 3, value: 61.4 },
  { ageMonths: 4, value: 63.9 },
  { ageMonths: 5, value: 65.9 },
  { ageMonths: 6, value: 67.6 },
  { ageMonths: 9, value: 71.0 },
  { ageMonths: 12, value: 74.0 },
  { ageMonths: 18, value: 80.0 },
  { ageMonths: 24, value: 86.0 },
  { ageMonths: 36, value: 95.0 },
  { ageMonths: 48, value: 102.0 },
  { ageMonths: 60, value: 109.0 },
];




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
 *    - Acesso restrito a e-mails da lista DOCTOR_EMAILS
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
};


// ---------- Constantes ----------

const BRAND = {
  name: "Ricardo B. Gurgel Pediatria",
  subtitle: "Portal do paciente e área profissional",
  primary: "#0f172a",
  accent: "#1d4ed8",
};

// 👇 SOMENTE estes e-mails podem acessar a Área do Pediatra
const DOCTOR_EMAILS = [
  "ricardobgurgel@gmail.com", // TROQUE pelo seu e-mail profissional
 // você pode adicionar mais aqui se quiser
];

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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setPassword("");
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
      alert("Conta criada! Agora clique em Entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    setBusy(true);
    try {
      // Restrição: somente e-mails autorizados entram como pediatra
      if (mode === "doctor") {
        const normalized = email.trim().toLowerCase();
        const allowed = DOCTOR_EMAILS.map((e) => e.toLowerCase());
        if (!allowed.includes(normalized)) {
          alert(
             "Acesso à área do pediatra é restrito. Use o botão Portal para acesso como responsável."
          );
          setBusy(false);
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
          placeholder="mínimo 6 caracteres"
        />

        <div className="grid gap-2">
          <Button onClick={handleSignIn} disabled={busy || !email || password.length < 6}>
            <LogIn className="h-4 w-4" /> Entrar
          </Button>

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
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [openAdd, setOpenAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        "id,name,birth_date,sex,guardian_id,guardian_email,guardian_phone"
      )
      .or(`guardian_id.eq.${uid},guardian_email.eq.${email}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = data ?? [];

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
            "id,name,birth_date,sex,guardian_id,guardian_email,guardian_phone"
          )
          .or(`guardian_id.eq.${uid},guardian_email.eq.${email}`)
          .order("created_at", { ascending: false });

        if (!error2) {
          rows.splice(0, rows.length, ...(data2 ?? []));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);

  // sempre que mudar o selecionado, grava no localStorage
  useEffect(() => {
    if (!selectedId) return;
    const storageKey = `rbgp_selected_child_${user.email.toLowerCase()}`;
    localStorage.setItem(storageKey, selectedId);
  }, [selectedId, user.email]);

async function addChild(child: Omit<Child, "id">) {
  setLoading(true);
  setErr(null);
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) {
      alert("Erro ao obter usuário autenticado: " + authError.message);
      return;
    }

    const uid = auth.user?.id;
    const email = auth.user?.email ?? null;

    if (!uid) {
      alert("Sessão expirada. Faça login novamente.");
      return;
    }

    const { data, error } = await supabase
      .from("children")
      .insert({
        guardian_id: uid,
        name: child.name,
        birth_date: child.birthDate,
        sex: child.sex,
        guardian_email: email, // salva também o e-mail do responsável
        guardian_phone: null,
      })
      .select("id,name,birth_date,sex,guardian_email,guardian_phone")
      .single();

    if (error) {
      alert("Erro ao salvar no Supabase: " + error.message);
      return;
    }

    const created: Child = {
      id: String((data as any).id),
      name: String((data as any).name),
      birthDate: String((data as any).birth_date),
      sex: ((data as any).sex as Child["sex"]) ?? "O",
      guardianEmail: (data as any).guardian_email ?? null,
      guardianPhone: (data as any).guardian_phone ?? null,
    };

    setChildren((prev) => [created, ...prev]);
    setSelectedId(created.id);
  } catch (e: any) {
    alert("Erro inesperado: " + (e?.message ?? "desconhecido"));
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
      subtitle="Dados básicos (por enquanto)"
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
        <Input
  label="E-mail do responsável"
  value={guardianEmail}
  onChange={setGuardianEmail}
  type="email"
  placeholder="email@exemplo.com"
/>

<Input
  label="Telefone do responsável"
  value={guardianPhone}
  onChange={setGuardianPhone}
  placeholder="(81) 9 9999-9999"
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
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                alert("Informe o nome.");
                return;
              }
              if (!birthDate) {
                alert("Informe a data de nascimento.");
                return;
              }
              if (!guardianEmail.trim()) {
                alert("Informe o e-mail do responsável.");
                return;
              }

              onAdd({
                name: name.trim(),
                birthDate,
                sex,
                guardianEmail: guardianEmail.trim().toLowerCase(),
                guardianPhone: guardianPhone.trim() || null,
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
  const RECIFE_OFFSET = "-03:00";
  const today = new Date();

  // Mês/ano exibidos no calendário
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  // Dia selecionado dentro do mês exibido
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  // pedidos do responsável (lista de baixo)
  const [myAppts, setMyAppts] = useState<
    Array<{ id: string; start_at: string; status: string; child_id: string; childName: string }>
  >([]);
  const [loadingMyAppts, setLoadingMyAppts] = useState(false);
  const [errMyAppts, setErrMyAppts] = useState<string | null>(null);

  // disponibilidade real do dia (slot -> existe availability ativa?)
  const [dayAvail, setDayAvail] = useState<Record<string, boolean>>({});
  // horários já ocupados (appointment requested/confirmed)
  const [dayBusy, setDayBusy] = useState<Record<string, boolean>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

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

  // slots fixos 08h–17h
  const slots = useMemo(() => {
    const res: string[] = [];
    const start = 8;
    const end = 17;
    for (let h = start; h < end; h++) {
      res.push(`${pad2(h)}:00`);
      res.push(`${pad2(h)}:30`);
    }
    return res;
  }, []);

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
    


      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_at, status, child_id")
        .eq("guardian_id", guardianId)
        .order("start_at", { ascending: true });

      if (error) throw error;

      const mapped = (data ?? []).map((a: any) => ({
        id: String(a.id),
        start_at: String(a.start_at),
        status: String(a.status ?? "requested"),
        child_id: String(a.child_id ?? ""),
        childName: childMap.get(String(a.child_id)) ?? "Paciente",
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

      const { data, error } = await supabase
        .from("doctor_availability")
        .select("start_at,is_active")
        .eq("is_active", true)
        .gte("start_at", startStr)
        .lte("start_at", endStr);

      if (error) throw error;

      const map: Record<string, boolean> = {};

      (data ?? []).forEach((a: any) => {
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
    try {
      const dateObj = new Date(year, month, day);
      const dateStr = ymd(dateObj);
      const { start, end } = dayBounds(dateStr);

      const { data: availData, error: availError } = await supabase
        .from("doctor_availability")
        .select("id,start_at,is_active")
        .eq("is_active", true)
        .gte("start_at", start)
        .lte("start_at", end);

      if (availError) throw availError;

      const availMap: Record<string, boolean> = {};
      (availData ?? []).forEach((a: any) => {
        const d = new Date(a.start_at);
        const hh = pad2(d.getHours());
        const mm = pad2(d.getMinutes());
        const key = `${hh}:${mm}`;
        availMap[key] = true;
      });

      const { data: apptsData, error: apptsError } = await supabase
        .from("appointments")
        .select("start_at,status")
        .in("status", ["requested", "confirmed"])
        .gte("start_at", start)
        .lte("start_at", end);

      if (apptsError) throw apptsError;

      const busyMap: Record<string, boolean> = {};
      (apptsData ?? []).forEach((a: any) => {
        const d = new Date(a.start_at);
        const hh = pad2(d.getHours());
        const mm = pad2(d.getMinutes());
        const key = `${hh}:${mm}`;
        busyMap[key] = true;
      });

      setDayAvail(availMap);
      setDayBusy(busyMap);
    } catch (e: any) {
      console.error(e);
      setDayAvail({});
      setDayBusy({});
    } finally {
      setLoadingSlots(false);
    }
  }

  // carrega pedidos do responsável
  useEffect(() => {
    loadMyAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sempre que mudar o mês/ano, recarrega mapa de disponibilidade de dias
  useEffect(() => {
    loadMonthAvailability(viewYear, viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  // sempre que mudar o dia/mês/ano, recarrega slots daquele dia
  useEffect(() => {
    loadDayData(selectedDay, viewYear, viewMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, viewYear, viewMonth]);

  // --- MARCAR CONSULTA ---

  async function handleRequest(slot: string) {
    try {
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
      const endMinutes = hh * 60 + mm + 30;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const end_at = recifeISO(dateStr, endH, endM);

      const { error: insertError } = await supabase.from("appointments").insert({
        guardian_id: guardianId,
        child_id: selectedChildId,
        start_at,
        end_at,
        status: "requested",
      });

      if (insertError) {
        console.error(insertError);
        alert("Erro ao registrar pedido: " + insertError.message);
        return;
      }

      alert("Pedido de consulta registrado! Aguardando confirmação do pediatra.");
      await loadMyAppointments();
      await loadDayData(selectedDay, viewYear, viewMonth);
      await loadMonthAvailability(viewYear, viewMonth);
    } catch (e: any) {
      console.error(e);
      alert("Erro inesperado: " + (e?.message ?? "desconhecido"));
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
            Duração fixa: 30 minutos. Só é possível marcar até 60 dias à frente.
          </div>
        </div>
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                Horários (30 min)
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
                        if (!isAvailable || isBusy) return;
                        handleRequest(s);
                      }}
                      className={slotClass}
                      disabled={!isAvailable || isBusy}
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
    Array<{ id: string; start_at: string; status: string; childName: string }>
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

      const { data, error } = await supabase
        .from("appointments")
        .select("id, start_at, status, child_id")
        .eq("guardian_id", guardianId)
        .order("start_at", { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map((a: any) => ({
        id: String(a.id),
        start_at: String(a.start_at),
        status: String(a.status ?? "requested"),
        child_id: String(a.child_id ?? ""),
        childName: childMap.get(String(a.child_id)) ?? "Paciente",
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
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [errorGrowth, setErrorGrowth] = useState<string | null>(null);
  const [growthChildName, setGrowthChildName] = useState<string>("");

  // junta curva de referência + dados da criança
  const growthChartData = useMemo(() => {
    const refs = growthMetric === "weight" ? REF_WEIGHT_CURVE : REF_HEIGHT_CURVE;
    if (!refs.length) return [];

    const childByAge: Record<number, number> = {};
    growthData.forEach((g) => {
      const age = g.ageMonths;
      const v = growthMetric === "weight" ? g.weightKg : g.heightCm;
      if (v != null && !Number.isNaN(v)) {
        childByAge[age] = v;
      }
    });

    return refs.map((r) => ({
      ageMonths: r.ageMonths,
      ref: r.value,
      child: childByAge[r.ageMonths] ?? null,
    }));
  }, [growthMetric, growthData]);

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
    setLoadingConsults(true);
    setErrorConsults(null);
    try {
      const { data, error } = await supabase
        .from("consultations")
            .select("id, child_id, child_name, date, conduta, orientacoes, retorno, exames, receitas, pdf_url")
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
        .select("name,birth_date")
        .eq("id", selectedChildId)
        .single();

      if (childError) throw childError;

      const childName = String(childData.name);
      const birthDateStr = String(childData.birth_date);
      const birthDate = new Date(birthDateStr);

      setGrowthChildName(childName);

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
                          <b>Receitas:</b> {c.receitas}
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
                  Curva de referência (aproximada) por idade em meses + dados registrados
                  na tela <b>Gravar consulta</b>.
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
                        tickFormatter={(v) => `${v}m`}
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
    if (typeof value !== "number") {
      return ["", ""];
    }

    const label =
      name === "ref"
        ? "Curva ref."
        : growthChildName || "Paciente";

    return [value, label];
  }}
  labelFormatter={(label) => `Idade: ${label} meses`}
/>


                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ref"
                        name="Curva ref."
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="child"
                        name={growthChildName || "Paciente"}
                        strokeWidth={2}
                      />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  {!hasChildGrowthData && (
                    <div>
                      Ainda não há medidas de{" "}
                      {growthMetric === "weight" ? "peso" : "altura"} registradas
                      para este paciente. A linha do paciente aparecerá assim que
                      você lançar peso/altura em <b>Gravar consulta</b>.
                    </div>
                  )}
                  <div>
                    Linha <b>Curva ref.</b> = valores médios aproximados por idade em meses.
                  </div>
                  <div>
                    Linha <b>{growthChildName || "Paciente"}</b> = medidas lançadas
                    na tabela <code>growth_records</code>.
                  </div>
                  <div>
                    ⚠️ Uso apenas ilustrativo. Para decisão clínica, use as curvas
                    oficiais (OMS, SBP, etc.) e ajuste os dados de referência conforme
                    a sua preferência.
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
  const [tab, setTab] = useState<"patients" | "agenda" | "record" | "availability">("patients");

  return (
    <div className="grid gap-6">
      <Card>
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTab("patients")}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold",
                tab === "patients"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <Users className="inline h-4 w-4" /> Pacientes
            </button>

            <button
              onClick={() => setTab("agenda")}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold",
                tab === "agenda"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <CalendarDays className="inline h-4 w-4" /> Consultas
            </button>

            <button
              onClick={() => setTab("availability")}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold",
                tab === "availability"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <Clock className="inline h-4 w-4" /> Disponibilidade
            </button>

            <button
              onClick={() => setTab("record")}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold",
                tab === "record"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <ClipboardList className="inline h-4 w-4" /> Atender
            </button>
          </div>

          {tab === "patients" ? <DoctorPatients /> : null}
          {tab === "agenda" ? <DoctorAppointments /> : null}
          {tab === "availability" ? <DoctorAvailability /> : null}
          {tab === "record" ? <RecordConsultationMock /> : null}
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
    const { data, error } = await supabase
      .from("children")
      .select("id,name,birth_date,sex,guardian_email,guardian_phone")
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
    "id, child_id, child_name, date, conduta, orientacoes, retorno, exames, receitas, pdf_url"
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


async function createPatient(data: {
  name: string;
  birthDate: string;
  sex: Child["sex"];
  guardianEmail: string;
  guardianPhone: string;
}) {
  setLoading(true);
  setErr(null);

  try {
    const cleanName = data.name.trim();
    const cleanBirth = data.birthDate;
    const cleanEmail = data.guardianEmail.trim().toLowerCase();
    const cleanPhone = data.guardianPhone.trim();

    if (!cleanName) {
      alert("Informe o nome da criança.");
      return;
    }
    if (!cleanBirth) {
      alert("Informe a data de nascimento.");
      return;
    }
    if (!cleanEmail) {
      alert("Informe o e-mail do responsável.");
      return;
    }

    const { error } = await supabase.from("children").insert({
      name: cleanName,
      birth_date: cleanBirth,
      sex: data.sex,
      guardian_email: cleanEmail,
      guardian_phone: cleanPhone || null,
      // ⚠️ IMPORTANTE: NÃO manda guardian_id aqui!
      // Isso será preenchido depois, quando o responsável fizer login.
    });

    if (error) {
      alert("Erro ao cadastrar paciente: " + error.message);
      return;
    }

    alert("Paciente cadastrado e vinculado ao e-mail do responsável!");
    await loadChildren();
  } catch (e: any) {
    alert("Erro inesperado: " + (e?.message ?? "desconhecido"));
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
                              <b>Receitas:</b> {c.receitas}
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
  };

  const RECIFE_OFFSET = "-03:00";
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<string>(
    today.toISOString().slice(0, 10)
  );
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  // slots de 30 em 30 min, 08h–17h
  const slots: string[] = useMemo(() => {
    const res: string[] = [];
    const start = 8;
    const end = 17;
    for (let h = start; h < end; h++) {
      res.push(`${pad2(h)}:00`);
      res.push(`${pad2(h)}:30`);
    }
    return res;
  }, []);

  function dayBounds(dateStr: string) {
    const start = `${dateStr}T00:00:00${RECIFE_OFFSET}`;
    const end = `${dateStr}T23:59:59${RECIFE_OFFSET}`;
    return { start, end };
  }

  async function load() {
    if (!selectedDate) return;
    setLoading(true);
    setErr(null);
    try {
      const { start, end } = dayBounds(selectedDate);

      const { data, error } = await supabase
        .from("doctor_availability")
        .select("id,start_at,end_at,is_active")
        .eq("is_active", true)
        .gte("start_at", start)
        .lte("start_at", end)
        .order("start_at", { ascending: true });

      if (error) throw error;

      setItems(
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          start_at: String(r.start_at),
          end_at: String(r.end_at),
          is_active: Boolean(r.is_active),
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
  }, [selectedDate]);

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
    if (!selectedDate) return;
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
          .eq("id", existingId);

        if (error) throw error;
      } else {
        // cria disponibilidade
        const start_at = recifeISO(selectedDate, hh, mm);
        const endMinutes = hh * 60 + mm + 30;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        const end_at = recifeISO(selectedDate, endH, endM);

        const { error } = await supabase.from("doctor_availability").insert({
          start_at,
          end_at,
          is_active: true,
        });

        if (error) throw error;
      }

      await load();
    } catch (e: any) {
      console.error(e);
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
                (blocos de 30 minutos).
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                label="Data"
                value={selectedDate}
                onChange={setSelectedDate}
                type="date"
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
function RecordConsultationMock() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));


  const [evolucao, setEvolucao] = useState("");
  const [doencas, setDoencas] = useState("");
  const [conduta, setConduta] = useState("");
  const [receitas, setReceitas] = useState("");
  const [exames, setExames] = useState("");
  const [retorno, setRetorno] = useState("");

  // 🔹 Novos campos: peso e altura para alimentar growth_records
  const [weight, setWeight] = useState(""); // kg
  const [height, setHeight] = useState(""); // cm
  const [headCircumference, setHeadCircumference] = useState(""); // cm

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

  // 🔹 Gera o PDF em memória (Blob), sem baixar no navegador
  function createConsultPdfBlob(child: Child): Blob {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = 10;

    // --- LOGO (se tiver base64 preenchido) ---
    if (LOGO_BASE64 && LOGO_BASE64.length > 0) {
      const logoWidth = 22;
      const logoHeight = 22;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(LOGO_BASE64, "PNG", logoX, y, logoWidth, logoHeight);
      y += logoHeight + 4;
    }

    // --- CABEÇALHO DO CONSULTÓRIO ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(DOCTOR_HEADER.doctorName, pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(DOCTOR_HEADER.specialty, pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.text(DOCTOR_HEADER.registration, pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.text(DOCTOR_HEADER.clinicName, pageWidth / 2, y, { align: "center" });
    y += 5;

    const addressLines = doc.splitTextToSize(
      DOCTOR_HEADER.clinicAddress,
      pageWidth - 30
    );
    doc.text(addressLines, pageWidth / 2, y, { align: "center" });
    y += addressLines.length * 5;

    if (DOCTOR_HEADER.clinicPhone) {
      doc.text(DOCTOR_HEADER.clinicPhone, pageWidth / 2, y, {
        align: "center",
      });
      y += 6;
    }

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

    doc.text(`Data da consulta: ${formatDateBR(date)}`, 10, y);
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
    bloco("Receitas:", receitas);
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


    async function salvarConsulta() {
    if (!patientId) {
      alert("Selecione um paciente.");
      return;
    }
    if (!conduta.trim()) {
      alert("Preencha pelo menos a conduta.");
      return;
    }

    const child = children.find((c) => c.id === patientId);
    if (!child) {
      alert("Paciente inválido.");
      return;
    }

    setLoading(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) {
        alert("Erro ao obter usuário autenticado: " + authError.message);
        return;
      }

      const doctorEmail = auth.user?.email ?? null;

      // 1) Salva a consulta na tabela consultations
      const { error: insertConsultError } = await supabase
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
        });

      if (insertConsultError) {
        alert("Erro ao salvar consulta: " + insertConsultError.message);
        return;
      }

      // 2) Se tiver peso, altura e/ou perímetro cefálico, grava também em growth_records
      const weightTrim = weight.trim();
      const heightTrim = height.trim();
      const pcTrim = headCircumference.trim();

      // aceita vírgula como decimal (ex: "8,5")
      const w =
        weightTrim.length > 0
          ? Number(weightTrim.replace(",", "."))
          : null;
      const h =
        heightTrim.length > 0
          ? Number(heightTrim.replace(",", "."))
          : null;
      const pc =
        pcTrim.length > 0
          ? Number(pcTrim.replace(",", "."))
          : null;

      const temValorValido =
        (w !== null && !Number.isNaN(w)) ||
        (h !== null && !Number.isNaN(h)) ||
        (pc !== null && !Number.isNaN(pc));

      if (temValorValido) {
        const { error: growthError } = await supabase
          .from("growth_records")
          .insert({
            child_id: child.id,
            date: date, // mesma data da consulta
            weight_kg: w !== null && !Number.isNaN(w) ? w : null,
            height_cm: h !== null && !Number.isNaN(h) ? h : null,
            head_circumference_cm:
              pc !== null && !Number.isNaN(pc) ? pc : null,
          });

        if (growthError) {
          console.error(growthError);
          // não trava o fluxo, só avisa
          alert(
            "Consulta salva, mas houve erro ao registrar peso/altura/PC: " +
              growthError.message
          );
        } else {
          console.log("Medidas de crescimento registradas com sucesso.");
        }
      }

      alert(
        "Consulta salva! Ela já aparece em Documentos → Consultas e, se você informou peso/altura/PC, também em Documentos → Crescimento."
      );

      // Limpar campos principais
      setEvolucao("");
      setDoencas("");
      setConduta("");
      setReceitas("");
      setExames("");
      setRetorno("");
      setWeight("");
      setHeight("");
      setHeadCircumference("");
    } catch (e: any) {
      alert("Erro inesperado: " + (e?.message ?? "desconhecido"));
    } finally {
      setLoading(false);
    }
  }



  // 🔹 Gerar PDF da consulta com os dados preenchidos
  // 🔹 Gerar PDF da consulta com cabeçalho e logo
  function gerarPdfConsulta() {
    if (!patientId) {
      alert("Selecione um paciente.");
      return;
    }

    const child = children.find((c) => c.id === patientId);
    if (!child) {
      alert("Paciente inválido.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    let y = 10;

    // --- LOGO (se tiver base64 preenchido) ---
    if (LOGO_BASE64 && LOGO_BASE64.length > 0) {
      const logoWidth = 22;
      const logoHeight = 22;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(LOGO_BASE64, "PNG", logoX, y, logoWidth, logoHeight);
      y += logoHeight + 4;
    }

    // --- CABEÇALHO DO CONSULTÓRIO ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(DOCTOR_HEADER.doctorName, pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(DOCTOR_HEADER.specialty, pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.text(DOCTOR_HEADER.registration, pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.text(DOCTOR_HEADER.clinicName, pageWidth / 2, y, { align: "center" });
    y += 5;

    const addressLines = doc.splitTextToSize(
      DOCTOR_HEADER.clinicAddress,
      pageWidth - 30
    );
    doc.text(addressLines, pageWidth / 2, y, { align: "center" });
    y += addressLines.length * 5;

    if (DOCTOR_HEADER.clinicPhone) {
      doc.text(DOCTOR_HEADER.clinicPhone, pageWidth / 2, y, { align: "center" });
      y += 6;
    }

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

    doc.text(`Data da consulta: ${formatDateBR(date)}`, 10, y);
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

    y += 6;

    // --- FUNÇÃO AUXILIAR PARA OS BLOCOS DE TEXTO ---
    function bloco(titulo: string, conteudo: string) {
      if (!conteudo.trim()) return;

      // Quebra de página se estiver muito embaixo
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

    // --- BLOCOS DA CONSULTA ---
    bloco("Doenças / Diagnóstico:", doencas);
    bloco("Evolução / Orientações gerais:", evolucao);
    bloco("Conduta:", conduta);
    bloco("Exames:", exames);
    bloco("Receitas:", receitas);
    bloco("Retorno:", retorno);

    // --- RODAPÉ (opcional: linha de assinatura) ---
    if (y > 230) {
      doc.addPage();
      y = 200;
    }

    doc.setLineWidth(0.2);
    doc.line(60, 260, pageWidth - 60, 260);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(DOCTOR_HEADER.doctorName, pageWidth / 2, 266, { align: "center" });
    doc.text(DOCTOR_HEADER.registration, pageWidth / 2, 272, {
      align: "center",
    });

    const nomeArquivo = `consulta_${child.name.replace(/\s+/g, "_")}_${date}.pdf`;
    doc.save(nomeArquivo);
  }

  return (
    <div className="mt-5 grid gap-4">
      <Card>
        <div className="p-5">
          <div className="text-sm font-semibold text-slate-900">Gravar consulta</div>
          <div className="mt-1 text-sm text-slate-500">
            Agora salvando de verdade no Supabase (tabela <b>consultations</b>) e,
            se preencher peso/altura, também em <b>growth_records</b> para o gráfico de crescimento.
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Select
              label="Paciente"
              value={patientId}
              onChange={setPatientId}
              options={
                children.length === 0
                  ? [{ label: "Nenhuma criança cadastrada", value: "" }]
                  : children.map((c) => ({
                      label: c.name,
                      value: c.id,
                    }))
              }
            />
            <Input
              label="Data"
              value={date}
              onChange={setDate}
              type="date"
            />
          </div>

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
              label="Receitas"
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
              onClick={gerarPdfConsulta}
              disabled={!patientId || children.length === 0}
              variant="secondary"
            >
              Salvar consulta em PDF
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
}: {
  onGuardian: () => void;
  onDoctor: () => void;
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
              Acesso profissional: pacientes (Supabase) e gravação de consulta (mock).
            </div>
            <div className="mt-4">
              <Button onClick={onDoctor}>
                Acessar <ChevronRight className="h-4 w-4" />
              </Button>
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
