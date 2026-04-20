import { BaseTool } from "./baseTool.js";
import { TodoEntry } from "../../models/TodoEntry.js";

export class TrackTodoTool extends BaseTool {
  constructor() {
    super(
      "track_todo",
      "Manage todo tasks: add, list, complete, or remove tasks.",
      {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["add", "list", "complete", "remove"] },
          title: { type: "string" },
          id: { type: "string" },
          note: { type: "string" },
          limit: { type: "number" },
          style: { type: "string", enum: ["bilingual", "english"] },
        },
        required: ["operation"],
      }
    );
  }

  async buildStats() {
    const [pendingCount, doneCount, recent] = await Promise.all([
      TodoEntry.countDocuments({ status: "pending" }),
      TodoEntry.countDocuments({ status: "done" }),
      TodoEntry.find({}).sort({ updatedAt: -1 }).limit(6).lean(),
    ]);

    return {
      pending: pendingCount,
      done: doneCount,
      total: pendingCount + doneCount,
      recent: recent.map((item) => ({
        id: String(item._id),
        title: item.title,
        note: item.note || "",
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  normalizeWords(value) {
    const text = this.normalizeString(value).toLowerCase();
    if (!text) {
      return [];
    }

    return text
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => !["a", "an", "the", "to", "from", "in", "on", "at", "for", "of", "and", "or", "this", "that", "it", "my", "me", "so", "todo", "task", "tasks"].includes(word));
  }

  isAmbiguousReference(title) {
    const words = this.normalizeWords(title);
    return words.length < 2;
  }

  async resolveTodoTarget(input, operation) {
    const id = this.normalizeString(input.id);
    const title = this.normalizeString(input.title);
    const prefersLatestPending = Boolean(input.prefersLatestPending);

    if (id) {
      const byId = await TodoEntry.findById(id).lean();
      if (byId) {
        return byId;
      }
    }

    if (title) {
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const exactMatch = await TodoEntry.findOne({
        title: { $regex: new RegExp(`^${escaped}$`, "i") },
        ...(operation === "complete" ? { status: "pending" } : {}),
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (exactMatch) {
        return exactMatch;
      }

      const titleWords = this.normalizeWords(title);
      if (titleWords.length > 0) {
        const candidates = await TodoEntry.find(operation === "complete" ? { status: "pending" } : {})
          .sort({ updatedAt: -1 })
          .limit(12)
          .lean();

        let bestMatch = null;
        let bestScore = 0;

        for (const candidate of candidates) {
          const candidateWords = this.normalizeWords(candidate.title);
          const overlap = titleWords.filter((word) => candidateWords.includes(word)).length;
          const score = overlap / Math.max(titleWords.length, candidateWords.length || 1);

          if (score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
          }
        }

        if (bestMatch && bestScore >= 0.34) {
          return bestMatch;
        }
      }
    }

    if (operation === "complete" || prefersLatestPending || this.isAmbiguousReference(title)) {
      const query = operation === "complete" ? { status: "pending" } : {};
      return TodoEntry.find(query).sort({ updatedAt: -1 }).lean().then((items) => items[0] || null);
    }

    return null;
  }

  async execute(input) {
    const operation = this.normalizeString(input.operation).toLowerCase() || "list";
    const title = this.normalizeString(input.title);
    const id = this.normalizeString(input.id);
    const note = this.normalizeString(input.note);
    const style = input.style || "english";
    const limit = Math.min(12, Math.max(1, Number(input.limit) || 6));
    const prefersLatestPending = Boolean(input.prefersLatestPending);

    if (operation === "add") {
      if (!title) {
        return this.formatByStyle(style, "Task ka title chahiye.", "Task title is required.");
      }

      const saved = await TodoEntry.create({ title, note, status: "pending" });
      const stats = await this.buildStats();

      return {
        message: this.formatByStyle(style, `Task added: ${title}`, `Task added: ${title}`),
        type: "todo",
        operation,
        task: {
          id: String(saved._id),
          title: saved.title,
          note: saved.note,
          status: saved.status,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        stats,
      };
    }

    if (operation === "complete") {
      const target = await this.resolveTodoTarget({ ...input, prefersLatestPending }, operation);
      const updated = target
        ? await TodoEntry.findByIdAndUpdate(target._id, { status: "done" }, { new: true }).lean()
        : null;

      if (!updated) {
        return this.formatByStyle(style, "Complete karne ke liye valid task do.", "Provide a valid task to complete.");
      }

      const stats = await this.buildStats();
      return {
        message: this.formatByStyle(style, `Task completed: ${updated.title}`, `Task completed: ${updated.title}`),
        type: "todo",
        operation,
        task: {
          id: String(updated._id),
          title: updated.title,
          note: updated.note || "",
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
        stats,
      };
    }

    if (operation === "remove") {
      const target = await this.resolveTodoTarget({ ...input, prefersLatestPending }, operation);
      const removed = target ? await TodoEntry.findByIdAndDelete(target._id).lean() : null;

      if (!removed) {
        return this.formatByStyle(style, "Delete ke liye valid task do.", "Provide a valid task to remove.");
      }

      const stats = await this.buildStats();
      return {
        message: this.formatByStyle(style, `Task removed: ${removed.title}`, `Task removed: ${removed.title}`),
        type: "todo",
        operation,
        task: {
          id: String(removed._id),
          title: removed.title,
          note: removed.note || "",
          status: removed.status,
          createdAt: removed.createdAt,
          updatedAt: removed.updatedAt,
        },
        stats,
      };
    }

    const items = await TodoEntry.find({}).sort({ updatedAt: -1 }).limit(limit).lean();
    const stats = await this.buildStats();

    return {
      message: items.length > 0
        ? this.formatByStyle(style, `Aapke paas ${stats.pending} pending tasks hain.`, `You have ${stats.pending} pending tasks.`)
        : this.formatByStyle(style, "Abhi koi tasks nahi hain.", "No tasks yet."),
      type: "todo",
      operation: "list",
      tasks: items.map((item) => ({
        id: String(item._id),
        title: item.title,
        note: item.note || "",
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      stats,
    };
  }
}