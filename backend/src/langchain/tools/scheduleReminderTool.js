import { BaseTool } from "./baseTool.js";
import { Reminder } from "../../models/Reminder.js";
import { retainMemory } from "../services/hindsightService.js";

export class ScheduleReminderTool extends BaseTool {
  constructor() {
    super(
      "schedule_reminder",
      "Create a reminder with title, datetime, and optional notes.",
      {
        type: "object",
        properties: {
          title: { type: "string" },
          datetime: { type: "string", description: "ISO datetime or natural date string" },
          notes: { type: "string" },
          style: { type: "string", enum: ["bilingual", "english"] },
        },
        required: ["title", "datetime"],
      }
    );
  }

  async execute(input) {
    const title = this.normalizeString(input.title);
    const datetime = this.normalizeString(input.datetime);
    const notes = this.normalizeString(input.notes);
    const style = input.style || "english";

    if (!title || !datetime) {
      return this.formatByStyle(style, "Reminder ke liye title aur time chahiye.", "Reminder needs title and datetime.");
    }

    const parsedDate = new Date(datetime);
    if (Number.isNaN(parsedDate.getTime())) {
      return this.formatByStyle(style, "Datetime valid nahi hai.", "Datetime is invalid.");
    }

    const saved = await Reminder.create({
      title,
      dueAt: parsedDate,
      notes,
      status: "pending",
    });

    await retainMemory(`Reminder set: ${title} at ${parsedDate.toISOString()}`, {
      context: "planning",
      metadata: { reminderId: String(saved._id), title },
      tags: ["reminder"],
    });

    return {
      message: this.formatByStyle(style, `Reminder set: ${title}`, `Reminder set: ${title}`),
      type: "reminder",
      title,
      dueAt: parsedDate.toISOString(),
      notes,
    };
  }
}
