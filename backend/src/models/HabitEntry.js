import mongoose from "mongoose";

const habitEntrySchema = new mongoose.Schema(
  {
    habit: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["done", "skipped"],
      required: true,
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

export const HabitEntry = mongoose.models.HabitEntry || mongoose.model("HabitEntry", habitEntrySchema);
