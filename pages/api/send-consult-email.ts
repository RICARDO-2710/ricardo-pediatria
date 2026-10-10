import type { NextApiRequest, NextApiResponse } from "next";

type SendEmailBody = {
  toEmail?: string;
  childName?: string;
  pdfUrl?: string;
  doctorName?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { toEmail, childName, pdfUrl, doctorName } = (req.body || {}) as SendEmailBody;

  const normalizedEmail = String(toEmail || "").trim().toLowerCase();
  const normalizedChildName = String(childName || "").trim();
  const normalizedPdfUrl = String(pdfUrl || "").trim();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: "E-mail de destino inválido." });
  }

  if (!normalizedChildName) {
    return res.status(400).json({ error: "Nome da criança é obrigatório." });
  }

  if (!normalizedPdfUrl) {
    return res.status(400).json({ error: "URL do PDF não informada." });
  }

  try {
    new URL(normalizedPdfUrl);
  } catch {
    return res.status(400).json({ error: "URL do PDF inválida." });
  }

  const brevoApiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = String(process.env.BREVO_SENDER_EMAIL || "").trim();
  const senderName = String(process.env.BREVO_SENDER_NAME || "Rbg Pediatria").trim();

  if (!brevoApiKey) {
    return res.status(500).json({
      error: "BREVO_API_KEY não configurada. Adicione a chave API do Brevo ao arquivo .env.local.",
    });
  }

  if (!isValidEmail(senderEmail)) {
    return res.status(500).json({
      error: "BREVO_SENDER_EMAIL inválido. Configure o e-mail remetente verificado no Brevo.",
    });
  }

  const subject = `Consulta pediátrica - ${normalizedChildName}`;
  const signature = doctorName?.trim() || senderName;

  const text = [
    "Olá!",
    "",
    `Segue o PDF da consulta de ${normalizedChildName}:`,
    normalizedPdfUrl,
    "",
    `Atenciosamente,`,
    signature,
  ].join("\n");

  const safeChildName = escapeHtml(normalizedChildName);
  const safePdfUrl = escapeHtml(normalizedPdfUrl);
  const safeSignature = escapeHtml(signature);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <p>Olá!</p>
      <p>Segue o PDF da consulta de <strong>${safeChildName}</strong>:</p>
      <p><a href="${safePdfUrl}" target="_blank" rel="noopener noreferrer">Abrir PDF da consulta</a></p>
      <p>Atenciosamente,<br/>${safeSignature}</p>
    </div>
  `;

  const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: normalizedEmail }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!brevoResponse.ok) {
    const details = await brevoResponse.text();

    if (/sender|verified|verification/i.test(details)) {
      return res.status(502).json({
        error:
          "O Brevo não aceitou o remetente. Confirme o endereço em Transactional > Settings > Senders dentro da conta Brevo.",
      });
    }

    if (/unauthorized|unrecognised ip|authorized ip|authorised ip/i.test(details)) {
      return res.status(403).json({
        error:
          "O Brevo bloqueou a chamada porque o IP atual não está autorizado. Adicione o IP público do servidor em Brevo > Settings > Security > Authorized IPs e tente novamente.",
      });
    }

    return res.status(502).json({ error: `Falha ao enviar e-mail pelo Brevo: ${details}` });
  }

  return res.status(200).json({ ok: true });
}
