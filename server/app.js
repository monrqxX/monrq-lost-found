import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");

export async function createApiApp(env) {
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "MONGODB_URI", "MONGODB_DB"];
  for (const key of required) if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
  const supabaseUrl = env.SUPABASE_URL.replace(/\/$/, "");
  const supabaseOrigin = new URL(supabaseUrl).origin;
  const supabaseRealtimeOrigin = `wss://${new URL(supabaseUrl).host}`;
  const allowedOrigins = (env.APP_ORIGINS || "http://localhost:5173").split(",").map(x => x.trim()).filter(Boolean);
  const supabaseAuth = createClient(supabaseUrl, env.SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const client = new MongoClient(env.MONGODB_URI, {
  appName: "monrq-lost-found",
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 20_000
  });
  await client.connect();
  const db = client.db(env.MONGODB_DB);
  const collections = {
  items: db.collection("items"), matches: db.collection("matches"), claims: db.collection("claims"),
  conversations: db.collection("conversations"), messages: db.collection("messages"),
  notifications: db.collection("notifications"), profiles: db.collection("profiles"), audit: db.collection("auditLogs")
  };
  await Promise.all([
  collections.items.createIndex({ ownerId: 1, createdAt: -1 }),
  collections.items.createIndex({ visibility: 1, status: 1, type: 1, createdAt: -1 }),
  collections.matches.createIndex({ lostItemId: 1, foundItemId: 1 }, { unique: true }),
  collections.claims.createIndex({ matchId: 1, claimantId: 1 }, { unique: true, partialFilterExpression: { status: "PENDING" } }),
  collections.claims.createIndex({ claimantId: 1, createdAt: -1 }), collections.claims.createIndex({ ownerId: 1, createdAt: -1 }),
  collections.conversations.createIndex({ claimId: 1 }, { unique: true, sparse: true }),
  collections.conversations.createIndex({ participants: 1, updatedAt: -1 }),
  collections.messages.createIndex({ conversationId: 1, createdAt: 1 }),
  collections.notifications.createIndex({ userId: 1, createdAt: -1 })
  ]);

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "connect-src": ["'self'", supabaseOrigin, supabaseRealtimeOrigin],
      },
    },
  }));
  app.use((req, res, next) => cors({
  origin(origin, callback) {
    let sameHostOrigin = false;
    if (origin) {
      try { sameHostOrigin = new URL(origin).host.toLowerCase() === req.get("host")?.toLowerCase(); }
      catch { sameHostOrigin = false; }
    }
    if (!origin || allowedOrigins.includes(origin) || sameHostOrigin) return callback(null, true);
    callback(new Error("Origin not allowed"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Image-Extension"]
  })(req, res, next));
  app.use(express.json({ limit: "64kb", strict: true }));
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));
  const uploadRateLimit = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });
  app.use("/api", (req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("Cache-Control", "no-store");
  next();
  });

  async function authenticate(req, res, next) {
  const token = req.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || typeof user?.id !== "string") return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    const metadata = user.user_metadata || {};
    const displayName = typeof metadata.display_name === "string" ? metadata.display_name : typeof metadata.full_name === "string" ? metadata.full_name : "";
    req.user = { id: user.id, email: typeof user.email === "string" ? user.email : "", displayName };
    req.accessToken = token;
    return next();
  } catch {
    return res.status(503).json({ error: "Authentication service is temporarily unavailable" });
  }
  }
  const requireAuth = [authenticate];
  function optionalAuth(req, res, next) {
  if (!req.get("authorization")) return next();
  return authenticate(req, res, next);
  }
  const idSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record id");
  const objectId = value => new ObjectId(value);
  const asDoc = doc => doc ? {
  id: doc._id.toString(), type: doc.type, title: doc.title, body: doc.body,
  ...(doc.itemId ? { itemId: doc.itemId.toString() } : {}),
  ...(doc.matchId ? { matchId: doc.matchId.toString() } : {}),
  ...(doc.claimId ? { claimId: doc.claimId.toString() } : {}),
  ...(doc.conversationId ? { conversationId: doc.conversationId.toString() } : {}),
  read: Boolean(doc.read), createdAt: doc.createdAt
  } : null;
  const imagePathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;
  const validImagePaths = paths => Array.isArray(paths) && paths.every(path => typeof path === "string" && imagePathPattern.test(path)) && new Set(paths).size === paths.length;
  const publicText = value => String(value || "")
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email hidden]")
  .replace(/(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)/g, "[phone hidden]")
  .replace(/\b(?:home\s+address|address|house\s*(?:no\.?|number)|flat\s*(?:no\.?|number)|apartment|street\s+address|pincode|pin\s+code)\s*[:#-]?\s*[^,;\n]*/gi, "[address hidden]")
  .replace(/\b\d{6}\b/g, "[postal code hidden]");
  const safeItem = (doc, includeOwnerLocation = false) => {
  if (!doc) return null;
  const location = doc.location && typeof doc.location === "object" ? doc.location : {};
  const imagePaths = (Array.isArray(doc.imagePaths) ? doc.imagePaths : []).filter(path => typeof path === "string" && imagePathPattern.test(path));
  const text = value => includeOwnerLocation ? (value || "") : publicText(value);
  return {
    id: doc._id.toString(), type: doc.type, category: text(doc.category), subcategory: text(doc.subcategory),
    title: text(doc.title), description: text(doc.description), brand: text(doc.brand), model: text(doc.model), color: text(doc.color),
    dateOccurred: doc.dateOccurred, location: { city: text(typeof location.city === "string" ? location.city : ""), ...(includeOwnerLocation ? { area: location.area || "", placeName: location.placeName || "" } : {}) },
    possessionStatus: text(doc.possessionStatus), visibility: doc.visibility, status: doc.status,
    imageCount: imagePaths.length, imagePaths, createdAt: doc.createdAt, updatedAt: doc.updatedAt
  };
  };
  const itemInput = z.object({
  type: z.enum(["LOST", "FOUND"]), category: z.string().trim().min(1).max(60),
  subcategory: z.string().trim().max(80).default(""), title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(""), brand: z.string().trim().max(80).default(""),
  model: z.string().trim().max(100).default(""), color: z.string().trim().max(50).default(""),
  dateOccurred: z.coerce.date(), location: z.object({ city: z.string().trim().min(1).max(100), area: z.string().trim().max(100).default(""), placeName: z.string().trim().max(120).default("") }).strict(),
  possessionStatus: z.string().trim().max(80).optional(),
  imagePaths: z.array(z.string().regex(imagePathPattern)).max(4).default([]),
  privateDetails: z.object({ serialNumber: z.string().trim().max(120).optional(), uniqueMark: z.string().trim().max(500).optional(), privateDescription: z.string().trim().max(1000).optional() }).strict().optional()
  }).strict();
  const profileInput = z.object({ displayName: z.string().trim().min(1).max(80), phone: z.string().trim().max(40).default(""), city: z.string().trim().max(100).default("") }).strict();
  const claimInput = z.object({ note: z.string().trim().min(20).max(1000) }).strict();
  const messageInput = z.object({ text: z.string().trim().min(1).max(2000) }).strict();
  const statusInput = z.object({ status: z.enum(["APPROVED", "REJECTED"]) }).strict();
  const escaped = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const imageMimeByExtension = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  function hasValidImageSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
  }
  function userStorageClient(req) {
  return createClient(supabaseUrl, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${req.accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  }
  async function userOwnsImagePaths(req, paths) {
  if (!validImagePaths(paths)) return false;
  const bucket = userStorageClient(req).storage.from("item-images");
  for (const path of paths) {
    const search = path.slice(0, path.lastIndexOf("."));
    const { data, error } = await bucket.list("", { search, limit: 10 });
    if (error) throw error;
    if (!data?.some(file => file.name === path)) return false;
  }
  return true;
  }

  async function addNotification(userId, type, title, body, extra = {}) {
  if (!userId) return;
  await collections.notifications.insertOne({ userId, type, title, body: String(body).slice(0, 240), ...extra, read: false, createdAt: new Date() });
  }
  function scoreItems(a, b) {
  let score = 0;
  score += a.category === b.category ? 20 : 0;
  score += a.subcategory && a.subcategory === b.subcategory ? 15 : 0;
  score += a.title.toLowerCase().split(/\s+/)[0] === b.title.toLowerCase().split(/\s+/)[0] ? 13 : 0;
  score += a.location.city.toLowerCase() === b.location.city.toLowerCase() ? 14 : 0;
  score += Math.abs(a.dateOccurred - b.dateOccurred) < 3 * 86400000 ? 12 : 0;
  score += a.brand && a.brand.toLowerCase() === b.brand.toLowerCase() ? 10 : 0;
  score += a.color && a.color.toLowerCase() === b.color.toLowerCase() ? 5 : 0;
  return Math.min(100, score + 5);
  }
  async function createMatches(item) {
  const candidates = await collections.items.find({ _id: { $ne: item._id }, type: item.type === "LOST" ? "FOUND" : "LOST", status: "OPEN", visibility: "PUBLIC", "location.city": { $regex: `^${escaped(item.location.city)}$`, $options: "i" } }).limit(100).toArray();
  for (const candidate of candidates) {
    const score = scoreItems(item, candidate);
    if (score < 60) continue;
    const lost = item.type === "LOST" ? item : candidate;
    const found = item.type === "FOUND" ? item : candidate;
    const match = { lostItemId: lost._id, foundItemId: found._id, lostOwnerId: lost.ownerId, foundOwnerId: found.ownerId, score, status: "POTENTIAL", createdAt: new Date() };
    try {
      const result = await collections.matches.insertOne(match);
      await Promise.all([
        addNotification(lost.ownerId, "NEW_MATCH", "Potential match", `New potential match (${score}%) for your item`, { itemId: lost._id.toString(), matchId: result.insertedId.toString() }),
        addNotification(found.ownerId, "NEW_MATCH", "Potential match", `New potential match (${score}%) for your item`, { itemId: found._id.toString(), matchId: result.insertedId.toString() })
      ]);
    } catch (error) { if (error?.code !== 11000) throw error; }
  }
  }
  async function requireConversationParticipant(req, res, next) {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid conversation id" });
  const conversation = await collections.conversations.findOne({ _id: objectId(req.params.id), participants: req.user.id });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  req.conversation = conversation;
  next();
  }

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/uploads", uploadRateLimit, ...requireAuth, express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "5mb" }), async (req, res) => {
  const extension = typeof req.get("x-image-extension") === "string" ? req.get("x-image-extension").toLowerCase() : "";
  const mime = req.get("content-type")?.toLowerCase();
  if (!Object.hasOwn(imageMimeByExtension, extension) || imageMimeByExtension[extension] !== mime || !hasValidImageSignature(req.body, mime)) {
    return res.status(400).json({ error: "Upload a valid JPG, JPEG, PNG, or WebP image" });
  }
  const path = `${randomUUID()}.${extension}`;
  try {
    const { error } = await userStorageClient(req).storage.from("item-images").upload(path, req.body, { contentType: mime, cacheControl: "3600", upsert: false });
    if (error) return res.status(502).json({ error: "Photo storage is unavailable" });
    return res.status(201).json({ path });
  } catch {
    return res.status(502).json({ error: "Photo storage is unavailable" });
  }
  });
  app.delete("/api/uploads", ...requireAuth, async (req, res) => {
  const parsed = z.object({ path: z.string().regex(imagePathPattern) }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid image path" });
  const { error } = await userStorageClient(req).storage.from("item-images").remove([parsed.data.path]);
  if (error) return res.status(502).json({ error: "Photo could not be removed" });
  return res.json({ ok: true });
  });
  app.get("/api/me", ...requireAuth, async (req, res) => {
  const profile = await collections.profiles.findOne({ userId: req.user.id }, { projection: { _id: 0, userId: 0 } });
  res.json({ user: { id: req.user.id, email: req.user.email, displayName: profile?.displayName || req.user.displayName || req.user.email.split("@")[0] || "User", phone: profile?.phone || "", city: profile?.city || "" } });
  });
  app.patch("/api/me", ...requireAuth, async (req, res) => {
  const parsed = profileInput.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Invalid profile", details: parsed.error.flatten() });
  await collections.profiles.updateOne({ userId: req.user.id }, { $set: { ...parsed.data, updatedAt: new Date() }, $setOnInsert: { userId: req.user.id, createdAt: new Date() } }, { upsert: true });
  res.json({ user: { id: req.user.id, email: req.user.email, ...parsed.data } });
  });

  app.get("/api/items", async (req, res) => {
  const filter = { visibility: "PUBLIC", status: { $ne: "DELETED" } };
  if (req.query.type === "LOST" || req.query.type === "FOUND") filter.type = req.query.type;
  if (typeof req.query.category === "string" && req.query.category.length <= 60) filter.category = req.query.category;
  if (typeof req.query.city === "string" && req.query.city.length <= 100) filter["location.city"] = { $regex: escaped(req.query.city), $options: "i" };
  if (typeof req.query.q === "string" && req.query.q.trim().length <= 100) { const term = escaped(req.query.q.trim()); filter.$or = [ { title: { $regex: term, $options: "i" } }, { description: { $regex: term, $options: "i" } }, { brand: { $regex: term, $options: "i" } } ]; }
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 50);
  const items = await collections.items.find(filter, { projection: { privateDetails: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  res.json({ items: items.map(safeItem) });
  });
  app.get("/api/my/items", ...requireAuth, async (req, res) => {
  const items = await collections.items.find({ ownerId: req.user.id }).sort({ createdAt: -1 }).limit(100).toArray();
  res.json({ items: items.map(item => safeItem(item, true)) });
  });
  app.post("/api/items", ...requireAuth, async (req, res) => {
  const parsed = itemInput.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Invalid item", details: parsed.error.flatten() });
  try {
    if (!(await userOwnsImagePaths(req, parsed.data.imagePaths))) return res.status(400).json({ error: "Each image must be uploaded by your account" });
  } catch {
    return res.status(503).json({ error: "Uploaded photos could not be verified" });
  }
  const { privateDetails, ...fields } = parsed.data;
  const doc = { ...fields, ownerId: req.user.id, visibility: "PUBLIC", status: "OPEN", privateDetails: privateDetails || {}, imageCount: fields.imagePaths.length, createdAt: new Date(), updatedAt: new Date() };
  const result = await collections.items.insertOne(doc);
  doc._id = result.insertedId;
  await createMatches(doc);
  res.status(201).json({ item: safeItem(doc) });
  });
  app.get("/api/items/:id", optionalAuth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid item id" });
  const item = await collections.items.findOne({ _id: objectId(req.params.id), visibility: "PUBLIC", status: { $ne: "DELETED" } }, { projection: { privateDetails: 0 } });
  if (!item) return res.status(404).json({ error: "Item not found" });
  const isOwner = item.ownerId === req.user?.id;
  const matches = isOwner ? await collections.matches.find({ $or: [{ lostItemId: item._id }, { foundItemId: item._id }] }).sort({ createdAt: -1 }).limit(20).toArray() : [];
  res.json({ item: { ...safeItem(item, isOwner), isOwner }, matches: matches.map(m => ({ id: m._id.toString(), score: m.score, status: m.status, createdAt: m.createdAt })) });
  });
  app.get("/api/items/:id/private", ...requireAuth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid item id" });
  const item = await collections.items.findOne({ _id: objectId(req.params.id), ownerId: req.user.id }, { projection: { privateDetails: 1 } });
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json({ privateDetails: item.privateDetails || {} });
  });
  app.patch("/api/items/:id", ...requireAuth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid item id" });
  const allowed = z.object({ title: z.string().trim().min(2).max(120).optional(), description: z.string().trim().max(2000).optional(), status: z.literal("CLOSED").optional() }).strict().safeParse(req.body);
  if (!allowed.success || !Object.keys(allowed.data || {}).length) return res.status(400).json({ error: "Only title, description, or closing your item is allowed" });
  const result = await collections.items.updateOne({ _id: objectId(req.params.id), ownerId: req.user.id, status: { $ne: "DELETED" } }, { $set: { ...allowed.data, updatedAt: new Date() } });
  if (!result.matchedCount) return res.status(404).json({ error: "Item not found" });
  res.json({ ok: true });
  });

  app.get("/api/dashboard", ...requireAuth, async (req, res) => {
  const [items, matches, incomingClaims, outgoingClaims] = await Promise.all([
    collections.items.find({ ownerId: req.user.id }, { projection: { privateDetails: 0 } }).sort({ createdAt: -1 }).limit(10).toArray(),
    collections.matches.find({ $or: [{ lostOwnerId: req.user.id }, { foundOwnerId: req.user.id }] }).sort({ createdAt: -1 }).limit(10).toArray(),
    collections.claims.countDocuments({ ownerId: req.user.id, status: "PENDING" }), collections.claims.countDocuments({ claimantId: req.user.id, status: "PENDING" })
  ]);
  res.json({ items: items.map(item => safeItem(item, true)), matches: matches.map(m => ({ id: m._id.toString(), lostItemId: m.lostItemId.toString(), foundItemId: m.foundItemId.toString(), score: m.score, status: m.status, createdAt: m.createdAt })), incomingClaims, pendingClaims: outgoingClaims });
  });
  app.get("/api/matches", ...requireAuth, async (req, res) => {
  const matches = await collections.matches.find({ $or: [{ lostOwnerId: req.user.id }, { foundOwnerId: req.user.id }] }).sort({ createdAt: -1 }).limit(100).toArray();
  const itemIds = [...new Set(matches.flatMap(m => [m.lostItemId, m.foundItemId]))];
  const items = await collections.items.find({ _id: { $in: itemIds } }, { projection: { privateDetails: 0 } }).toArray();
  res.json({ matches: matches.map(m => ({ id: m._id.toString(), lostItemId: m.lostItemId.toString(), foundItemId: m.foundItemId.toString(), score: m.score, status: m.status, createdAt: m.createdAt })), items: items.map(item => safeItem(item, item.ownerId === req.user.id)) });
  });
  app.get("/api/matches/:id", ...requireAuth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid match id" });
  const match = await collections.matches.findOne({ _id: objectId(req.params.id), $or: [{ lostOwnerId: req.user.id }, { foundOwnerId: req.user.id }] });
  if (!match) return res.status(404).json({ error: "Match not found" });
  const [lost, found] = await Promise.all([collections.items.findOne({ _id: match.lostItemId }, { projection: { privateDetails: 0 } }), collections.items.findOne({ _id: match.foundItemId }, { projection: { privateDetails: 0 } })]);
  res.json({ match: { id: match._id.toString(), lostItemId: match.lostItemId.toString(), foundItemId: match.foundItemId.toString(), score: match.score, status: match.status, createdAt: match.createdAt }, canClaim: match.lostOwnerId === req.user.id, lost: safeItem(lost, lost?.ownerId === req.user.id), found: safeItem(found, found?.ownerId === req.user.id) });
  });
  app.post("/api/matches/:id/claims", ...requireAuth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid match id" });
  const parsed = claimInput.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Invalid claim", details: parsed.error.flatten() });
  const match = await collections.matches.findOne({ _id: objectId(req.params.id), status: { $in: ["POTENTIAL", "VIEWED"] }, lostOwnerId: req.user.id });
  if (!match) return res.status(404).json({ error: "Claimable match not found" });
  const existing = await collections.claims.findOne({ matchId: match._id, claimantId: req.user.id, status: "PENDING" });
  if (existing) return res.status(409).json({ error: "You already have a pending claim for this match" });
  const claim = { matchId: match._id, itemId: match.foundItemId, claimantId: req.user.id, ownerId: match.foundOwnerId, note: parsed.data.note, status: "PENDING", createdAt: new Date(), updatedAt: new Date() };
  let result;
  try { result = await collections.claims.insertOne(claim); }
  catch (error) { if (error?.code === 11000) return res.status(409).json({ error: "You already submitted a claim for this match" }); throw error; }
  await Promise.all([addNotification(claim.ownerId, "CLAIM_REQUEST", "New claim request", "Someone requested to claim your found item", { itemId: claim.itemId.toString(), claimId: result.insertedId.toString() }), collections.matches.updateOne({ _id: match._id, status: { $in: ["POTENTIAL", "VIEWED"] } }, { $set: { status: "CLAIM_STARTED" } })]);
  res.status(201).json({ claim: { id: result.insertedId.toString(), matchId: claim.matchId.toString(), itemId: claim.itemId.toString(), note: claim.note, status: claim.status, createdAt: claim.createdAt } });
  });
  app.get("/api/claims", ...requireAuth, async (req, res) => {
  const claims = await collections.claims.find({ $or: [{ ownerId: req.user.id }, { claimantId: req.user.id }] }).sort({ createdAt: -1 }).limit(100).toArray();
  res.json({ claims: claims.map(c => ({ id: c._id.toString(), itemId: c.itemId.toString(), matchId: c.matchId.toString(), note: c.note, status: c.status, createdAt: c.createdAt, incoming: c.ownerId === req.user.id })) });
  });
  app.patch("/api/claims/:id", ...requireAuth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid claim id" });
  const parsed = statusInput.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Invalid status" });
  const claim = await collections.claims.findOne({ _id: objectId(req.params.id), ownerId: req.user.id, status: "PENDING" });
  if (!claim) return res.status(404).json({ error: "Pending claim not found" });
  const updated = await collections.claims.updateOne({ _id: claim._id, ownerId: req.user.id, status: "PENDING" }, { $set: { status: parsed.data.status, updatedAt: new Date() } });
  if (!updated.modifiedCount) return res.status(409).json({ error: "Claim was already handled" });
  if (parsed.data.status === "APPROVED") {
    const participants = [claim.claimantId, claim.ownerId].sort();
    let conversation = await collections.conversations.findOne({ claimId: claim._id, participants: { $all: participants } });
    if (!conversation) {
      conversation = { claimId: claim._id, participants, itemId: claim.itemId, status: "ACTIVE", lastMessage: "", createdAt: new Date(), updatedAt: new Date() };
      const saved = await collections.conversations.insertOne(conversation); conversation._id = saved.insertedId;
    }
    await Promise.all([addNotification(claim.claimantId, "CLAIM_APPROVED", "Claim approved", "Your claim was approved. Coordinate the return in Messages.", { itemId: claim.itemId.toString() }), collections.audit.insertOne({ actorId: req.user.id, action: "CLAIM_APPROVED", claimId: claim._id, createdAt: new Date() })]);
  } else await addNotification(claim.claimantId, "CLAIM_REJECTED", "Claim rejected", "Your claim was rejected.", { itemId: claim.itemId.toString() });
  res.json({ ok: true, status: parsed.data.status });
  });

  app.get("/api/conversations", ...requireAuth, async (req, res) => {
  const conversations = await collections.conversations.find({ participants: req.user.id }).sort({ updatedAt: -1 }).limit(100).toArray();
  res.json({ conversations: conversations.map(c => ({ id: c._id.toString(), itemId: c.itemId.toString(), status: c.status, lastMessage: c.lastMessage, updatedAt: c.updatedAt, createdAt: c.createdAt })) });
  });
  app.get("/api/conversations/:id/messages", ...requireAuth, requireConversationParticipant, async (req, res) => {
  const messages = await collections.messages.find({ conversationId: req.conversation._id }).sort({ createdAt: 1 }).limit(200).toArray();
  res.json({ messages: messages.map(m => ({ id: m._id.toString(), text: m.text, createdAt: m.createdAt, isOwn: m.senderId === req.user.id })) });
  });
  app.post("/api/conversations/:id/messages", ...requireAuth, requireConversationParticipant, async (req, res) => {
  const parsed = messageInput.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Message must contain 1–2000 characters" });
  if (req.conversation.status !== "ACTIVE") return res.status(409).json({ error: "This conversation is closed" });
  const doc = { conversationId: req.conversation._id, senderId: req.user.id, text: parsed.data.text, createdAt: new Date() };
  const inserted = await collections.messages.insertOne(doc);
  await collections.conversations.updateOne({ _id: req.conversation._id, participants: req.user.id }, { $set: { lastMessage: doc.text.slice(0, 160), updatedAt: new Date() } });
  for (const participant of req.conversation.participants) if (participant !== req.user.id) await addNotification(participant, "NEW_MESSAGE", "New message", doc.text.slice(0, 120), { conversationId: req.conversation._id.toString() });
  res.status(201).json({ message: { id: inserted.insertedId.toString(), text: doc.text, createdAt: doc.createdAt, isOwn: true } });
  });
  app.get("/api/notifications", ...requireAuth, async (req, res) => {
  const notifications = await collections.notifications.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100).toArray();
  res.json({ notifications: notifications.map(asDoc) });
  });
  app.patch("/api/notifications/:id/read", ...requireAuth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid notification id" });
  const result = await collections.notifications.updateOne({ _id: objectId(req.params.id), userId: req.user.id }, { $set: { read: true } });
  if (!result.matchedCount) return res.status(404).json({ error: "Notification not found" });
  res.json({ ok: true });
  });
  app.patch("/api/notifications/read-all", ...requireAuth, async (req, res) => {
  await collections.notifications.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } }); res.json({ ok: true });
  });

  const adminIds = new Set((env.ADMIN_USER_IDS || "").split(",").map(x => x.trim()).filter(Boolean));
  app.get("/api/admin/summary", ...requireAuth, async (req, res) => {
  if (!adminIds.has(req.user.id)) return res.status(403).json({ error: "Admin access required" });
  const [items, claims, matches, users] = await Promise.all([collections.items.countDocuments(), collections.claims.countDocuments({ status: "PENDING" }), collections.matches.countDocuments(), collections.profiles.countDocuments()]);
  res.json({ items, claims, matches, users });
  });

  if (env.SERVE_FRONTEND === "true") {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
      if (req.path === "/api" || req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Not found" });
      }
      if (req.method !== "GET" || !req.accepts("html")) return next();
      return res.sendFile(resolve(frontendDist, "index.html"), error => {
        if (error) next(error);
      });
    });
  }

  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && "body" in err) return res.status(400).json({ error: "Invalid JSON" });
  if (err?.status === 413) return res.status(413).json({ error: "Request body is too large" });
  if (err?.message === "Origin not allowed") return res.status(403).json({ error: "Origin not allowed" });
  const route = typeof req.route?.path === "string"
    ? req.route.path
    : req.path.replace(/\/[a-f\d]{24}(?=\/|$)/gi, "/:id");
  const errorName = typeof err?.name === "string" ? err.name.slice(0, 50) : "Error";
  const errorCode = typeof err?.code === "string" || typeof err?.code === "number"
    ? String(err.code).slice(0, 50)
    : undefined;
  console.error(JSON.stringify({
    event: "api_request_failed",
    requestId: req.requestId,
    method: req.method,
    route,
    errorName,
    ...(errorCode ? { errorCode } : {})
  }));
  res.status(500).json({ error: "Request failed" });
  });
  return { app, client };
}

