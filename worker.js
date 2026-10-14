/**
 * AppZed pipeline-watcher (managed=true). Receive job results as webhooks,
 * diff schema snapshots against the last, list failures. Schema
 * self-initializes. Bindings: DB (d1). No AI needed.
 */
const SCHEMA_RUNS = "CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, job TEXT, status TEXT, detail TEXT, created_at TEXT DEFAULT (datetime('now')))";
const SCHEMA_TABLES = "CREATE TABLE IF NOT EXISTS schemas (job TEXT PRIMARY KEY, snapshot TEXT, updated_at TEXT DEFAULT (datetime('now')))";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, solution: "pipeline-watcher" });
    }
    if (request.method === "POST" && url.pathname === "/runs") {
      const body = await request.json().catch(() => null);
      if (!body || !body.job || !body.status) return bad("job and status are required.");
      if (!["success", "failed"].includes(body.status)) return bad('status must be "success" or "failed".');
      const id = crypto.randomUUID();
      await env.DB.exec(SCHEMA_RUNS);
      await env.DB.exec(SCHEMA_TABLES);
      await env.DB.prepare(
        "INSERT INTO runs (id, job, status, detail) VALUES (?, ?, ?, ?)"
      ).bind(id, body.job, body.status, body.detail || "").run();
      return Response.json({ id }, { status: 201 });
    }
    if (request.method === "POST" && url.pathname === "/schema") {
      const body = await request.json().catch(() => null);
      if (!body || !body.job || !Array.isArray(body.columns)) {
        return bad("job and columns (array of names) are required.");
      }
      await env.DB.exec(SCHEMA_TABLES);
      const prev = await env.DB.prepare("SELECT snapshot FROM schemas WHERE job = ?").bind(body.job).first();
      const snapshot = JSON.stringify([...body.columns].sort());
      await env.DB.prepare(
        "INSERT INTO schemas (job, snapshot) VALUES (?, ?) ON CONFLICT(job) DO UPDATE SET snapshot=excluded.snapshot, updated_at=datetime('now')"
      ).bind(body.job, snapshot).run();
      if (!prev) return Response.json({ job: body.job, drift: false, note: "baseline recorded" }, { status: 201 });
      const before = JSON.parse(prev.snapshot);
      const after = JSON.parse(snapshot);
      const added = after.filter((c) => !before.includes(c));
      const removed = before.filter((c) => !after.includes(c));
      return Response.json({ job: body.job, drift: added.length > 0 || removed.length > 0, added, removed }, { status: 201 });
    }
    if (request.method === "GET" && url.pathname === "/failures") {
      await env.DB.exec(SCHEMA_RUNS);
      const rows = await env.DB.prepare(
        "SELECT * FROM runs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 50"
      ).all();
      return Response.json({ failures: rows.results || [] });
    }
    return new Response("Not found", { status: 404 });
  },
};

function bad(message) {
  return Response.json({ error: message }, { status: 400 });
}
