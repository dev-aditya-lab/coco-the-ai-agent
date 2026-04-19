import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject = "Mail from COCO - The AI agent", html }) {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_MAIL) {
        throw new Error("RESEND_API_KEY or RESEND_MAIL is not configured.");
    }

    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_MAIL,
        to,
        subject,
        html,
    });

    if (error) {
        throw new Error(error.message || "Resend email failed.");
    }

    return data;
}