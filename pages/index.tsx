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
 *    - Marcar consulta (mock)
 *    - Dúvidas (mock)
 *    - Documentos / Informações (mock)
 *
 * ✅ Área do Pediatra:
 *    - Acesso restrito a e-mails da lista DOCTOR_EMAILS
 *    - Aba Pacientes: lista de crianças reais do Supabase
 *    - Aba Gravar consulta: formulário mock (ainda não salva no banco)
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

function handleSendWhatsAppConsult(pdfUrl: string, childName: string) {
  if (typeof window === "undefined") return;
  const msg = `Olá! Segue o PDF da consulta de ${childName}: ${pdfUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
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

      // tenta manter o selecionado do localStorage
      const storageKey = `rbgp_selected_child_${user.email.toLowerCase()}`;
      const stored = localStorage.getItem(storageKey);

      const initialId =
        (stored && mapped.some((c) => c.id === stored) && stored) ||
        mapped[0]?.id ||
        "";

      setSelectedId(initialId);
    } catch (e: any) {
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
        })
        .select("id,name,birth_date,sex")
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
                  <div key={c.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-left text-sm transition",
                        selectedId === c.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Nasc.: {formatDateBR(c.birthDate)} • Sexo: {c.sex}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remover cadastro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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

  useEffect(() => {
    if (!open) return;
    setName("");
    setBirthDate("");
    setSex("M");
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
              onAdd({ name: name.trim(), birthDate, sex });
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
              <ClipboardList className="inline h-4 w-4" /> Gravar consulta
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
            <Button variant="secondary" onClick={loadChildren} disabled={loading}>
              Recarregar
            </Button>
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
                                    {c.pdfUrl && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
              onClick={() =>
                handleSendWhatsAppConsult(c.pdfUrl!, c.childName)
              }
              className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Enviar via WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleCopyConsultPdfLink(c.pdfUrl!)}
              className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Copiar link
            </button>
          </div>
        )}

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
    </div>
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
      // 1) Buscar crianças (para mostrar o nome ao invés do id)
      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("id,name");

      if (childrenError) throw childrenError;

      const childMap = new Map<string, string>();
      (childrenData ?? []).forEach((c: any) => {
        childMap.set(String(c.id), String(c.name));
      });

      // 2) Buscar TODOS os agendamentos, sem filtro por data
      const { data: apptsData, error: apptsError } = await supabase
        .from("appointments")
        .select("id, child_id, start_at, end_at, status")
        .order("start_at", { ascending: true });

      if (apptsError) throw apptsError;

      const mapped: AppointmentItem[] = (apptsData ?? []).map((r: any) => ({
        id: String(r.id),
        start_at: String(r.start_at),
        end_at: String(r.end_at),
        status: String(r.status ?? "requested"),
        childName: childMap.get(String(r.child_id)) ?? "Paciente sem nome",
      }));

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

      // 2) Se tiver peso e/ou altura preenchidos, grava também em growth_records
      const weightTrim = weight.trim();
      const heightTrim = height.trim();

      // aceita vírgula como decimal (ex: "8,5")
      const w =
        weightTrim.length > 0
          ? Number(weightTrim.replace(",", "."))
          : null;
      const h =
        heightTrim.length > 0
          ? Number(heightTrim.replace(",", "."))
          : null;

      if (
        (w !== null && !Number.isNaN(w)) ||
        (h !== null && !Number.isNaN(h))
      ) {
        const { error: growthError } = await supabase
          .from("growth_records")
          .insert({
            child_id: child.id,
            date: date, // mesma data da consulta
            weight_kg: w,
            height_cm: h,
          });

        if (growthError) {
          console.error(growthError);
          // não trava o fluxo, só avisa
          alert(
            "Consulta salva, mas houve erro ao registrar peso/altura: " +
              growthError.message
          );
        } else {
          console.log("Medidas de crescimento registradas com sucesso.");
        }
      }

      alert(
        "Consulta salva! Ela já aparece em Documentos → Consultas e, se você informou peso/altura, também em Documentos → Crescimento."
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
    } catch (e: any) {
      alert("Erro inesperado: " + (e?.message ?? "desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  // 🔹 Gerar PDF da consulta com os dados preenchidos
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

    let y = 10;

    doc.setFontSize(16);
    doc.text("Consulta Pediátrica", 10, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`Paciente: ${child.name}`, 10, y);
    y += 6;

    doc.text(`Data: ${formatDateBR(date)}`, 10, y);
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

    y += 4;

    function bloco(titulo: string, conteudo: string) {
      if (!conteudo.trim()) return;
      if (y > 270) {
        doc.addPage();
        y = 10;
      }
      doc.setFontSize(12);
      doc.text(titulo, 10, y);
      y += 5;
      doc.setFontSize(11);
      const linhas = doc.splitTextToSize(conteudo.trim(), 190);
      doc.text(linhas, 10, y);
      y += linhas.length * 5 + 4;
    }

    bloco("Doenças / Diagnóstico:", doencas);
    bloco("Evoluções / Orientações gerais:", evolucao);
    bloco("Conduta:", conduta);
    bloco("Exames:", exames);
    bloco("Receitas:", receitas);
    bloco("Retorno:", retorno);

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

          {/* 🔹 Campos de crescimento (peso/altura) nessa mesma tela */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              label="Peso (kg)"
              value={weight}
              onChange={setWeight}
              type="text"
              placeholder='Ex: 8.5 ou 8,5'
            />
            <Input
              label="Altura (cm)"
              value={height}
              onChange={setHeight}
              type="text"
              placeholder='Ex: 68 ou 68,5'
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
