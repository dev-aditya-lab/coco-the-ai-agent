import { buildCommandResponse } from "../services/command-service.js";

export async function postCommand(req, res, next) {
  try {
    const command = typeof req.body?.command === "string" ? req.body.command.trim() : "";

    if (!command) {
      return res.status(400).json({ error: "command is required." });
    }

    const response = await buildCommandResponse(command);

    return res.status(200).json({ success: true, ...response });
  } catch (error) {
    return next(error);
  }
}