import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type ConsultationNotes = {
  evolucao: string;
  doencas: string;
  conduta: string;
  exames: string;
  receitas: string;
  retorno: string;
  weight: string;
  height: string;
  headCircumference: string;
};

const NOTE_KEYS: Array<keyof ConsultationNotes> = [
  "evolucao",
  "doencas",
  "conduta",
  "exames",
  "receitas",
  "retorno",
  "weight",
  "height",
  "headCircumference",
];

function normalizeForSourceMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function readCandidateText(data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }) {
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

function emptyNotes(): ConsultationNotes {
  return {
    evolucao: "",
    doencas: "",
    conduta: "",
    exames: "",
    receitas: "",
    retorno: "",
    weight: "",
    height: "",
    headCircumference: "",
  };
}

function readNumberTokens(value: string) {
  return value.match(/\d+(?:[.,]\d+)?/g) || [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: "IA gratuita não configurada. Adicione GEMINI_API_KEY ao ambiente." });
  }

  const { transcript: rawTranscript, doctorEmail: rawDoctorEmail, consent } = (req.body || {}) as {
    transcript?: string;
    doctorEmail?: string;
    consent?: boolean;
  };
  const transcript = typeof rawTranscript === "string" ? rawTranscript.trim().slice(0, 24_000) : "";
  const doctorEmail = String(rawDoctorEmail || "").trim().toLowerCase();

  if (consent !== true) {
    return res.status(400).json({ error: "Confirme a autorização para processar a transcrição." });
  }
  if (!transcript) {
    return res.status(400).json({ error: "A transcrição ficou vazia. Tente gravar novamente." });
  }
  if (transcript.length < 8) {
    return res.status(400).json({ error: "A transcrição ficou curta demais. Confira o microfone e tente novamente." });
  }
  if (transcript.length >= 24_000) {
    return res.status(413).json({ error: "Transcrição muito longa. Divida a consulta em trechos menores." });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return res.status(401).json({ error: "Sessão inválida. Entre novamente na conta do pediatra." });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user?.email) {
    return res.status(401).json({ error: "Sessão expirada. Entre novamente na conta do pediatra." });
  }
  if (doctorEmail !== authData.user.email.trim().toLowerCase()) {
    return res.status(403).json({ error: "A conta autenticada não corresponde à conta do pediatra." });
  }

  const properties = Object.fromEntries(NOTE_KEYS.map((key) => [key, {
    type: "OBJECT",
    properties: {
      text: { type: "STRING" },
      source: { type: "STRING" },
    },
    required: ["text", "source"],
  }]));
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text: [
                "Organize a transcrição nos tópicos da consulta e melhore apenas a gramática, pontuação e clareza do texto, mantendo o sentido exato.",
                "Para cada tópico, retorne um objeto com text (versão revisada) e source (trecho literal e contínuo que comprova o conteúdo).",
                "Não crie, infira, corrija ou acrescente fatos clínicos. Preserve rigorosamente nomes próprios, diagnósticos, negações, medicamentos, doses, números e medidas como foram falados.",
                "Nunca transforme hipótese em diagnóstico confirmado. Se o trecho estiver incerto, preserve a incerteza na versão revisada.",
                "Se não houver trecho de origem explícito para um tópico, retorne text e source vazios.",
                "Peso, altura e perímetro cefálico só podem ser preenchidos se forem explicitamente mencionados.",
                "Não inclua markdown.",
                "Transcrição:",
                transcript,
              ].join("\n\n"),
            }],
          }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties,
              required: NOTE_KEYS,
            },
          },
        }),
      }
    );

    const data = (await response.json().catch(() => null)) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      const providerMessage = data?.error?.message || "";
      console.error("Gemini transcript organization failed", providerMessage || response.status);
      if (response.status === 429 || /quota|rate limit|resource exhausted/i.test(providerMessage)) {
        return res.status(200).json({
          transcript,
          notes: emptyNotes(),
          verificationWarning: "A cota gratuita da IA foi atingida. A transcrição está preservada; preencha os tópicos manualmente.",
        });
      }
      return res.status(200).json({
        transcript,
        notes: emptyNotes(),
        verificationWarning: "A IA não conseguiu organizar os tópicos. A transcrição está preservada; preencha-os manualmente.",
      });
    }

    type CandidateNote = { text?: unknown; source?: unknown };
    let candidateNotes: Partial<Record<keyof ConsultationNotes, CandidateNote>>;
    try {
      candidateNotes = JSON.parse(readCandidateText(data || {}));
    } catch {
      return res.status(200).json({
        transcript,
        notes: emptyNotes(),
        verificationWarning: "A IA retornou um formato inválido. A transcrição está preservada; preencha os tópicos manualmente.",
      });
    }

    const source = normalizeForSourceMatch(transcript);
    const rejectedFields: Array<keyof ConsultationNotes> = [];
    const evidence: Partial<Record<keyof ConsultationNotes, string>> = {};
    const notes = Object.fromEntries(NOTE_KEYS.map((key) => {
      const field = candidateNotes[key];
      const candidate = typeof field?.text === "string" ? field.text.trim().slice(0, 5_000) : "";
      const sourceQuote = typeof field?.source === "string" ? field.source.trim().slice(0, 5_000) : "";
      const normalizedQuote = normalizeForSourceMatch(sourceQuote);
      if (!candidate && !sourceQuote) return [key, ""];
      if (
        !candidate ||
        !normalizedQuote ||
        !source.includes(normalizedQuote) ||
        JSON.stringify(readNumberTokens(candidate)) !== JSON.stringify(readNumberTokens(sourceQuote))
      ) {
        rejectedFields.push(key);
        return [key, ""];
      }
      evidence[key] = sourceQuote;
      return [key, candidate];
    })) as ConsultationNotes;

    return res.status(200).json({
      transcript,
      notes,
      evidence,
      rejectedFields,
      verificationWarning: rejectedFields.length
        ? "Os textos foram revisados pela IA; os campos sem trecho de origem ou com números incompatíveis foram deixados vazios. Compare as fontes com a transcrição e o áudio antes de salvar."
        : "Os textos foram revisados pela IA e acompanhados dos trechos originais. Confirme nomes, medicamentos, doses, negações e sentido ouvindo o áudio antes de salvar.",
    });
  } catch (error) {
    console.error("Transcript organization request failed", error instanceof Error ? error.message : "unknown error");
    return res.status(502).json({
      transcript,
      notes: emptyNotes(),
      verificationWarning: "Falha de conexão com a IA. A transcrição está preservada; preencha os tópicos manualmente.",
    });
  }
}
