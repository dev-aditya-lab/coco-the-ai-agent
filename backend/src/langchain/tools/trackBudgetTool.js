import { BaseTool } from "./baseTool.js";
import { BudgetEntry } from "../../models/BudgetEntry.js";

export class TrackBudgetTool extends BaseTool {
  constructor() {
    super(
      "track_budget",
      "Track income and expenses with category and notes.",
      {
        type: "object",
        properties: {
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number" },
          category: { type: "string" },
          note: { type: "string" },
          style: { type: "string", enum: ["bilingual", "english"] },
        },
        required: ["type", "amount", "category"],
      }
    );
  }

  async execute(input) {
    const type = this.normalizeString(input.type).toLowerCase() === "income" ? "income" : "expense";
    const amount = Number(input.amount);
    const category = this.normalizeString(input.category);
    const note = this.normalizeString(input.note);
    const style = input.style || "english";

    if (!Number.isFinite(amount) || amount <= 0 || !category) {
      return this.formatByStyle(style, "Budget entry details invalid hain.", "Budget entry details are invalid.");
    }

    const saved = await BudgetEntry.create({ type, amount, category, note });

    const [incomeAgg, expenseAgg] = await Promise.all([
      BudgetEntry.aggregate([{ $match: { type: "income" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      BudgetEntry.aggregate([{ $match: { type: "expense" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const incomeTotal = Number(incomeAgg?.[0]?.total || 0);
    const expenseTotal = Number(expenseAgg?.[0]?.total || 0);

    return {
      message: this.formatByStyle(
        style,
        `Budget updated: ${type} ${amount} (${category})`,
        `Budget updated: ${type} ${amount} (${category})`
      ),
      type: "budget",
      entryId: String(saved._id),
      entryType: type,
      amount,
      category,
      totals: {
        income: Number(incomeTotal.toFixed(2)),
        expense: Number(expenseTotal.toFixed(2)),
        net: Number((incomeTotal - expenseTotal).toFixed(2)),
      },
    };
  }
}
