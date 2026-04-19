import mongoose from "mongoose";

const budgetEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["expense", "income"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

export const BudgetEntry = mongoose.models.BudgetEntry || mongoose.model("BudgetEntry", budgetEntrySchema);
