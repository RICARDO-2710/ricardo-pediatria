import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

type SignBody = {
  kind?: string;
  doctorEmail?: string;
  childId?: string;
  childName?: string;
  issueDate?: string;
  title?: string;
  content?: string;
  primaryMedicine?: string;
};

type SignPayload = {
  v: 1;
  kind: string;
  doctorEmail: string;
  childId: string;
  childName: string;
  issueDate: string;
  title: string;
  content: string;
  primaryMedicine: string;
  documentHash: string;
  issuedAt: number;
  expiresAt: number;
};

type CodeRegistryEntry = {
  token: string;
  expiresAt: number;
  payload?: SignPayload;
};

function getCodeRegistry() {
  const globalRef = globalThis as any;
  if (!globalRef.__rbgpPrescriptionCodeRegistry) {
    globalRef.__rbgpPrescriptionCodeRegistry = new Map<string, CodeRegistryEntry>();
  }
  return globalRef.__rbgpPrescriptionCodeRegistry as Map<string, CodeRegistryEntry>;
}

function persistCodeToken(code: string, token: string, expiresAt: number, payload: SignPayload) {
  const registry = getCodeRegistry();
  const now = Date.now();

  for (const [key, value] of registry.entries()) {
    if (Number(value?.expiresAt || 0) <= now) {
      registry.delete(key);
    }
  }

  registry.set(code, { token, expiresAt, payload });
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\r\n/g, "\n");
}

function extractMainMedicineTerm(text: string) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return "medicamento";

  const firstMeaningful = lines.find((line) => !/^posologia\s*:/i.test(line) && !/^orienta(c|ç)(a|ã)o/i.test(line));
  return firstMeaningful || lines[0] || "medicamento";
}

function buildAppUrl(req: NextApiRequest) {
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(req.headers.host || "localhost:3000");
  return `${proto}://${host}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = String(process.env.PRESCRIPTION_VERIFY_SECRET || "").trim();

  const body = (req.body || {}) as SignBody;
  const kind = normalizeText(body.kind || "prescription");
  const doctorEmail = normalizeText(body.doctorEmail || "").toLowerCase();
  const childId = normalizeText(body.childId || "");
  const childName = normalizeText(body.childName || "");
  const issueDate = normalizeText(body.issueDate || "");
  const title = normalizeText(body.title || "Receituário");
  const content = normalizeText(body.content || "");
  const providedPrimaryMedicine = normalizeText(body.primaryMedicine || "");

  if (!doctorEmail || !childId || !childName || !content) {
    return res.status(400).json({
      error: "Campos obrigatórios: doctorEmail, childId, childName e content.",
    });
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + 1000 * 60 * 60 * 24 * 180;

  const documentHash = crypto
    .createHash("sha256")
    .update(`${title}\n${content}`, "utf8")
    .digest("hex");

  const payload: SignPayload = {
    v: 1,
    kind,
    doctorEmail,
    childId,
    childName,
    issueDate,
    title,
    content,
    primaryMedicine: providedPrimaryMedicine || extractMainMedicineTerm(content),
    documentHash,
    issuedAt,
    expiresAt,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = secret
    ? crypto
        .createHmac("sha256", secret)
        .update(payloadEncoded, "utf8")
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
    : "unsigned";

  const token = `${payloadEncoded}.${signature}`;
  const code = (secret ? signature.slice(0, 12) : crypto.randomBytes(6).toString("hex")).toUpperCase();
  const appUrl = buildAppUrl(req);
  const verificationUrl = `${appUrl}/api/validate-prescription?code=${encodeURIComponent(code)}`;

  persistCodeToken(code, token, expiresAt, payload);

  return res.status(200).json({ token, code, verificationUrl, expiresAt });
}
