import "dotenv/config";
import app from "./app.js";
import { connectToDatabase } from "./config/db.js";

connectToDatabase();

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
});