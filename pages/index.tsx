import React, { useEffect, useMemo, useState } from "react";
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

import { supabase } from "../lib/supabaseClient";

/**
 * Ricardo B. Gurgel Pediatria — Web App (Prévia)
 *
 * ✅ Portal do Paciente: 3 botões (Agendamento, Dúvidas, Documentos/Informações)
 * ✅ Documentos/Informações: Upload PDF + Consultas (resumo) + Crescimento (mock)
 * ✅ Agenda: slots de 30 min (mock)
 * ✅ Área do Pediatra: pacientes + gravar consulta (mock)
 * ✅ Login real (Supabase): Criar conta + Entrar
 * ✅ "Meus filhos": cadastro simples (em memória via localStorage por enquanto)
 *
 * Próximo passo (ETAPA 2): salvar "Meus filhos" no Supabase (tabelas + RLS).
 */

// ---------- Utils ----------

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
  dateISO: string; // ISO
  childName: string;
  conduta: string;
  orientacoes: string;
  retorno: string;
  exames: string;
  receitas: string;
};

const BRAND = {
  name: "Ricardo B. Gurgel Pediatria",
  subtitle: "Portal do paciente e área profissional",
  primary: "#0f172a", // slate-900
  accent: "#1d4ed8", // blue-700
};

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateBR(dateISO: string) {
  try {
    const d = new Date(dateISO);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateISO;
  }
}

function storageKeyChildren(email: string) {
  return `rbgp_children_${email.toLowerCase()}`;
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

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-sm ring-1 ring-slate-200",
        className
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
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
    <button type={type} onClick={onClick} className={cn(base, styles, className)} disabled={disabled}>
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

// ---------- Auth ----------

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

// ---------- Portal do Paciente (3 botões) + Meus filhos ----------

function GuardianHome({
  user,
  onLogout,
}: {
  user: AppUser;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<"home" | "children" | "appointments" | "questions" | "docs">("home");

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
                desc="Escolha um horário de 30 minutos (mock)."
                icon={<CalendarDays className="h-5 w-5" />}
                onClick={() => setTab("appointments")}
              />
              <QuickAction
                title="Dúvidas"
                desc="Envie mensagem (mock)."
                icon={<MessageCircle className="h-5 w-5" />}
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
            <QuestionsMock onBack={() => setTab("home")} />
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

function MyChildren({ user, onBack }: { user: AppUser; onBack: () => void }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKeyChildren(user.email));
    const parsed = raw ? (JSON.parse(raw) as Child[]) : [];
    setChildren(parsed);
    setSelectedId(parsed[0]?.id ?? "");
  }, [user.email]);

  function persist(next: Child[]) {
    setChildren(next);
    localStorage.setItem(storageKeyChildren(user.email), JSON.stringify(next));
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  }

  function remove(id: string) {
    const next = children.filter((c) => c.id !== id);
    persist(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? "");
  }

  const selected = children.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">Meus filhos</div>
          <div className="mt-1 text-sm text-slate-500">Cadastre e selecione a criança para usar o portal.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onBack}>
            Voltar
          </Button>
          <Button onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4" /> Cadastrar filho
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <div className="p-4">
            {children.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Nenhuma criança cadastrada ainda. Clique em <b>Cadastrar filho</b>.
              </div>
            ) : (
              <div className="grid gap-2">
                {children.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border p-3",
                      selectedId === c.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white"
                    )}
                  >
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-sm font-semibold text-slate-900">{c.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Nasc.: {formatDateBR(c.birthDate)} • Sexo: {c.sex}
                      </div>
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                      aria-label="Remover"
                      title="Remover"
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
                  <Pill icon={<CalendarDays className="h-4 w-4" />} label={`Nascimento: ${formatDateBR(selected.birthDate)}`} />
                  <Pill icon={<ShieldCheck className="h-4 w-4" />} label={`Sexo: ${selected.sex}`} />
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Próximo passo: quando você entrar em <b>Documentos/Informações</b>, usaremos este filho selecionado
                  para listar consultas, PDFs e crescimento.
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Atalho</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">Documentos / Informações</div>
                    <div className="mt-1 text-sm text-slate-500">PDFs + Consultas + Crescimento</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-700">Atalho</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">Marcar consulta</div>
                    <div className="mt-1 text-sm text-slate-500">Escolha um horário de 30 min</div>
                  </div>
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
        onAdd={(child) => {
          const next = [child, ...children];
          persist(next);
          setSelectedId(child.id);
        }}
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
  onAdd: (c: Child) => void;
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
    <Modal open={open} title="Cadastrar filho" subtitle="Dados básicos (por enquanto)" onClose={onClose}>
      <div className="grid gap-4">
        <Input label="Nome da criança" value={name} onChange={setName} placeholder="Ex: Rafael" />
        <Input label="Data de nascimento" value={birthDate} onChange={setBirthDate} type="date" />
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
              onAdd({ id: safeId(), name: name.trim(), birthDate, sex });
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

// ---------- Mocks: Agenda / Dúvidas / Docs ----------

function AppointmentsMock({ user, onBack }: { user: AppUser; onBack: () => void }) {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  // simple mock: weekdays available
  const days = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    const res: Array<{ day: number; available: boolean }> = [];
    for (let d = 1; d <= 31; d++) {
      const dt = new Date(today.getFullYear(), today.getMonth(), d);
      if (dt.getMonth() !== today.getMonth()) break;
      const wd = dt.getDay();
      const available = wd !== 0 && wd !== 6; // no weekend
      res.push({ day: d, available });
    }
    return res;
  }, [today]);

  const slots = useMemo(() => {
    const start = 8;
    const end = 17;
    const res: string[] = [];
    for (let h = start; h < end; h++) {
      res.push(`${String(h).padStart(2, "0")}:00`);
      res.push(`${String(h).padStart(2, "0")}:30`);
    }
    return res;
  }, []);

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">Marcar consulta (mock)</div>
          <div className="mt-1 text-sm text-slate-500">Duração fixa: 30 minutos.</div>
        </div>
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-700">Calendário (mês atual)</div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {days.map((d) => (
                <button
                  key={d.day}
                  onClick={() => setSelectedDay(d.day)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-sm font-semibold",
                    d.available ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800",
                    selectedDay === d.day ? "ring-2 ring-slate-900/20" : ""
                  )}
                >
                  {d.day}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">Verde = disponível (mock). Vermelho = indisponível.</div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">Horários (30 min)</div>
              <Pill icon={<Clock className="h-4 w-4" />} label={`Dia ${selectedDay}`} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => alert(`Pedido enviado: dia ${selectedDay} às ${s} (mock).`)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Próximo passo: integrar com agenda real do pediatra e bloquear horários ocupados.
            </div>
          </div>
        </Card>
      </div>

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        Logado como: <b>{user.email}</b> (portal)
      </div>
    </div>
  );
}

function QuestionsMock({ onBack }: { onBack: () => void }) {
  const [msg, setMsg] = useState("");
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">Dúvidas (mock)</div>
          <div className="mt-1 text-sm text-slate-500">Envio de mensagem simples (não salva).</div>
        </div>
        <Button variant="secondary" onClick={onBack}>
          Voltar
        </Button>
      </div>

      <Card>
        <div className="p-4">
          <Input label="Mensagem" value={msg} onChange={setMsg} placeholder="Escreva sua dúvida..." />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() => {
                if (!msg.trim()) return;
                alert("Mensagem enviada (mock)." + msg.trim());
                setMsg("");
              }}
            >
              <MessageCircle className="h-4 w-4" /> Enviar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DocumentsInfoMock({ user, onBack }: { user: AppUser; onBack: () => void }) {
  const [subtab, setSubtab] = useState<"pdf" | "consults" | "growth">("pdf");
  const [consults, setConsults] = useState<ConsultationSummary[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKeyConsultations(user.email));
    setConsults(raw ? (JSON.parse(raw) as ConsultationSummary[]) : []);
  }, [user.email]);

  const tabs = [
    { key: "pdf" as const, label: "PDFs", icon: <UploadCloud className="h-4 w-4" /> },
    { key: "consults" as const, label: "Consultas", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "growth" as const, label: "Crescimento", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">Documentos / Informações</div>
          <div className="mt-1 text-sm text-slate-500">PDFs + Consultas + Crescimento (mock).</div>
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
              subtab === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {subtab === "pdf" ? (
        <Card>
          <div className="p-5">
            <div className="text-sm font-semibold text-slate-900">Upload de PDF (mock)</div>
            <div className="mt-1 text-sm text-slate-500">Por enquanto, apenas interface. Próximo passo: salvar no Supabase Storage.</div>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <UploadCloud className="mx-auto h-6 w-6 text-slate-500" />
              <div className="mt-2 text-sm text-slate-600">Arraste um PDF aqui (mock)</div>
              <div className="mt-3">
                <Button variant="secondary" onClick={() => alert("Upload mock. Em breve, integraremos o Storage.")}>Selecionar arquivo</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {subtab === "consults" ? (
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Consultas (resumo)</div>
                <div className="mt-1 text-sm text-slate-500">Itens gerados pelo pediatra (mock).</div>
              </div>
              <Pill icon={<FileText className="h-4 w-4" />} label={`${consults.length} registro(s)`} />
            </div>

            {consults.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Sem consultas registradas para este responsável (mock).
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {consults.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">{c.childName}</div>
                      <Pill icon={<CalendarDays className="h-4 w-4" />} label={formatDateBR(c.dateISO)} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <div><b>Conduta:</b> {c.conduta}</div>
                      <div><b>Orientações:</b> {c.orientacoes}</div>
                      <div><b>Retorno:</b> {c.retorno}</div>
                      <div><b>Exames:</b> {c.exames}</div>
                      <div><b>Receitas:</b> {c.receitas}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {subtab === "growth" ? (
        <Card>
          <div className="p-5">
            <div className="text-sm font-semibold text-slate-900">Crescimento (mock)</div>
            <div className="mt-1 text-sm text-slate-500">Por enquanto: marcação simples (sem arquivo). Próximo: gráfico real + percentis.</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BarChart3 className="h-4 w-4" /> Peso
                </div>
                <div className="mt-2 text-sm text-slate-600">(mock) — Em breve gráfico.</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BarChart3 className="h-4 w-4" /> Altura
                </div>
                <div className="mt-2 text-sm text-slate-600">(mock) — Em breve gráfico.</div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

// ---------- Pediatra (mock) ----------

function DoctorHome({ user, onLogout }: { user: AppUser; onLogout: () => void }) {
  const [tab, setTab] = useState<"patients" | "record">("patients");

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
                tab === "patients" ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <Users className="inline h-4 w-4" /> Pacientes
            </button>
            <button
              onClick={() => setTab("record")}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold",
                tab === "record" ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              <ClipboardList className="inline h-4 w-4" /> Gravar consulta
            </button>
          </div>

          {tab === "patients" ? (
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              (mock) — Próximo passo: listar pacientes do Supabase.
            </div>
          ) : null}

          {tab === "record" ? (
            <RecordConsultationMock />
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function RecordConsultationMock() {
  const [patient, setPatient] = useState("Rafael");
  const [evolucao, setEvolucao] = useState("");
  const [doencas, setDoencas] = useState("");
  const [conduta, setConduta] = useState("");
  const [receitas, setReceitas] = useState("");

  return (
    <div className="mt-5 grid gap-4">
      <Card>
        <div className="p-5">
          <div className="text-sm font-semibold text-slate-900">Gravar consulta (mock)</div>
          <div className="mt-1 text-sm text-slate-500">Separado por seções, como você pediu.</div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Select
              label="Paciente"
              value={patient}
              onChange={setPatient}
              options={[
                { label: "Rafael", value: "Rafael" },
                { label: "Maria", value: "Maria" },
              ]}
            />
            <Input label="Data" value={new Date().toISOString().slice(0, 10)} onChange={() => {}} type="date" />
          </div>

          <div className="mt-4 grid gap-3">
            <TextArea label="Evoluções" value={evolucao} onChange={setEvolucao} placeholder="Evolução, exame físico, etc." />
            <TextArea label="Doenças / Diagnóstico" value={doencas} onChange={setDoencas} placeholder="CID, hipóteses, etc." />
            <TextArea label="O que fazer (conduta)" value={conduta} onChange={setConduta} placeholder="Orientações e conduta" />
            <TextArea label="Receitas" value={receitas} onChange={setReceitas} placeholder="Medicações e posologia" />
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                alert("Consulta salva (mock). Em breve: salvar no Supabase e aparecer no Portal.");
              }}
            >
              Salvar consulta
            </Button>
          </div>
        </div>
      </Card>
    </div>
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

// ---------- Main ----------

export default function IndexPage() {
  const { loading, email } = useSupabaseSession();

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<Role>("guardian");
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  // if Supabase session exists, keep app user in memory (default to guardian if unknown)
  useEffect(() => {
    if (loading) return;
    if (!email) {
      setAppUser(null);
      return;
    }
    // If user already chose role before, keep it
    const storedRole = (localStorage.getItem(`rbgp_role_${email.toLowerCase()}`) as Role | null) ?? null;
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
          <Pill icon={<ShieldCheck className="h-4 w-4" />} label={user.role === "guardian" ? "Responsável" : "Pediatra"} />
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

function Landing({ onGuardian, onDoctor }: { onGuardian: () => void; onDoctor: () => void }) {
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
            <div className="mt-2 text-sm text-slate-600">Crie conta e gerencie Meus filhos, agendamento, dúvidas e documentos.</div>
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
            <div className="mt-2 text-sm text-slate-600">Acesso profissional: pacientes e gravação de consulta (mock).</div>
            <div className="mt-4">
              <Button onClick={onDoctor}>
                Acessar <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Dica: sua logo deve ficar em <b>public/logo.png</b>.
        </div>
      </div>
    </Card>
  );
}
