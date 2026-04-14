import mongoose from "mongoose";
import { env } from "./env.js";

let hasConnectedOnce = false;

export async function connectToDatabase() {
  if (!env.mongodbUri) {
    console.warn("[db] MONGODB_URI not set. Command history is disabled.");
    return;
  }

  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });

    hasConnectedOnce = true;
    console.info("[db] MongoDB connected.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown MongoDB connection error.";
    console.error("[db] MongoDB connection failed.", { error: message });
  }
}

mongoose.connection.on("error", (error) => {
  const message = error instanceof Error ? error.message : "Unknown MongoDB runtime error.";
  console.error("[db] MongoDB runtime error.", { error: message });
});

mongoose.connection.on("disconnected", () => {
  if (hasConnectedOnce) {
    console.warn("[db] MongoDB disconnected.");
  }
});