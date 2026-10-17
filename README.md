# MONRQ Lost & Found

React/Vite frontend, Supabase Auth, and a private Node API backed by MongoDB. The browser never connects directly to MongoDB. The API verifies every Supabase access token and enforces ownership for private records and state changes.

## Configure

1. Create a Supabase project. Enable email/password sign-in and Google OAuth if you want the Google button. Configure the allowed redirect URLs for the app.
2. Create a MongoDB database and a database user with access only to the `monrq` database. Restrict the database network allowlist to the API host.
3. Copy `.env.example` to `.env` for Vite and place the backend values in `server/.env`. Keep both env files out of version control. The frontend may only receive `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the API URL. Never put `MONGODB_URI` or a Supabase `service_role` key in a `VITE_` variable. The API verifies every bearer token with `supabase.auth.getUser(token)`.
4. Set `ADMIN_USER_IDS` to the comma-separated Supabase user IDs allowed to view the admin summary. Admin status is checked by the server, never by editable browser state.
5. Review and apply `supabase_security.sql` in the Supabase SQL editor. It enables RLS on existing `public` tables, adds owner/public policies to a compatible `public.items` table if one exists, and configures the `item-images` Storage bucket. This app currently stores records in MongoDB, so no Supabase application-data tables are created by the script.

## Run locally

Copy `.env.example` to `.env` and `server/.env.example` to `server/.env`. Install frontend dependencies with `npm install` in this folder, then install API dependencies with `npm install` from `server`. Run `npm run dev` from the project root; it starts the MongoDB API, waits for its health check, and then starts Vite. Use Node.js 20 or later for both processes. `npm run dev:web` and `npm run dev:api` are available when you need to run either process separately.

For Cloudflare, build the Vite frontend with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`; leave `VITE_API_URL` empty so `/api` stays same-origin. Deploy the Worker and assets with `npm run deploy`. Set `MONGODB_URI`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` as Cloudflare Worker secrets. The MongoDB API runs inside a Durable Object so it can reuse its MongoDB connection. `MONGODB_DB` is configured in `wrangler.toml`; set `ADMIN_USER_IDS` as a Worker variable only if an admin summary is needed.

## Data and security notes

- Public item responses are explicitly allowlisted, omit profile contact fields and private verification details, expose only the city (not the exact location), and hide likely email, phone, and address text. Only the authenticated owner can read private verification details and exact item-location fields.
- Users cannot set ownership IDs, participant lists, sender IDs, claim owners, or approval status directly.
- A claim needs a 20–1000 character private verification note. The note is visible only to the claimant and found-item owner; a conversation is created only after the found-item owner approves the claim.
- Search inputs and request bodies are validated, database filters are constructed server-side, and the API has request-size, origin, security-header, and rate-limit controls.
- Image uploads are authenticated and pass through the API, which checks file extension, MIME type, size (5 MB), and JPG/PNG/WebP file signatures before forwarding with the user's JWT. Supabase Storage independently restricts the bucket to those MIME types, 5 MB, and the authenticated uploader identity. Public image paths do not contain account IDs; item photos in this bucket are public by design.
- The old browser-only demo data is intentionally not imported: local storage can be edited by any visitor and is not a trustworthy source for claims or ownership.
