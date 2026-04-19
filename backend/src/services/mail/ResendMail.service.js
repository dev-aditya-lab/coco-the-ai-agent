import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject= "Mail form COCO - The ai agent", html }) {
    const { data, error } = await resend.emails.send({
        from: process.env.RESEND_MAIL,
        to,
        subject,
        html
    });

    if (error) {
        return console.error({ error });
    }

    console.log({ data });
};