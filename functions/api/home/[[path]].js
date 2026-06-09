function json(data, status = 200) {
  return Response.json(data, { status });
}

function requireBinding(env, name) {
  if (!env[name]) throw new Error(`Cloudflare Binding fehlt: ${name}`);
  return env[name];
}

function clean(value, max = 100) {
  return String(value || "").trim().slice(0, max);
}

function emptyHome() {
  return { grocery: [], household: [], updatedAt: new Date().toISOString() };
}

async function readHome(env) {
  const kv = requireBinding(env, "MEMORY_DATA");
  const value = await kv.get("home", "json");
  if (!value) return emptyHome();
  return {
    grocery: Array.isArray(value.grocery) ? value.grocery : [],
    household: Array.isArray(value.household) ? value.household : [],
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

async function writeHome(env, home) {
  const next = { ...home, updatedAt: new Date().toISOString() };
  await requireBinding(env, "MEMORY_DATA").put("home", JSON.stringify(next));
  return next;
}

function itemId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function savePhoto(env, file) {
  if (!file || typeof file === "string" || !file.size) return "";
  const extension = clean(file.name, 120).split(".").pop()?.toLowerCase() || "jpg";
  const key = `home/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await requireBinding(env, "MEMORY_FILES").put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return `/api/file?key=${encodeURIComponent(key)}`;
}

async function deletePhoto(env, photoUrl) {
  if (!photoUrl || !env.MEMORY_FILES) return;
  const url = new URL(photoUrl, "https://pinnwand.local");
  const key = url.pathname === "/api/file" ? url.searchParams.get("key") : "";
  if (key?.startsWith("home/")) await env.MEMORY_FILES.delete(key);
}

function pathParts(context) {
  const value = context.params.path || "";
  return (Array.isArray(value) ? value : value.split("/")).filter(Boolean);
}

async function createGrocery(request, env) {
  const payload = await request.json().catch(() => ({}));
  const name = clean(payload.name, 80);
  if (!name) return json({ error: "Bitte einen Artikel eintragen." }, 400);

  const home = await readHome(env);
  const item = {
    id: itemId("grocery"),
    name,
    amount: clean(payload.amount, 30),
    priority: ["wish", "needed", "kater"].includes(payload.priority) ? payload.priority : "wish",
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: "",
  };
  home.grocery.unshift(item);
  await writeHome(env, home);
  return json(item, 201);
}

async function createHousehold(request, env) {
  const form = await request.formData();
  const task = clean(form.get("task"), 100);
  if (!task) return json({ error: "Bitte eine Aufgabe eintragen." }, 400);

  const item = {
    id: itemId("household"),
    task,
    room: clean(form.get("room"), 30) || "Unbekannter Tatort",
    tone: clean(form.get("tone"), 60) || "Kleine Erinnerung",
    photo: await savePhoto(env, form.get("photo")),
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: "",
  };
  const home = await readHome(env);
  home.household.unshift(item);
  await writeHome(env, home);
  return json(item, 201);
}

async function updateItem(request, env, collection, id) {
  const payload = await request.json().catch(() => ({}));
  const home = await readHome(env);
  const item = home[collection].find((entry) => entry.id === id);
  if (!item) return json({ error: "Eintrag nicht gefunden." }, 404);
  item.done = Boolean(payload.done);
  item.completedAt = item.done ? new Date().toISOString() : "";
  await writeHome(env, home);
  return json(item);
}

async function deleteItem(env, collection, id) {
  const home = await readHome(env);
  const item = home[collection].find((entry) => entry.id === id);
  if (!item) return json({ error: "Eintrag nicht gefunden." }, 404);
  if (collection === "household") await deletePhoto(env, item.photo);
  home[collection] = home[collection].filter((entry) => entry.id !== id);
  await writeHome(env, home);
  return json({ ok: true });
}

export async function onRequest(context) {
  const { request, env } = context;
  const parts = pathParts(context);

  try {
    if (request.method === "GET" && parts[0] === "events") {
      const body = `retry: 5000\nevent: homeUpdated\ndata: ${JSON.stringify(await readHome(env))}\n\n`;
      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (request.method === "GET" && !parts.length) return json(await readHome(env));
    if (request.method === "POST" && parts[0] === "grocery" && !parts[1]) return createGrocery(request, env);
    if (request.method === "POST" && parts[0] === "household" && !parts[1]) return createHousehold(request, env);

    const collection = parts[0] === "grocery" ? "grocery" : parts[0] === "household" ? "household" : "";
    const id = decodeURIComponent(parts[1] || "");
    if (collection && id && request.method === "PATCH") return updateItem(request, env, collection, id);
    if (collection && id && request.method === "DELETE") return deleteItem(env, collection, id);

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    return json({ error: error.message || "Cloudflare Function Fehler" }, 500);
  }
}
