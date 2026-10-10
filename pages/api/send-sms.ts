import type { NextApiRequest, NextApiResponse } from "next";
import { normalizePhoneForSms } from "../../lib/sms.js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const { toPhone, message } = (req.body || {}) as {
    toPhone?: string;
    message?: string;
  };

  const phone = String(toPhone || "").trim();
  const bodyText = String(message || "").trim();

  if (!phone) {
    return res.status(400).json({ error: "Telefone do destinatário é obrigatório." });
  }

  if (!bodyText) {
    return res.status(400).json({ error: "Mensagem do SMS é obrigatória." });
  }

  const normalizedPhone = normalizePhoneForSms(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ error: "Telefone inválido para envio de SMS." });
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    return res.status(500).json({
      error:
        "BREVO_API_KEY não configurada. Configure a chave do Brevo para enviar SMS automaticamente.",
    });
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: String(process.env.BREVO_SENDER_NAME || "Pediatria").trim() || "Pediatria",
        recipient: normalizedPhone,
        content: bodyText,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(502).json({
        error: "Falha ao enviar SMS via Brevo.",
        details: responseText,
      });
    }

    return res.status(200).json({ ok: true, data: JSON.parse(responseText || "{}") });
  } catch (error: any) {
    return res.status(500).json({
      error: "Erro inesperado ao enviar SMS.",
      details: error?.message || "desconhecido",
    });
  }
}
