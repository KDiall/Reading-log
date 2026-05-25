import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM ?? "BookLog <noreply@booklog.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your BookLog email",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="margin-bottom:8px">Verify your email</h2>
        <p style="color:#666;margin-bottom:24px">Click the button below to verify your BookLog account.</p>
        <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
          Verify email
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Link expires in 24 hours. If you didn't sign up, ignore this.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your BookLog password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="margin-bottom:8px">Reset your password</h2>
        <p style="color:#666;margin-bottom:24px">Click the button below to choose a new password.</p>
        <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
          Reset password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
