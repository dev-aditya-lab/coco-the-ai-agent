import { BaseTool } from "./baseTool.js";
import { HabitEntry } from "../../models/HabitEntry.js";

export class TrackHabitTool extends BaseTool {
  constructor() {
    super(
      "track_habit",
      "Track habit completion or skip status.",
      {
        type: "object",
        properties: {
          habit: { type: "string" },
          status: { type: "string", enum: ["done", "skipped"] },
          note: { type: "string" },
          style: { type: "string", enum: ["bilingual", "english"] },
        },
        required: ["habit", "status"],
      }
    );
  }

  async execute(input) {
    const habit = this.normalizeString(input.habit);
    const status = this.normalizeString(input.status).toLowerCase() === "done" ? "done" : "skipped";
    const note = this.normalizeString(input.note);
    const style = input.style || "english";

    if (!habit) {
      return this.formatByStyle(style, "Habit ka naam chahiye.", "Habit name is required.");
    }

    const saved = await HabitEntry.create({ habit, status, note });

    const recent = await HabitEntry.find({ habit })
      .sort({ occurredAt: -1 })
      .limit(7)
      .lean();

    const streakLike = recent.filter((entry) => entry.status === "done").length;

    return {
      message: this.formatByStyle(
        style,
        `${habit} marked as ${status}. Recent success count: ${streakLike}/7`,
        `${habit} marked as ${status}. Recent success count: ${streakLike}/7`
      ),
      type: "habit",
      entryId: String(saved._id),
      habit,
      status,
      recentSuccessCount: streakLike,
    };
  }
}
