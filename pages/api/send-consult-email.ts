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

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (!resendApiKey) {
    return res.status(500).json({
      error:
        "RESEND_API_KEY não configurada. Configure RESEND_API_KEY e EMAIL_FROM no ambiente para enviar e-mail automaticamente.",
    });
  }

  const subject = `Consulta pediátrica - ${normalizedChildName}`;
  const senderName = doctorName?.trim() || "Equipe Pediatria";

  const text = [
    "Olá!",
    "",
    `Segue o PDF da consulta de ${normalizedChildName}:`,
    normalizedPdfUrl,
    "",
    `Atenciosamente,`,
    senderName,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <p>Olá!</p>
      <p>Segue o PDF da consulta de <strong>${normalizedChildName}</strong>:</p>
      <p><a href="${normalizedPdfUrl}" target="_blank" rel="noopener noreferrer">Abrir PDF da consulta</a></p>
      <p>Atenciosamente,<br/>${senderName}</p>
    </div>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [normalizedEmail],
      subject,
      text,
      html,
    }),
  });

  if (!resendResponse.ok) {
    const details = await resendResponse.text();
    return res.status(502).json({ error: `Falha ao enviar e-mail: ${details}` });
  }

  return res.status(200).json({ ok: true });
}
