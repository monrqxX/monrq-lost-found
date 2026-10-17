import { DurableObject } from "cloudflare:workers";
import { handleAsNodeRequest } from "cloudflare:node";
import { createServer } from "node:http";
import { createApiApp } from "./app.js";

const API_PORT = 8787;

export class MongoApi extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.ready = undefined;
  }

  async initialize() {
    const { app, client } = await createApiApp(this.env);
    this.client = client;
    this.server = createServer(app);
    this.server.listen(API_PORT);
  }

  async fetch(request) {
    if (!this.ready) {
      this.ready = this.initialize().catch(error => {
        this.ready = undefined;
        console.error(JSON.stringify({
          event: "api_initialization_failed",
          errorName: typeof error?.name === "string" ? error.name.slice(0, 50) : "Error",
          ...(typeof error?.code === "string" || typeof error?.code === "number" ? { errorCode: String(error.code).slice(0, 50) } : {})
        }));
        throw error;
      });
    }

    try {
      await this.ready;
      return await handleAsNodeRequest(API_PORT, request);
    } catch {
      return Response.json({ error: "API is temporarily unavailable" }, { status: 503 });
    }
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      const id = env.MONGO_API.idFromName("monrq-api");
      return env.MONGO_API.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
