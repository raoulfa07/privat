const seedMemories = [
  {
    id: "memory-first-date",
    title: "Unser erstes kleines Abenteuer",
    date: "2024-07-12",
    place: "Berlin",
    lat: 52.52,
    lng: 13.405,
    type: "note",
    note: "Ein Beispiel-Eintrag. Ersetze ihn mit euren echten Momenten, Fotos, Chat-Screenshots und Orten.",
    tags: ["anfang", "lieblingsmoment"],
    files: [],
    createdAt: new Date().toISOString(),
  },
];

const knownPlaces = [
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Hamburg", lat: 53.5511, lng: 9.9937 },
  { name: "Muenster", lat: 51.9607, lng: 7.6261 },
  { name: "Münster", lat: 51.9607, lng: 7.6261 },
  { name: "Gent", lat: 51.0543, lng: 3.7174 },
  { name: "Ghent", lat: 51.0543, lng: 3.7174 },
];

function json(data, status = 200) {
  return Response.json(data, { status });
}

function requireBinding(env, name) {
  if (!env[name]) {
    throw new Error(`Cloudflare Binding fehlt: ${name}`);
  }
  return env[name];
}

function normalizeTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeDate(value) {
  const match = String(value || "").match(/(\d{4})[:-](\d{2})[:-](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function mimeFromFilename(filename, fallback = "application/octet-stream") {
  const name = String(filename || "").toLowerCase();
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".txt")) return "text/plain; charset=utf-8";
  return fallback;
}

function isImageFile(file) {
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.mime || file.type || "");
  return mime.startsWith("image/") || [".heic", ".heif", ".jpg", ".jpeg", ".png", ".webp"].some((ext) => name.endsWith(ext));
}

function extractBasicImageMetadata(arrayBuffer) {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  const createDate = text.match(/(?:xmp:CreateDate|photoshop:DateCreated)="([^"]+)"/);
  const metadata = {};
  if (createDate) {
    metadata.takenAt = createDate[1];
    metadata.date = normalizeDate(createDate[1]);
  }
  return metadata;
}

function inferPlace(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const nearest = knownPlaces
    .map((place) => ({ ...place, distance: Math.hypot(place.lat - lat, place.lng - lng) }))
    .sort((a, b) => a.distance - b.distance)[0];
  return nearest && nearest.distance < 0.45 ? nearest.name : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function knownPlaceCoords(place) {
  const key = String(place || "").toLowerCase().replace(/[,\s]+/g, " ").trim();
  const places = {
    berlin: { lat: 52.52, lng: 13.405, label: "Berlin, Deutschland" },
    hamburg: { lat: 53.5511, lng: 9.9937, label: "Hamburg, Deutschland" },
    muenster: { lat: 51.9607, lng: 7.6261, label: "Muenster, Deutschland" },
    münster: { lat: 51.9607, lng: 7.6261, label: "Münster, Deutschland" },
    gent: { lat: 51.0543, lng: 3.7174, label: "Gent, Belgien" },
    ghent: { lat: 51.0543, lng: 3.7174, label: "Ghent, Belgium" },
    "gent belgien": { lat: 51.0543, lng: 3.7174, label: "Gent, Belgien" },
    "gent belgium": { lat: 51.0543, lng: 3.7174, label: "Gent, Belgien" },
  };
  return places[key] || null;
}

async function readMemories(env) {
  const kv = requireBinding(env, "MEMORY_DATA");
  const memories = await kv.get("memories", "json");
  if (Array.isArray(memories)) return memories;
  await kv.put("memories", JSON.stringify(seedMemories));
  return seedMemories;
}

async function writeMemories(env, memories) {
  const kv = requireBinding(env, "MEMORY_DATA");
  await kv.put("memories", JSON.stringify(memories));
}

async function geocodePlace(env, place) {
  if (!place || place === "Unbekannter Ort") return null;
  const known = knownPlaceCoords(place);
  if (known) return { ...known, source: "known-place" };

  const kv = requireBinding(env, "MEMORY_DATA");
  const cacheKey = `geocode:${String(place).toLowerCase().trim()}`;
  const cached = await kv.get(cacheKey, "json");
  if (cached) return cached;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "de");
  url.searchParams.set("q", String(place).trim());

  const response = await fetch(url, {
    headers: {
      "User-Agent": "charleen-raoul-erinnerungen/1.0 (Cloudflare Pages personal website)",
      "Accept": "application/json",
    },
  });
  if (!response.ok) return null;
  const results = await response.json();
  const first = results[0];
  if (!first) return null;

  const result = {
    lat: Number(first.lat),
    lng: Number(first.lon),
    label: first.display_name,
    source: "nominatim",
  };
  await kv.put(cacheKey, JSON.stringify(result));
  return result;
}

function correctKnownPlaceCoordinates(memory) {
  const known = knownPlaceCoords(memory.place);
  if (!known) return memory;
  const hasCorrectCoords = Math.abs(Number(memory.lat) - known.lat) < 0.02 && Math.abs(Number(memory.lng) - known.lng) < 0.02;
  if (hasCorrectCoords) return memory;
  return {
    ...memory,
    lat: known.lat,
    lng: known.lng,
    metadata: {
      ...(memory.metadata || {}),
      geocoding: {
        label: known.label,
        source: "known-place",
      },
    },
  };
}

function filterMemories(memories, url) {
  const query = String(url.searchParams.get("q") || "").toLowerCase();
  const type = String(url.searchParams.get("type") || "all");
  return memories
    .map(correctKnownPlaceCoordinates)
    .filter((memory) => {
      const haystack = [
        memory.title,
        memory.place,
        memory.date,
        memory.note,
        memory.metadata?.camera,
        memory.metadata?.takenAt,
        ...(memory.tags || []),
        ...(memory.files || []).map((file) => file.name),
      ].join(" ").toLowerCase();
      return (!query || haystack.includes(query)) && (type === "all" || memory.type === type);
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function storeFormFile(env, file) {
  const bucket = requireBinding(env, "MEMORY_FILES");
  const arrayBuffer = await file.arrayBuffer();
  const mime = mimeFromFilename(file.name, file.type);
  const key = `${Date.now()}-${crypto.randomUUID()}-${String(file.name).replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const metadata = isImageFile({ name: file.name, mime }) ? extractBasicImageMetadata(arrayBuffer) : {};

  await bucket.put(key, arrayBuffer, {
    httpMetadata: { contentType: mime },
    customMetadata: {
      name: file.name,
      mime,
    },
  });

  return {
    id: `file-${crypto.randomUUID()}`,
    key,
    name: file.name,
    url: `/api/file?key=${encodeURIComponent(key)}`,
    previewUrl: "",
    previewKey: "",
    mime,
    size: file.size,
    metadata,
  };
}

async function filesFromForm(env, form) {
  const files = [];
  for (const file of form.getAll("files")) {
    if (!file || !file.name || file.size === 0) continue;
    files.push(await storeFormFile(env, file));
  }

  const previews = [];
  for (const file of form.getAll("previews")) {
    if (!file || !file.name || file.size === 0) continue;
    previews.push(await storeFormFile(env, file));
  }

  const previewByIndex = new Map();
  previews.forEach((preview) => {
    const match = String(preview.name || "").match(/^preview-(\d+)-/);
    if (match) previewByIndex.set(Number(match[1]), preview);
  });

  let sequentialPreviewIndex = 0;
  files.forEach((file, index) => {
    const preview = previewByIndex.get(index) || previews[sequentialPreviewIndex];
    sequentialPreviewIndex += 1;
    if (!preview) return;
    file.previewUrl = preview.url;
    file.previewKey = preview.key;
  });

  return files;
}

async function deleteMemory(env, id) {
  const memories = await readMemories(env);
  const memory = memories.find((item) => item.id === id);
  if (!memory) return null;

  const bucket = requireBinding(env, "MEMORY_FILES");
  for (const file of memory.files || []) {
    const keys = [file.key, file.previewKey].filter(Boolean);
    for (const key of new Set(keys)) await bucket.delete(key);
  }

  await writeMemories(env, memories.filter((item) => item.id !== id));
  return memory;
}

async function updateMemory(env, id, fields) {
  const memories = await readMemories(env);
  const index = memories.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const existing = memories[index];
  const nextPlace = fields.place ?? existing.place ?? "";
  const hasLat = fields.lat !== undefined && fields.lat !== "";
  const hasLng = fields.lng !== undefined && fields.lng !== "";
  const geocoded = (!hasLat || !hasLng) && nextPlace !== existing.place ? await geocodePlace(env, nextPlace) : null;
  const updated = {
    ...existing,
    title: fields.title ?? existing.title,
    date: normalizeDate(fields.date) || fields.date || existing.date,
    place: nextPlace,
    type: fields.type ?? existing.type,
    note: fields.note ?? existing.note,
    tags: fields.tags !== undefined ? normalizeTags(fields.tags) : existing.tags,
    lat: hasLat ? Number(fields.lat) : geocoded?.lat ?? existing.lat,
    lng: hasLng ? Number(fields.lng) : geocoded?.lng ?? existing.lng,
    metadata: {
      ...(existing.metadata || {}),
      geocoding: geocoded ? {
        label: geocoded.label,
        source: geocoded.source,
      } : existing.metadata?.geocoding || null,
    },
    updatedAt: new Date().toISOString(),
  };
  memories[index] = updated;
  await writeMemories(env, memories);
  return updated;
}

async function buildMemory(env, fields, files) {
  const now = new Date().toISOString();
  const primaryImage = files.find(isImageFile);
  const imageMetadata = primaryImage?.metadata || {};
  const geocoded = (!fields.lat || !fields.lng) ? await geocodePlace(env, fields.place) : null;
  const lat = fields.lat ? Number(fields.lat) : geocoded?.lat ?? null;
  const lng = fields.lng ? Number(fields.lng) : geocoded?.lng ?? null;
  const date = fields.date || imageMetadata.date || now.slice(0, 10);
  const place = fields.place || inferPlace(lat, lng) || "Unbekannter Ort";
  const autoTags = [primaryImage ? "foto" : "", imageMetadata.format].filter(Boolean);

  return {
    id: `memory-${crypto.randomUUID()}`,
    title: fields.title || `${place} · ${date}`,
    date,
    place,
    lat,
    lng,
    type: fields.type || (files.some(isImageFile) ? "photo" : "note"),
    note: fields.note || "",
    tags: Array.from(new Set([...normalizeTags(fields.tags), ...autoTags])),
    files,
    metadata: {
      source: primaryImage ? "image" : "manual",
      takenAt: imageMetadata.takenAt || "",
      camera: "",
      dimensions: null,
      geocoding: geocoded ? {
        label: geocoded.label,
        source: geocoded.source,
      } : null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  try {
    if (request.method === "GET") {
      return json(filterMemories(await readMemories(env), url));
    }

    const pathParam = context.params.path || "";
    const pathId = Array.isArray(pathParam) ? pathParam.join("/") : pathParam;
    const deleteId = url.searchParams.get("id") || pathId;
    if (request.method === "DELETE" && deleteId) {
      const memory = await deleteMemory(env, decodeURIComponent(deleteId));
      if (!memory) return json({ error: "Erinnerung nicht gefunden" }, 404);
      return json({ ok: true, id: memory.id });
    }

    if (request.method === "PUT" && deleteId) {
      const fields = await request.json().catch(() => ({}));
      const memory = await updateMemory(env, decodeURIComponent(deleteId), fields);
      if (!memory) return json({ error: "Erinnerung nicht gefunden" }, 404);
      return json(memory);
    }

    if (request.method === "POST") {
      const form = await request.formData();
      const fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
      const files = await filesFromForm(env, form);
      const memories = await readMemories(env);
      const memory = await buildMemory(env, fields, files);
      memories.unshift(memory);
      await writeMemories(env, memories);
      return json(memory, 201);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    return json({ error: error.message || "Cloudflare Function Fehler" }, 500);
  }
}
