import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

type ValidationPayload = {
  v: 1;
  kind: string;
  doctorEmail: string;
  childId: string;
  childName: string;
  issueDate: string;
  title: string;
  content?: string;
  primaryMedicine?: string;
  documentHash: string;
  issuedAt: number;
  expiresAt: number;
};

type CodeRegistryEntry = {
  token: string;
  expiresAt: number;
  payload?: ValidationPayload;
};

function getCodeRegistry() {
  const globalRef = globalThis as any;
  if (!globalRef.__rbgpPrescriptionCodeRegistry) {
    globalRef.__rbgpPrescriptionCodeRegistry = new Map<string, CodeRegistryEntry>();
  }
  return globalRef.__rbgpPrescriptionCodeRegistry as Map<string, CodeRegistryEntry>;
}

function lookupCodeEntry(code: string) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return null;

  const registry = getCodeRegistry();
  const now = Date.now();

  for (const [key, value] of registry.entries()) {
    if (Number(value?.expiresAt || 0) <= now) {
      registry.delete(key);
    }
  }

  return registry.get(normalizedCode) || null;
}

function base64UrlToBuffer(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const withPadding = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return Buffer.from(withPadding, "base64");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function verifyToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false as const, reason: "Token inválido." };

  const [encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { ok: false as const, reason: "Assinatura inválida." };
  }

  let payload: ValidationPayload;
  try {
    payload = JSON.parse(base64UrlToBuffer(encodedPayload).toString("utf8")) as ValidationPayload;
  } catch {
    return { ok: false as const, reason: "Payload inválido." };
  }

  if (!payload || payload.v !== 1) {
    return { ok: false as const, reason: "Versão de validação não suportada." };
  }

  if (Date.now() > Number(payload.expiresAt || 0)) {
    return { ok: false as const, reason: "Validação expirada." };
  }

  return { ok: true as const, payload };
}

function renderHtml(valid: boolean, title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="font-family: Arial, sans-serif; background:#f8fafc; color:#0f172a; margin:0; padding:24px;">
    <div style="max-width:720px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
      <h1 style="margin:0 0 12px 0; font-size:20px; color:${valid ? "#166534" : "#991b1b"};">${escapeHtml(title)}</h1>
      <div style="line-height:1.55; white-space:pre-wrap;">${escapeHtml(body)}</div>
    </div>
  </body>
</html>`;
}

function renderSuccessHtml(payload: ValidationPayload, ifoodUrl: string | null) {
  const contentText = String(payload.content || "").trim();
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Documento verificado</title>
  </head>
  <body style="font-family: Arial, sans-serif; background:#f8fafc; color:#0f172a; margin:0; padding:24px;">
    <div style="max-width:760px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px;">
      <h1 style="margin:0 0 8px 0; font-size:20px; color:#166534;">Documento verificado com sucesso</h1>
      <div style="font-size:14px; line-height:1.6; margin-bottom:12px;">
        <div><b>Paciente:</b> ${escapeHtml(payload.childName)}</div>
        <div><b>Documento:</b> ${escapeHtml(payload.title)}</div>
        <div><b>Médico:</b> ${escapeHtml(payload.doctorEmail)}</div>
        <div><b>Hash:</b> ${escapeHtml(payload.documentHash)}</div>
      </div>
      ${
        ifoodUrl
          ? `<a href="${escapeHtml(ifoodUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-bottom:14px; background:#16a34a; color:#fff; padding:10px 14px; border-radius:8px; text-decoration:none; font-weight:600;">Comprar no iFood Farmácia</a>`
          : ""
      }
      ${
        contentText
          ? `<h2 style="margin:8px 0; font-size:16px;">Conteúdo do documento</h2>
      <pre style="white-space:pre-wrap; word-break:break-word; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:0;">${escapeHtml(contentText)}</pre>`
          : ""
      }
    </div>
  </body>
</html>`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = String(process.env.PRESCRIPTION_VERIFY_SECRET || "").trim();

  const rawCode = String(req.query.code || "").trim();
  const codeEntry = rawCode ? lookupCodeEntry(rawCode) : null;
  const token = String(req.query.token || codeEntry?.token || "").trim();
  if (!token && !codeEntry?.payload) {
    const reason = rawCode
      ? "Código digital não encontrado. Gere novamente o receituário para obter um código válido."
      : "Token não informado.";

    if (String(req.query.format || "").toLowerCase() === "json") {
      return res.status(400).json({ valid: false, reason });
    }

    return res.status(400).send(renderHtml(false, "Validação de receita", reason));
  }

  const wantsJson = String(req.query.format || "").toLowerCase() === "json";
  let payload: ValidationPayload | null = null;

  if (codeEntry?.payload && Date.now() <= Number(codeEntry.payload.expiresAt || 0)) {
    payload = codeEntry.payload;
  } else if (token && secret) {
    const result = verifyToken(token, secret);
    if (!result.ok) {
      if (wantsJson) {
        return res.status(400).json({ valid: false, reason: result.reason });
      }
      return res.status(400).send(renderHtml(false, "Receita não verificada", result.reason));
    }
    payload = result.payload;
  }

  if (!payload) {
    const reason = rawCode
      ? "Código digital expirado ou inválido. Gere um novo documento para validar novamente."
      : "Não foi possível validar o token sem chave de verificação no servidor.";
    if (wantsJson) {
      return res.status(400).json({ valid: false, reason });
    }
    return res.status(400).send(renderHtml(false, "Receita não verificada", reason));
  }
  const primaryMedicine = String(payload.primaryMedicine || "").trim();
  const ifoodUrl = primaryMedicine
    ? `https://www.ifood.com.br/busca?q=${encodeURIComponent(`${primaryMedicine} farmácia`)}`
    : null;
  if (wantsJson) {
    return res.status(200).json({
      valid: true,
      payload,
      lookupCode: rawCode || null,
      primaryMedicine: primaryMedicine || null,
      content: payload.content || null,
      ifoodUrl,
    });
  }

  return res.status(200).send(renderSuccessHtml(payload, ifoodUrl));
}
