import nodemailer from "nodemailer";

export function createTransporter() {
  const service = (process.env.SMTP_SERVICE || "").toLowerCase(); // gmail | ""
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("Faltan SMTP_USER/SMTP_PASS en .env");
  }

  // ✅ Modo Gmail (recomendado si usarás una cuenta Gmail/Google Workspace)
  if (service === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }, // pass = APP PASSWORD
    });
  }

  // ✅ Modo SMTP genérico (por si luego usas Brevo/SendGrid/SMTP2GO/etc.)
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";

  if (!host) {
    throw new Error("Faltan variables SMTP_* (SMTP_HOST/SMTP_PORT/SMTP_SECURE) o define SMTP_SERVICE=gmail");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendResetEmail({ to, resetUrl }) {
  const transporter = createTransporter();

  const fromName = process.env.MAIL_FROM_NAME || "Gestor Hospitalario";
  const from = `${fromName} <${process.env.SMTP_USER}>`;

  const subject = "Recuperar acceso - Restablecer contraseña";
  const text =
    `Recibimos una solicitud para restablecer tu contraseña.\n\n` +
    `Abre este enlace para crear una nueva contraseña (válido por 15 minutos):\n` +
    `${resetUrl}\n\n` +
    `Si tú no solicitaste esto, ignora este correo.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4">
      <h2>Recuperar acceso</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 14px;border-radius:10px;
           background:#0a6b46;color:#fff;text-decoration:none">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#555">
        Este enlace expira en <b>15 minutos</b>. Si tú no lo solicitaste, ignora este correo.
      </p>
      <hr/>
      <p style="font-size:12px;color:#777">IMSS • Uso interno</p>
    </div>
  `;

  await transporter.sendMail({ from, to, subject, text, html });
}