import { getStore } from "@netlify/blobs";

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
  {
    id: "memory-sea-day",
    title: "Ein Tag am Wasser",
    date: "2025-05-18",
    place: "Hamburg",
    lat: 53.5511,
    lng: 9.9937,
    type: "photo",
    note: "Hier koennte ein Foto, eine kleine Notiz oder ein Screenshot aus einem Chat liegen.",
    tags: ["reise", "sommer"],
    files: [],
    createdAt: new Date().toISOString(),
  },
];

const knownPlaces = [
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Hamburg", lat: 53.5511, lng: 9.9937 },
  { name: "Muenchen", lat: 48.1372, lng: 11.5755 },
  { name: "Koeln", lat: 50.9375, lng: 6.9603 },
  { name: "Duesseldorf", lat: 51.2277, lng: 6.7735 },
  { name: "Frankfurt am Main", lat: 50.1109, lng: 8.6821 },
];

function json(data, status = 200) {
  return Response.json(data, { status });
}

function normalizeTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeDate(value) {
  if (!value) return "";
  const match = String(value).match(/(\d{4})[:-](\d{2})[:-](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function isImageFile(file) {
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.mime || file.type || "");
  return mime.startsWith("image/") || [".heic", ".heif", ".jpg", ".jpeg", ".png", ".webp"].some((ext) => name.endsWith(ext));
}

function mimeFromFilename(filename, fallback = "application/octet-stream") {
  const name = String(filename).toLowerCase();
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".txt")) return "text/plain; charset=utf-8";
  return fallback;
}

function extractBasicImageMetadata(buffer) {
  const text = Buffer.from(buffer).toString("utf8");
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
  const key = String(place || "").toLowerCase().trim();
  const places = {
    berlin: { lat: 52.52, lng: 13.405, label: "Berlin, Deutschland" },
    hamburg: { lat: 53.5511, lng: 9.9937, label: "Hamburg, Deutschland" },
    muenster: { lat: 51.9607, lng: 7.6261, label: "Muenster, Deutschland" },
    münster: { lat: 51.9607, lng: 7.6261, label: "Münster, Deutschland" },
    muenchen: { lat: 48.1372, lng: 11.5755, label: "Muenchen, Deutschland" },
    münchen: { lat: 48.1372, lng: 11.5755, label: "München, Deutschland" },
    koeln: { lat: 50.9375, lng: 6.9603, label: "Koeln, Deutschland" },
    köln: { lat: 50.9375, lng: 6.9603, label: "Köln, Deutschland" },
    duesseldorf: { lat: 51.2277, lng: 6.7735, label: "Duesseldorf, Deutschland" },
    düsseldorf: { lat: 51.2277, lng: 6.7735, label: "Düsseldorf, Deutschland" },
    frankfurt: { lat: 50.1109, lng: 8.6821, label: "Frankfurt am Main, Deutschland" },
  };
  return places[key] || null;
}

async function geocodePlace(place) {
  if (!place || place === "Unbekannter Ort") return null;
  const known = knownPlaceCoords(place);
  if (known) return { ...known, source: "known-place" };

  const cacheKey = String(place).toLowerCase().trim();
  const cacheStore = getStore("geocode-cache");
  const cached = await cacheStore.get(cacheKey, { type: "json" });
  if (cached) return cached;

  const query = /,/.test(place) ? place : `${place}, Deutschland`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "de");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "charleen-raoul-erinnerungen/1.0 (Netlify personal website)",
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
  await cacheStore.setJSON(cacheKey, result);
  return result;
}

async function readMemories() {
  const store = getStore("memory-data");
  const memories = await store.get("memories", { type: "json" });
  if (Array.isArray(memories)) return memories;
  await store.setJSON("memories", seedMemories);
  return seedMemories;
}

async function writeMemories(memories) {
  const store = getStore("memory-data");
  await store.setJSON("memories", memories);
}

function filterMemories(memories, url) {
  const query = String(url.searchParams.get("q") || "").toLowerCase();
  const type = String(url.searchParams.get("type") || "all");
  return memories
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

async function filesFromForm(form) {
  const filesStore = getStore("memory-files");
  const files = [];
  for (const file of form.getAll("files")) {
    if (!file || !file.name || file.size === 0) continue;
    const arrayBuffer = await file.arrayBuffer();
    const mime = mimeFromFilename(file.name, file.type);
    const key = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const metadata = isImageFile({ name: file.name, mime }) ? extractBasicImageMetadata(arrayBuffer) : {};

    await filesStore.set(key, arrayBuffer, {
      metadata: {
        name: file.name,
        mime,
      },
    });

    files.push({
      id: `file-${crypto.randomUUID()}`,
      name: file.name,
      url: `/api/file?key=${encodeURIComponent(key)}`,
      previewUrl: "",
      mime,
      size: file.size,
      metadata,
    });
  }
  return files;
}

async function buildMemory(fields, files) {
  const now = new Date().toISOString();
  const primaryImage = files.find(isImageFile);
  const imageMetadata = primaryImage?.metadata || {};
  const geocoded = (!fields.lat || !fields.lng) ? await geocodePlace(fields.place) : null;
  const lat = fields.lat ? Number(fields.lat) : geocoded?.lat ?? null;
  const lng = fields.lng ? Number(fields.lng) : geocoded?.lng ?? null;
  const date = fields.date || imageMetadata.date || now.slice(0, 10);
  const place = fields.place || inferPlace(lat, lng) || "Unbekannter Ort";
  const autoTags = [
    primaryImage ? "foto" : "",
    imageMetadata.format,
  ].filter(Boolean);
  const tags = Array.from(new Set([...normalizeTags(fields.tags), ...autoTags]));

  return {
    id: `memory-${crypto.randomUUID()}`,
    title: fields.title || `${place} · ${date}`,
    date,
    place,
    lat,
    lng,
    type: fields.type || (files.some(isImageFile) ? "photo" : "note"),
    note: fields.note || "",
    tags,
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

export default async (request) => {
  const url = new URL(request.url);

  if (request.method === "GET") {
    return json(filterMemories(await readMemories(), url));
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
    const files = await filesFromForm(form);
    const memories = await readMemories();
    const memory = await buildMemory(fields, files);
    memories.unshift(memory);
    await writeMemories(memories);
    return json(memory, 201);
  }

  return json({ error: "Method not allowed" }, 405);
};
