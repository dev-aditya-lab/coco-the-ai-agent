import { Resend } from "resend";
import { env } from "../../config/env.js";

const resend = new Resend(env.resendApiKey);

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