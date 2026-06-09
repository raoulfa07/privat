import { del, list, put } from "@vercel/blob";

const STATE_PREFIX = "pinnwand/status/";

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
  const result = await list({ prefix: STATE_PREFIX, limit: 1000 });
  const stateBlob = result.blobs.sort((a, b) => {
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  })[0];
  if (!stateBlob) return emptyHome();

  const response = await fetch(stateBlob.url, { cache: "no-store" });
  if (!response.ok) return emptyHome();
  return normalizeHome(await response.json());
}

async function writeHome(home) {
  const next = { ...home, updatedAt: new Date().toISOString() };
  await put(`${STATE_PREFIX}${Date.now()}-${crypto.randomUUID()}.json`, JSON.stringify(next), {
    access: "public",
    contentType: "application/json",
  });

  const storedStates = await list({ prefix: STATE_PREFIX, limit: 1000 });
  const obsoleteStates = storedStates.blobs
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(20)
    .map((blob) => blob.url);
  if (obsoleteStates.length) await del(obsoleteStates);

  return next;
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
  const pathname = new URL(request.url).pathname;
  return pathname.replace(/^\/api\/home\/?/, "").split("/").filter(Boolean);
}

async function createGrocery(request) {
  const payload = await request.json().catch(() => ({}));
  const name = clean(payload.name, 80);
  if (!name) return json({ error: "Bitte einen Artikel eintragen." }, 400);

  const home = await readHome();
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
  await writeHome(home);
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
  const home = await readHome();
  home.household.unshift(item);
  await writeHome(home);
  return json(item, 201);
}

async function updateItem(request, collection, id) {
  const payload = await request.json().catch(() => ({}));
  const home = await readHome();
  const item = home[collection].find((entry) => entry.id === id);
  if (!item) return json({ error: "Eintrag nicht gefunden." }, 404);

  item.done = Boolean(payload.done);
  item.completedAt = item.done ? new Date().toISOString() : "";
  await writeHome(home);
  return json(item);
}

async function deleteItem(collection, id) {
  const home = await readHome();
  const item = home[collection].find((entry) => entry.id === id);
  if (!item) return json({ error: "Eintrag nicht gefunden." }, 404);

  if (collection === "household") await removePhoto(item.photo);
  home[collection] = home[collection].filter((entry) => entry.id !== id);
  await writeHome(home);
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
    if (collection && id && request.method === "DELETE") return deleteItem(collection, id);

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
