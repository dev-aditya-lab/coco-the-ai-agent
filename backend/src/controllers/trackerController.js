import { BudgetEntry } from "../models/BudgetEntry.js";
import { HabitEntry } from "../models/HabitEntry.js";
import { Reminder } from "../models/Reminder.js";
import { TodoEntry } from "../models/TodoEntry.js";

export async function getTrackerSummary(req, res) {
  try {
    const [reminders, recentBudget, recentHabits, recentTodos, pendingTodos, doneTodos] = await Promise.all([
      Reminder.find({ status: "pending", dueAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } })
        .sort({ dueAt: 1 })
        .limit(6)
        .lean(),
      BudgetEntry.find({})
        .sort({ occurredAt: -1 })
        .limit(20)
        .lean(),
      HabitEntry.find({})
        .sort({ occurredAt: -1 })
        .limit(20)
        .lean(),
      TodoEntry.find({})
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      TodoEntry.countDocuments({ status: "pending" }),
      TodoEntry.countDocuments({ status: "done" }),
    ]);

    const totals = recentBudget.reduce(
      (accumulator, entry) => {
        const amount = Number(entry?.amount || 0);
        if (entry?.type === "income") {
          accumulator.income += amount;
        } else {
          accumulator.expense += amount;
        }
        return accumulator;
      },
      { income: 0, expense: 0 }
    );

    const habitStats = recentHabits.reduce(
      (accumulator, entry) => {
        if (entry?.status === "done") {
          accumulator.done += 1;
        } else {
          accumulator.skipped += 1;
        }
        return accumulator;
      },
      { done: 0, skipped: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        reminders: reminders.map((item) => ({
          id: String(item._id),
          title: item.title,
          dueAt: item.dueAt,
          notes: item.notes,
          status: item.status,
        })),
        budget: {
          income: Number(totals.income.toFixed(2)),
          expense: Number(totals.expense.toFixed(2)),
          net: Number((totals.income - totals.expense).toFixed(2)),
          recent: recentBudget.slice(0, 6).map((item) => ({
            id: String(item._id),
            type: item.type,
            amount: item.amount,
            category: item.category,
            note: item.note,
            occurredAt: item.occurredAt,
          })),
        },
        habits: {
          done: habitStats.done,
          skipped: habitStats.skipped,
          recent: recentHabits.slice(0, 6).map((item) => ({
            id: String(item._id),
            habit: item.habit,
            status: item.status,
            note: item.note,
            occurredAt: item.occurredAt,
          })),
        },
        todos: {
          pending: pendingTodos,
          done: doneTodos,
          total: pendingTodos + doneTodos,
          recent: recentTodos.slice(0, 6).map((item) => ({
            id: String(item._id),
            title: item.title,
            note: item.note,
            status: item.status,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[tracker] summary_failed", error);
    return res.status(200).json({
      success: true,
      data: {
        reminders: [],
        budget: { income: 0, expense: 0, net: 0, recent: [] },
        habits: { done: 0, skipped: 0, recent: [] },
        todos: { pending: 0, done: 0, total: 0, recent: [] },
      },
      timestamp: new Date().toISOString(),
    });
  }
}
