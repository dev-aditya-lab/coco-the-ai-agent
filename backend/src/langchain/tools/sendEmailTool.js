import { BaseTool } from "./baseTool.js";
import { buildStyledEmailHtml, sendMail } from "../../services/mail/ResendMail.service.js";
import { retainMemory } from "../services/hindsightService.js";

export class SendEmailTool extends BaseTool {
  constructor() {
    super(
      "send_email",
      "Draft or send an email to a recipient.",
      {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body text" },
          mode: { type: "string", enum: ["draft", "send"], description: "draft or send" },
          style: { type: "string", enum: ["bilingual", "english"] },
        },
        required: ["to", "subject", "body"],
      }
    );
  }

  async execute(input) {
    const to = this.normalizeString(input.to);
    const subject = this.normalizeString(input.subject);
    const body = this.normalizeString(input.body);
    const mode = this.normalizeString(input.mode || "draft").toLowerCase() === "send" ? "send" : "draft";
    const style = input.style || "english";

    if (!to || !subject || !body) {
      return this.formatByStyle(style, "Email details incomplete hain.", "Email details are incomplete.");
    }

    if (mode === "draft") {
      await retainMemory(`Email draft prepared for ${to}. Subject: ${subject}.`, {
        context: "email",
        metadata: { mode, to, subject },
        tags: ["email", "draft"],
      });

      return {
        message: this.formatByStyle(
          style,
          `Draft ready hai for ${to}. Subject: ${subject}`,
          `Draft is ready for ${to}. Subject: ${subject}`
        ),
        type: "email",
        mode,
        to,
        subject,
      };
    }

    try {
      const html = buildStyledEmailHtml({
        subject,
        body,
      });

      const sendResult = await sendMail({
        to,
        subject,
        html,
      });

      await retainMemory(`Email sent to ${to}. Subject: ${subject}.`, {
        context: "email",
        metadata: { mode, to, subject, emailId: sendResult?.id || "" },
        tags: ["email", "sent"],
      });

      return {
        message: this.formatByStyle(style, `Email ${to} ko bhej diya.`, `Email sent to ${to}.`),
        type: "email",
        mode,
        to,
        subject,
        emailId: sendResult?.id || "",
      };
    } catch (error) {
      return this.formatByStyle(style, `Email send nahi hua: ${error.message}`, `Failed to send email: ${error.message}`);
    }
  }
}
