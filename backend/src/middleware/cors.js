import { env } from "../config/env.js";

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  return env.corsOrigin.split(",").map((value) => value.trim()).includes(origin);
}

export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
}