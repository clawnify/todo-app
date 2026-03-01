import { Hono } from "hono";
import { query, get, run, transaction } from "./db";

const app = new Hono();

// ── Helpers ─────────────────────────────────────────────────────────

async function nextIdentifier(): Promise<string> {
  const prefix = await get<{ value: string }>("SELECT value FROM _meta WHERE key = 'identifier_prefix'");
  const counter = await get<{ value: string }>("SELECT value FROM _meta WHERE key = 'issue_counter'");
  const next = parseInt(counter?.value || "0", 10) + 1;
  await run("UPDATE _meta SET value = ? WHERE key = 'issue_counter'", String(next));
  return `${prefix?.value || "TASK"}-${next}`;
}

// ── Stats ───────────────────────────────────────────────────────────

app.get("/api/stats", async (c) => {
  try {
    const issues = await get<{ count: number }>("SELECT COUNT(*) as count FROM issues");
    const projects = await get<{ count: number }>("SELECT COUNT(*) as count FROM projects");
    const labels = await get<{ count: number }>("SELECT COUNT(*) as count FROM labels");
    return c.json({
      issues: issues?.count || 0,
      projects: projects?.count || 0,
      labels: labels?.count || 0,
    });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Issues ──────────────────────────────────────────────────────────

app.get("/api/issues", async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "50", 10)));
    const offset = (page - 1) * limit;
    const search = c.req.query("search") || "";
    const status = c.req.query("status") || "";
    const projectId = c.req.query("project_id") || "";

    const whereClauses: string[] = [];
    const whereParams: unknown[] = [];

    if (search) {
      whereClauses.push("(i.title LIKE ? OR i.identifier LIKE ?)");
      whereParams.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      whereClauses.push("i.status = ?");
      whereParams.push(status);
    }
    if (projectId) {
      whereClauses.push("i.project_id = ?");
      whereParams.push(parseInt(projectId, 10));
    }

    const whereSQL = whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : "";

    const countResult = await get<{ total: number }>(
      "SELECT COUNT(*) as total FROM issues i" + whereSQL,
      ...whereParams,
    );
    const total = countResult?.total || 0;

    const issues = await query(
      `SELECT i.*, p.name as project_name, p.icon as project_icon
       FROM issues i
       LEFT JOIN projects p ON i.project_id = p.id
       ${whereSQL}
       ORDER BY
         CASE i.status
           WHEN 'in_progress' THEN 0
           WHEN 'todo' THEN 1
           WHEN 'backlog' THEN 2
           WHEN 'done' THEN 3
           WHEN 'cancelled' THEN 4
         END,
         CASE i.priority
           WHEN 'urgent' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 3
           WHEN 'none' THEN 4
         END,
         i.sort_order, i.id DESC
       LIMIT ? OFFSET ?`,
      ...whereParams, limit, offset,
    );

    // Fetch labels for each issue
    const issueIds = (issues as { id: number }[]).map((i) => i.id);
    let issueLabels: { issue_id: number; label_id: number; name: string; color: string }[] = [];
    if (issueIds.length > 0) {
      issueLabels = await query(
        `SELECT il.issue_id, il.label_id, l.name, l.color
         FROM issue_labels il
         JOIN labels l ON il.label_id = l.id
         WHERE il.issue_id IN (${issueIds.map(() => "?").join(",")})`,
        ...issueIds,
      );
    }

    const labelMap = new Map<number, { id: number; name: string; color: string }[]>();
    for (const il of issueLabels) {
      if (!labelMap.has(il.issue_id)) labelMap.set(il.issue_id, []);
      labelMap.get(il.issue_id)!.push({ id: il.label_id, name: il.name, color: il.color });
    }

    const enriched = (issues as { id: number }[]).map((issue) => ({
      ...issue,
      labels: labelMap.get(issue.id) || [],
    }));

    return c.json({ issues: enriched, total, page, limit });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post("/api/issues", async (c) => {
  try {
    const body = await c.req.json();
    const title = (body.title || "").trim();
    if (!title) return c.json({ error: "Title is required" }, 400);

    const identifier = await nextIdentifier();

    await run(
      `INSERT INTO issues (identifier, title, description, status, priority, project_id, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      identifier,
      title,
      body.description || "",
      body.status || "todo",
      body.priority || "none",
      body.project_id || null,
      body.due_date || "",
      body.sort_order || 0,
    );

    const issue = await get("SELECT * FROM issues WHERE identifier = ?", identifier);
    return c.json({ issue }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get("/api/issues/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const issue = await get(
      `SELECT i.*, p.name as project_name, p.icon as project_icon
       FROM issues i
       LEFT JOIN projects p ON i.project_id = p.id
       WHERE i.id = ?`,
      id,
    );
    if (!issue) return c.json({ error: "Issue not found" }, 404);

    const labels = await query(
      `SELECT l.id, l.name, l.color
       FROM issue_labels il
       JOIN labels l ON il.label_id = l.id
       WHERE il.issue_id = ?`,
      id,
    );

    const comments = await query(
      "SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC",
      id,
    );

    return c.json({ issue: { ...issue, labels, comments } });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put("/api/issues/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const body = await c.req.json();
    const setClauses: string[] = [];
    const setParams: unknown[] = [];

    if (body.title !== undefined) { setClauses.push("title = ?"); setParams.push(body.title); }
    if (body.description !== undefined) { setClauses.push("description = ?"); setParams.push(body.description); }
    if (body.status !== undefined) { setClauses.push("status = ?"); setParams.push(body.status); }
    if (body.priority !== undefined) { setClauses.push("priority = ?"); setParams.push(body.priority); }
    if (body.project_id !== undefined) { setClauses.push("project_id = ?"); setParams.push(body.project_id || null); }
    if (body.due_date !== undefined) { setClauses.push("due_date = ?"); setParams.push(body.due_date); }
    if (body.sort_order !== undefined) { setClauses.push("sort_order = ?"); setParams.push(body.sort_order); }

    if (setClauses.length === 0) return c.json({ error: "No fields to update" }, 400);

    setClauses.push("updated_at = datetime('now')");
    setParams.push(id);

    const result = await run("UPDATE issues SET " + setClauses.join(", ") + " WHERE id = ?", ...setParams);
    if (result.changes === 0) return c.json({ error: "Issue not found" }, 404);

    const issue = await get("SELECT * FROM issues WHERE id = ?", id);
    return c.json({ issue });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/issues/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const result = await run("DELETE FROM issues WHERE id = ?", id);
    if (result.changes === 0) return c.json({ error: "Issue not found" }, 404);

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Issue Labels ────────────────────────────────────────────────────

app.post("/api/issues/:id/labels", async (c) => {
  try {
    const issueId = parseInt(c.req.param("id"), 10);
    if (isNaN(issueId)) return c.json({ error: "Invalid issue ID" }, 400);

    const body = await c.req.json();
    const labelId = body.label_id;
    if (!labelId) return c.json({ error: "label_id is required" }, 400);

    await run("INSERT OR IGNORE INTO issue_labels (issue_id, label_id) VALUES (?, ?)", issueId, labelId);
    return c.json({ ok: true }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/issues/:id/labels/:lid", async (c) => {
  try {
    const issueId = parseInt(c.req.param("id"), 10);
    const labelId = parseInt(c.req.param("lid"), 10);
    if (isNaN(issueId) || isNaN(labelId)) return c.json({ error: "Invalid ID" }, 400);

    await run("DELETE FROM issue_labels WHERE issue_id = ? AND label_id = ?", issueId, labelId);
    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Comments ────────────────────────────────────────────────────────

app.get("/api/issues/:id/comments", async (c) => {
  try {
    const issueId = parseInt(c.req.param("id"), 10);
    if (isNaN(issueId)) return c.json({ error: "Invalid issue ID" }, 400);

    const comments = await query(
      "SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC",
      issueId,
    );
    return c.json({ comments });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post("/api/issues/:id/comments", async (c) => {
  try {
    const issueId = parseInt(c.req.param("id"), 10);
    if (isNaN(issueId)) return c.json({ error: "Invalid issue ID" }, 400);

    const body = await c.req.json();
    const content = (body.content || "").trim();
    if (!content) return c.json({ error: "Content is required" }, 400);

    await run("INSERT INTO comments (issue_id, content) VALUES (?, ?)", issueId, content);
    const comment = await get("SELECT * FROM comments WHERE rowid = last_insert_rowid()");
    return c.json({ comment }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/comments/:cid", async (c) => {
  try {
    const cid = parseInt(c.req.param("cid"), 10);
    if (isNaN(cid)) return c.json({ error: "Invalid comment ID" }, 400);

    const result = await run("DELETE FROM comments WHERE id = ?", cid);
    if (result.changes === 0) return c.json({ error: "Comment not found" }, 404);

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Projects ────────────────────────────────────────────────────────

app.get("/api/projects", async (c) => {
  try {
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    const countResult = await get<{ total: number }>("SELECT COUNT(*) as total FROM projects");
    const total = countResult?.total || 0;

    const projects = await query(
      `SELECT p.*,
         (SELECT COUNT(*) FROM issues WHERE project_id = p.id) as issue_count,
         (SELECT COUNT(*) FROM issues WHERE project_id = p.id AND status = 'done') as done_count
       FROM projects p
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      limit, offset,
    );

    return c.json({ projects, total, page, limit });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get("/api/projects/all", async (c) => {
  try {
    const projects = await query("SELECT id, name, icon FROM projects ORDER BY name");
    return c.json({ projects });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post("/api/projects", async (c) => {
  try {
    const body = await c.req.json();
    const name = (body.name || "").trim();
    if (!name) return c.json({ error: "Name is required" }, 400);

    await run(
      `INSERT INTO projects (name, icon, description, status, priority, lead, start_date, target_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      name,
      body.icon || "📋",
      body.description || "",
      body.status || "planned",
      body.priority || "none",
      body.lead || "",
      body.start_date || "",
      body.target_date || "",
    );

    const project = await get("SELECT * FROM projects WHERE rowid = last_insert_rowid()");
    return c.json({ project }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put("/api/projects/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const body = await c.req.json();
    const setClauses: string[] = [];
    const setParams: unknown[] = [];

    if (body.name !== undefined) { setClauses.push("name = ?"); setParams.push(body.name); }
    if (body.icon !== undefined) { setClauses.push("icon = ?"); setParams.push(body.icon); }
    if (body.description !== undefined) { setClauses.push("description = ?"); setParams.push(body.description); }
    if (body.status !== undefined) { setClauses.push("status = ?"); setParams.push(body.status); }
    if (body.priority !== undefined) { setClauses.push("priority = ?"); setParams.push(body.priority); }
    if (body.lead !== undefined) { setClauses.push("lead = ?"); setParams.push(body.lead); }
    if (body.start_date !== undefined) { setClauses.push("start_date = ?"); setParams.push(body.start_date); }
    if (body.target_date !== undefined) { setClauses.push("target_date = ?"); setParams.push(body.target_date); }

    if (setClauses.length === 0) return c.json({ error: "No fields to update" }, 400);

    setClauses.push("updated_at = datetime('now')");
    setParams.push(id);

    const result = await run("UPDATE projects SET " + setClauses.join(", ") + " WHERE id = ?", ...setParams);
    if (result.changes === 0) return c.json({ error: "Project not found" }, 404);

    const project = await get("SELECT * FROM projects WHERE id = ?", id);
    return c.json({ project });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/projects/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const result = await run("DELETE FROM projects WHERE id = ?", id);
    if (result.changes === 0) return c.json({ error: "Project not found" }, 404);

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Labels ──────────────────────────────────────────────────────────

app.get("/api/labels", async (c) => {
  try {
    const labels = await query("SELECT * FROM labels ORDER BY name");
    return c.json({ labels });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.get("/api/labels/all", async (c) => {
  try {
    const labels = await query("SELECT id, name, color FROM labels ORDER BY name");
    return c.json({ labels });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.post("/api/labels", async (c) => {
  try {
    const body = await c.req.json();
    const name = (body.name || "").trim();
    if (!name) return c.json({ error: "Name is required" }, 400);

    await run("INSERT INTO labels (name, color) VALUES (?, ?)", name, body.color || "#6b7280");
    const label = await get("SELECT * FROM labels WHERE rowid = last_insert_rowid()");
    return c.json({ label }, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.put("/api/labels/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const body = await c.req.json();
    const setClauses: string[] = [];
    const setParams: unknown[] = [];

    if (body.name !== undefined) { setClauses.push("name = ?"); setParams.push(body.name); }
    if (body.color !== undefined) { setClauses.push("color = ?"); setParams.push(body.color); }

    if (setClauses.length === 0) return c.json({ error: "No fields to update" }, 400);

    setParams.push(id);
    const result = await run("UPDATE labels SET " + setClauses.join(", ") + " WHERE id = ?", ...setParams);
    if (result.changes === 0) return c.json({ error: "Label not found" }, 404);

    const label = await get("SELECT * FROM labels WHERE id = ?", id);
    return c.json({ label });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

app.delete("/api/labels/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const result = await run("DELETE FROM labels WHERE id = ?", id);
    if (result.changes === 0) return c.json({ error: "Label not found" }, 404);

    return c.json({ ok: true });
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;
