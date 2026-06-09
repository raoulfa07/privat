import { del, list, put } from "@vercel/blob";

const STATE_PATH = "pinnwand/home.json";
const LEGACY_STATE_PREFIX = "pinnwand/status/";
const EVENT_PREFIX = "pinnwand/events/";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clean(value, max = 100) {
  return String(value || "").trim().slice(0, max);
}

function emptyHome() {
  return { grocery: [], household: [], updatedAt: new Date().toISOString() };
}

function normalizeHome(value) {
  return {
    grocery: Array.isArray(value?.grocery) ? value.grocery : [],
    household: Array.isArray(value?.household) ? value.household : [],
    updatedAt: value?.updatedAt || new Date().toISOString(),
  };
}

async function readHome() {
  const canonical = await list({ prefix: STATE_PATH, limit: 10 });
  let stateBlob = canonical.blobs.find((blob) => blob.pathname === STATE_PATH);

  if (!stateBlob) {
    const legacy = await list({ prefix: LEGACY_STATE_PREFIX, limit: 1000 });
    stateBlob = legacy.blobs.sort((a, b) => {
      const aTime = Number(a.pathname.slice(LEGACY_STATE_PREFIX.length).split("-")[0]) || 0;
      const bTime = Number(b.pathname.slice(LEGACY_STATE_PREFIX.length).split("-")[0]) || 0;
      return bTime - aTime;
    })[0];
  }

  let home = emptyHome();
  if (stateBlob) {
    const response = await fetch(stateBlob.downloadUrl, { cache: "no-store" });
    if (response.ok) home = normalizeHome(await response.json());
  }

  const eventList = await list({ prefix: EVENT_PREFIX, limit: 1000 });
  const events = await Promise.all(eventList.blobs.map(async (blob) => {
    const response = await fetch(blob.downloadUrl, { cache: "force-cache" });
    return response.ok ? response.json() : null;
  }));

  events
    .filter(Boolean)
    .sort((a, b) => String(a.order || a.at).localeCompare(String(b.order || b.at)))
    .forEach((event) => {
      if (!["grocery", "household"].includes(event.collection)) return;
      if (event.type === "delete") {
        home[event.collection] = home[event.collection].filter((item) => item.id !== event.id);
        return;
      }
      if (event.type === "upsert" && event.item?.id) {
        home[event.collection] = [
          event.item,
          ...home[event.collection].filter((item) => item.id !== event.item.id),
        ];
      }
    });

  return home;
}

async function appendEvent(event) {
  const at = new Date().toISOString();
  const order = `${Date.now()}-${crypto.randomUUID()}`;
  await put(`${EVENT_PREFIX}${order}.json`, JSON.stringify({ ...event, at, order }), {
    access: "public",
    contentType: "application/json",
  });
}

function itemId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
}

async function savePhoto(file) {
  if (!file || typeof file === "string" || !file.size) return "";
  const filename = clean(file.name, 120) || "beweisfoto.jpg";
  const blob = await put(`pinnwand/fotos/${filename}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

async function removePhoto(photoUrl) {
  if (String(photoUrl || "").includes(".blob.vercel-storage.com/")) {
    await del(photoUrl);
  }
}

function pathParts(request) {
  const url = new URL(request.url);
  const rewrittenRoute = url.searchParams.get("route");
  if (rewrittenRoute) return rewrittenRoute.split("/").filter(Boolean);
  const pathname = url.pathname;
  return pathname.replace(/^\/api\/home\/?/, "").split("/").filter(Boolean);
}

async function createGrocery(request) {
  const payload = await request.json().catch(() => ({}));
  const name = clean(payload.name, 80);
  if (!name) return json({ error: "Bitte einen Artikel eintragen." }, 400);

  const item = {
    id: itemId("grocery"),
    name,
    amount: clean(payload.amount, 30),
    priority: ["wish", "needed", "kater"].includes(payload.priority) ? payload.priority : "wish",
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: "",
  };
  await appendEvent({ type: "upsert", collection: "grocery", item });
  return json(item, 201);
}

async function createHousehold(request) {
  const form = await request.formData();
  const task = clean(form.get("task"), 100);
  if (!task) return json({ error: "Bitte eine Aufgabe eintragen." }, 400);

  const item = {
    id: itemId("household"),
    task,
    room: clean(form.get("room"), 30) || "Unbekannter Tatort",
    tone: clean(form.get("tone"), 60) || "Kleine Erinnerung",
    photo: await savePhoto(form.get("photo")),
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: "",
  };
  await appendEvent({ type: "upsert", collection: "household", item });
  return json(item, 201);
}

async function updateItem(request, collection, id) {
  const payload = await request.json().catch(() => ({}));
  const suppliedItem = payload.item?.id === id ? payload.item : null;
  const home = suppliedItem ? null : await readHome();
  const item = suppliedItem || home[collection].find((entry) => entry.id === id);
  if (!item) return json({ error: "Eintrag nicht gefunden." }, 404);

  const updated = {
    ...item,
    done: Boolean(payload.done),
    completedAt: payload.done ? new Date().toISOString() : "",
  };
  await appendEvent({ type: "upsert", collection, item: updated });
  return json(updated);
}

async function deleteItem(request, collection, id) {
  const payload = await request.json().catch(() => ({}));
  if (collection === "household") await removePhoto(payload.photo);
  await appendEvent({ type: "delete", collection, id });
  return json({ ok: true });
}

export async function handleHomeRequest(request) {
  const parts = pathParts(request);

  try {
    if (request.method === "GET" && parts[0] === "events") {
      const body = `retry: 5000\nevent: homeUpdated\ndata: ${JSON.stringify(await readHome())}\n\n`;
      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-store",
        },
      });
    }

    if (request.method === "GET" && !parts.length) return json(await readHome());
    if (request.method === "POST" && parts[0] === "grocery" && !parts[1]) return createGrocery(request);
    if (request.method === "POST" && parts[0] === "household" && !parts[1]) return createHousehold(request);

    const collection = parts[0] === "grocery" ? "grocery" : parts[0] === "household" ? "household" : "";
    const id = decodeURIComponent(parts[1] || "");
    if (collection && id && request.method === "PATCH") return updateItem(request, collection, id);
    if (collection && id && request.method === "DELETE") return deleteItem(request, collection, id);

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    const missingStore = String(error?.message || "").includes("BLOB_READ_WRITE_TOKEN");
    return json({
      error: missingStore
        ? "Vercel Blob ist noch nicht mit diesem Projekt verbunden."
        : error?.message || "Vercel Function Fehler",
    }, 500);
  }
}
