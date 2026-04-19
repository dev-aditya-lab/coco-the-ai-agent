import { Resend } from "resend";
import { env } from "../../config/env.js";

const resend = new Resend(env.resendApiKey);

function escapeHtml(value = "") {
        return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");
}

function bodyToHtml(content = "") {
        const safe = escapeHtml(content).trim();
        if (!safe) {
                return "<p style=\"margin:0 0 14px;font-size:15px;line-height:1.7;color:#1f2937;\">No message content provided.</p>";
        }

        return safe
                .split(/\n\s*\n/)
                .map((block) => block.trim())
                .filter(Boolean)
                .map((block) => `<p style=\"margin:0 0 14px;font-size:15px;line-height:1.7;color:#1f2937;\">${block.replace(/\n/g, "<br/>")}</p>`)
                .join("");
}

export function buildStyledEmailHtml({ subject = "", body = "" }) {
        const safeSubject = escapeHtml(subject || "Update");
        const contentHtml = bodyToHtml(body);

        return `
<!doctype html>
<html>
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeSubject}</title>
    </head>
    <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <tr>
                <td style="padding:18px 22px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc;">
                    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">COCO Assistant</div>
                    <div style="margin-top:6px;font-size:20px;line-height:1.3;font-weight:700;">${safeSubject}</div>
                </td>
            </tr>
            <tr>
                <td style="padding:24px 22px 10px;">
                    ${contentHtml}
                </td>
            </tr>
            <tr>
                <td style="padding:16px 22px 22px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
                    Sent via COCO automation
                </td>
            </tr>
        </table>
    </body>
</html>`.trim();
}

export async function sendMail({ to, subject = "Mail from COCO - The AI agent", html }) {
    if (!env.resendApiKey || !env.resendMail) {
        throw new Error("RESEND_API_KEY or RESEND_MAIL is not configured.");
    }

    const { data, error } = await resend.emails.send({
        from: env.resendMail,
        to,
        subject,
        html,
    });

    if (error) {
        throw new Error(error.message || "Resend email failed.");
    }

    return data;
}