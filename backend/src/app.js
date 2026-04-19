import express from "express";
import cors from "cors";
import commandRouter from "./routes/command-routes.js";
import historyRouter from "./routes/history-routes.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";

const app = express();



app.use(corsMiddleware);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/command", commandRouter);
app.use("/api/history", historyRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;