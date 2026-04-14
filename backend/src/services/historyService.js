import { Command } from "../models/Command.js";

function clampLimit(value) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return 10;
  }

  return Math.min(10, Math.max(5, Math.floor(number)));
}

export async function saveCommandHistory(record) {
  const doc = new Command(record);
  await doc.save();
}

export async function getRecentCommands(limit = 10) {
  const safeLimit = clampLimit(limit);

  return Command.find({})
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
}