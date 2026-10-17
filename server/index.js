import "dotenv/config";
import { createApiApp } from "./app.js";

const { app, client } = await createApiApp(process.env);
const port = Number(process.env.PORT || 8787);
const server = app.listen(port, "0.0.0.0", () => console.log(`MONRQ API listening on port ${port}`));

async function shutdown() {
  server.close();
  await client.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
