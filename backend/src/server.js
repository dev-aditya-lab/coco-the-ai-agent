import app from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";

connectToDatabase();

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
});