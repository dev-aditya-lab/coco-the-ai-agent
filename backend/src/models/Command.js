import mongoose from "mongoose";

const commandSchema = new mongoose.Schema(
  {
    command: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    parameters: {
      type: Object,
      default: {},
    },
    response: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

export const Command = mongoose.models.Command || mongoose.model("Command", commandSchema);