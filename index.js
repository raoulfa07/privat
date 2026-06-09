const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { URL } = require("url");

const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(publicDir, "uploads");
const previewDir = path.join(uploadDir, "previews");
const homeUploadDir = path.join(uploadDir, "home");
const dbPath = path.join(dataDir, "memories.json");
const homeDbPath = path.join(dataDir, "home.json");
const geocodeCachePath = path.join(dataDir, "geocode-cache.json");
const clients = new Set();
const homeClients = new Set();
const GEMINI_MODEL = "gemini-2.5-flash";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

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

function ensureStorage() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });
  fs.mkdirSync(homeUploadDir, { recursive: true });
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify(seedMemories, null, 2));
  if (!fs.existsSync(homeDbPath)) {
    fs.writeFileSync(homeDbPath, JSON.stringify({ grocery: [], household: [], gallery: [], updatedAt: new Date().toISOString() }, null, 2));
  }
}

function readMemories() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeMemories(memories) {
  fs.writeFileSync(dbPath, JSON.stringify(memories, null, 2));
}

function readHome() {
  ensureStorage();
  const value = JSON.parse(fs.readFileSync(homeDbPath, "utf8"));
  return {
    grocery: Array.isArray(value.grocery) ? value.grocery : [],
    household: Array.isArray(value.household) ? value.household : [],
    gallery: Array.isArray(value.gallery) ? value.gallery : [],
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function writeHome(home) {
  const next = { ...home, updatedAt: new Date().toISOString() };
  fs.writeFileSync(homeDbPath, JSON.stringify(next, null, 2));
  broadcastTo(homeClients, "homeUpdated", next);
  return next;
}

function readGeocodeCache() {
  if (!fs.existsSync(geocodeCachePath)) return {};
  return JSON.parse(fs.readFileSync(geocodeCachePath, "utf8"));
}

function writeGeocodeCache(cache) {
  fs.writeFileSync(geocodeCachePath, JSON.stringify(cache, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function broadcastTo(targets, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of targets) res.write(payload);
}

function broadcast(event, data) {
  broadcastTo(clients, event, data);
}

function sanitizeHomeItem(value, max = 100) {
  return String(value || "").trim().slice(0, max);
}

function deleteHomeUpload(fileUrl) {
  if (!String(fileUrl || "").startsWith("/uploads/home/")) return;
  const filePath = path.normalize(path.join(publicDir, decodeURIComponent(String(fileUrl).replace(/^\/+/, ""))));
  if (!filePath.startsWith(homeUploadDir)) return;
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function moveFileToHome(file) {
  if (!file?.url?.startsWith("/uploads/")) return "";
  const sourcePath = path.join(publicDir, file.url.replace(/^\/+/, ""));
  if (!fs.existsSync(sourcePath)) return "";
  const filename = path.basename(sourcePath);
  const targetPath = path.join(homeUploadDir, filename);
  fs.renameSync(sourcePath, targetPath);
  return `/uploads/home/${filename}`;
}

async function reverseGeocodeHome(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", latitude);
    url.searchParams.set("lon", longitude);
    url.searchParams.set("zoom", "12");
    url.searchParams.set("accept-language", "de");
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "charleen-raoul-fotowand/1.0",
      },
    });
    if (!response.ok) return "";
    const result = await response.json();
    const address = result.address || {};
    return sanitizeHomeItem(
      address.city || address.town || address.village || address.municipality || address.county || result.display_name,
      100,
    );
  } catch {
    return "";
  }
}

function collectBody(req, limit = 80 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Dateien sind zu gross"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
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
  return mimeTypes[path.extname(filename).toLowerCase()] || fallback;
}

function isImageFile(file) {
  const mime = String(file.mime || "");
  const ext = path.extname(file.name || "").toLowerCase();
  return mime.startsWith("image/") || [".heic", ".heif", ".jpg", ".jpeg", ".png", ".webp"].includes(ext);
}

function knownPlaceCoords(place) {
  const key = String(place || "").toLowerCase().replace(/[,\s]+/g, " ").trim();
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
    gent: { lat: 51.0543, lng: 3.7174, label: "Gent, Belgien" },
    ghent: { lat: 51.0543, lng: 3.7174, label: "Ghent, Belgium" },
    "gent belgien": { lat: 51.0543, lng: 3.7174, label: "Gent, Belgien" },
    "gent belgium": { lat: 51.0543, lng: 3.7174, label: "Gent, Belgien" },
  };
  return places[key] || null;
}

async function geocodePlace(place) {
  if (!place || place === "Unbekannter Ort") return null;
  const known = knownPlaceCoords(place);
  if (known) return { ...known, source: "known-place" };

  const cacheKey = String(place).toLowerCase().trim();
  const cache = readGeocodeCache();
  if (cache[cacheKey]) return cache[cacheKey];

  const query = String(place).trim();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "de");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "charleen-raoul-erinnerungen/1.0 (local personal website)",
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
  cache[cacheKey] = result;
  writeGeocodeCache(cache);
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
        source: known.source || "known-place",
      },
    },
  };
}

function extractBasicImageMetadata(filePath) {
  const text = fs.readFileSync(filePath).toString("utf8");
  const createDate = text.match(/(?:xmp:CreateDate|photoshop:DateCreated)="([^"]+)"/);
  const metadata = {};
  if (createDate) {
    metadata.takenAt = createDate[1];
    metadata.date = normalizeDate(createDate[1]);
  }
  return metadata;
}

function createLocalPreview(filePath, storedName) {
  const ext = path.extname(storedName).toLowerCase();
  if (![".heic", ".heif"].includes(ext)) return "";

  const previewName = `${path.basename(storedName, ext)}.jpg`;
  const previewPath = path.join(previewDir, previewName);
  const result = spawnSync("sips", ["-s", "format", "jpeg", filePath, "--out", previewPath], { encoding: "utf8" });
  if (result.status !== 0 || !fs.existsSync(previewPath)) return "";
  return `/uploads/previews/${previewName}`;
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return { fields: {}, files: [] };
  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const parts = buffer.toString("binary").split(boundary).slice(1, -1);
  const fields = {};
  const files = [];

  for (const part of parts) {
    const cleanPart = part.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const splitIndex = cleanPart.indexOf("\r\n\r\n");
    if (splitIndex === -1) continue;
    const rawHeaders = cleanPart.slice(0, splitIndex);
    const bodyBinary = cleanPart.slice(splitIndex + 4);
    const disposition = rawHeaders.match(/content-disposition:[^\r\n]+/i)?.[0] || "";
    const name = disposition.match(/name="([^"]+)"/)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    const rawMime = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1] || "application/octet-stream";
    if (!name) continue;

    if (filename) {
      if (!bodyBinary.length) continue;
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storedName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
      const filePath = path.join(uploadDir, storedName);
      const fileBuffer = Buffer.from(bodyBinary, "binary");
      const mime = mimeFromFilename(filename, rawMime);
      fs.writeFileSync(filePath, fileBuffer);
      const metadata = isImageFile({ name: filename, mime }) ? extractBasicImageMetadata(filePath) : {};
      const previewUrl = isImageFile({ name: filename, mime }) ? createLocalPreview(filePath, storedName) : "";
      files.push({
        id: `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        fieldName: name,
        name: filename,
        url: `/uploads/${storedName}`,
        previewUrl,
        mime,
        size: fileBuffer.length,
        metadata,
      });
    } else {
      fields[name] = Buffer.from(bodyBinary, "binary").toString("utf8");
    }
  }

  return { fields, files };
}

async function buildMemory(fields, files) {
  const now = new Date().toISOString();
  const memoryFiles = files.filter((file) => file.fieldName !== "previews");
  const previewFiles = files.filter((file) => file.fieldName === "previews");
  const previewByIndex = new Map();
  previewFiles.forEach((preview) => {
    const match = String(preview.name || "").match(/^preview-(\d+)-/);
    if (match) previewByIndex.set(Number(match[1]), preview);
  });
  let sequentialPreviewIndex = 0;
  memoryFiles.forEach((file, index) => {
    if (!isImageFile(file) || file.previewUrl) return;
    const preview = previewByIndex.get(index) || previewFiles[sequentialPreviewIndex];
    sequentialPreviewIndex += 1;
    if (preview) file.previewUrl = preview.url;
  });

  const primaryImage = memoryFiles.find(isImageFile);
  const imageMetadata = primaryImage?.metadata || {};
  const geocoded = (!fields.lat || !fields.lng) ? await geocodePlace(fields.place) : null;
  const date = fields.date || imageMetadata.date || now.slice(0, 10);
  const place = fields.place || "Unbekannter Ort";
  const lat = fields.lat ? Number(fields.lat) : geocoded?.lat ?? null;
  const lng = fields.lng ? Number(fields.lng) : geocoded?.lng ?? null;

  return {
    id: `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: fields.title || `${place} · ${date}`,
    date,
    place,
    lat,
    lng,
    type: fields.type || (memoryFiles.some(isImageFile) ? "photo" : "note"),
    note: fields.note || "",
    tags: Array.from(new Set([...normalizeTags(fields.tags), ...(primaryImage ? ["foto"] : [])])),
    files: memoryFiles.map(({ fieldName, ...file }) => file),
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

function deleteLocalUpload(fileUrl) {
  if (!fileUrl || !String(fileUrl).startsWith("/uploads/")) return;
  const relativePath = decodeURIComponent(String(fileUrl).replace(/^\/+/, ""));
  const filePath = path.normalize(path.join(publicDir, relativePath));
  if (!filePath.startsWith(uploadDir)) return;
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function deleteMemory(id) {
  const memories = readMemories();
  const memory = memories.find((item) => item.id === id);
  if (!memory) return null;
  const remaining = memories.filter((item) => item.id !== id);
  for (const file of memory.files || []) {
    deleteLocalUpload(file.url);
    deleteLocalUpload(file.previewUrl);
  }
  writeMemories(remaining);
  broadcast("memoriesUpdated", remaining);
  return memory;
}

async function updateMemory(id, fields) {
  const memories = readMemories();
  const index = memories.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const existing = memories[index];
  const nextPlace = fields.place ?? existing.place ?? "";
  const hasLat = fields.lat !== undefined && fields.lat !== "";
  const hasLng = fields.lng !== undefined && fields.lng !== "";
  const geocoded = (!hasLat || !hasLng) && nextPlace !== existing.place ? await geocodePlace(nextPlace) : null;
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
  writeMemories(memories);
  broadcast("memoriesUpdated", memories);
  return updated;
}

function getFilteredMemories(url) {
  const query = String(url.searchParams.get("q") || "").toLowerCase();
  const type = String(url.searchParams.get("type") || "all");
  return readMemories()
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

function memorySearchText(memory) {
  return [
    memory.title,
    memory.place,
    memory.date,
    memory.note,
    memory.metadata?.camera,
    memory.metadata?.takenAt,
    memory.metadata?.ai?.summary,
    ...(memory.tags || []),
    ...(memory.files || []).map((file) => file.name),
  ].join(" ").toLowerCase();
}

function summarizeMemory(memory) {
  return {
    id: memory.id,
    title: memory.title || "",
    date: memory.date || "",
    place: memory.place || "",
    type: memory.type || "",
    note: memory.note || "",
    tags: memory.tags || [],
    files: (memory.files || []).map((file) => ({
      name: file.name,
      mime: file.mime,
    })),
  };
}

function fallbackAiSearch(question, memories) {
  const terms = String(question || "")
    .toLowerCase()
    .split(/[\s,.;:!?()]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  const scored = memories
    .map((memory) => {
      const text = memorySearchText(memory);
      const score = terms.reduce((sum, term) => sum + (text.includes(term) ? 2 : 0), 0);
      return { memory, score };
    })
    .filter((item) => item.score > 0 || !terms.length)
    .sort((a, b) => b.score - a.score || String(b.memory.date).localeCompare(String(a.memory.date)))
    .slice(0, 6)
    .map((item) => item.memory);

  const answer = scored.length
    ? `Ich habe ${scored.length} passende Erinnerung${scored.length === 1 ? "" : "en"} gefunden. Ohne Gemini-Key nutze ich gerade die lokale Suche nach Orten, Daten, Notizen, Tags und Dateinamen.`
    : "Ich habe noch keine passende Erinnerung gefunden. Versuche einen Ort, ein Datum, einen Tag oder ein Wort aus der Notiz.";

  return {
    answer,
    memories: scored,
    source: "local",
    configured: Boolean(process.env.GEMINI_API_KEY),
  };
}

function extractJsonObject(text) {
  const clean = String(text || "").trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini-Antwort war kein JSON");
    return JSON.parse(match[0]);
  }
}

async function geminiAiSearch(question, memories) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackAiSearch(question, memories);

  const candidates = memories
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 80)
    .map(summarizeMemory);

  const prompt = [
    "Du bist die Such-KI fuer eine private Jahrestags-Webseite von Charleen und Raoul.",
    "Nutze ausschliesslich die folgenden Erinnerungs-Metadaten. Erfinde keine Erinnerungen.",
    "Antworte warm, kurz und konkret auf Deutsch.",
    "Gib ausschliesslich valides JSON im Format {\"answer\":\"...\",\"memoryIds\":[\"...\"]} zurueck.",
    `Frage: ${question}`,
    `Erinnerungen: ${JSON.stringify(candidates)}`,
  ].join("\n\n");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: "Du findest passende Erinnerungen in privaten Metadaten und antwortest nur als JSON." }],
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const fallback = fallbackAiSearch(question, memories);
    fallback.warning = `Gemini war nicht erreichbar (${response.status}).`;
    return fallback;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const parsed = extractJsonObject(text);
  const ids = Array.isArray(parsed.memoryIds) ? parsed.memoryIds.slice(0, 8) : [];
  const byId = new Map(memories.map((memory) => [memory.id, memory]));
  const selected = ids.map((id) => byId.get(id)).filter(Boolean);
  const fallback = selected.length ? selected : fallbackAiSearch(question, memories).memories;

  return {
    answer: String(parsed.answer || "Ich habe passende Erinnerungen herausgesucht."),
    memories: fallback,
    source: "gemini",
    configured: true,
  };
}

function serveStatic(url, res) {
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) return sendJson(res, 403, { error: "Verboten" });
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: "Nicht gefunden" });
  }
  res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

ensureStorage();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/home/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`event: homeUpdated\ndata: ${JSON.stringify(readHome())}\n\n`);
      homeClients.add(res);
      req.on("close", () => homeClients.delete(res));
      return;
    }

    if (url.pathname === "/api/home" && req.method === "GET") {
      return sendJson(res, 200, readHome());
    }

    if (url.pathname === "/api/home/grocery" && req.method === "POST") {
      const body = await collectBody(req, 128 * 1024);
      const payload = body.length ? JSON.parse(body.toString("utf8")) : {};
      const name = sanitizeHomeItem(payload.name, 80);
      if (!name) return sendJson(res, 400, { error: "Bitte einen Artikel eintragen." });
      const home = readHome();
      const item = {
        id: `grocery-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        name,
        amount: sanitizeHomeItem(payload.amount, 30),
        priority: ["wish", "needed", "kater"].includes(payload.priority) ? payload.priority : "wish",
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: "",
      };
      home.grocery.unshift(item);
      writeHome(home);
      return sendJson(res, 201, item);
    }

    const groceryMatch = url.pathname.match(/^\/api\/home\/grocery\/([^/]+)$/);
    if (groceryMatch && req.method === "PATCH") {
      const body = await collectBody(req, 128 * 1024);
      const payload = body.length ? JSON.parse(body.toString("utf8")) : {};
      const home = readHome();
      const item = home.grocery.find((entry) => entry.id === decodeURIComponent(groceryMatch[1]));
      if (!item) return sendJson(res, 404, { error: "Artikel nicht gefunden." });
      item.done = Boolean(payload.done);
      item.completedAt = item.done ? new Date().toISOString() : "";
      writeHome(home);
      return sendJson(res, 200, item);
    }

    if (groceryMatch && req.method === "DELETE") {
      const home = readHome();
      const id = decodeURIComponent(groceryMatch[1]);
      if (!home.grocery.some((entry) => entry.id === id)) return sendJson(res, 404, { error: "Artikel nicht gefunden." });
      home.grocery = home.grocery.filter((entry) => entry.id !== id);
      writeHome(home);
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname === "/api/home/household" && req.method === "POST") {
      const body = await collectBody(req, 12 * 1024 * 1024);
      const { fields, files } = parseMultipart(body, req.headers["content-type"] || "");
      const task = sanitizeHomeItem(fields.task, 100);
      if (!task) return sendJson(res, 400, { error: "Bitte eine Aufgabe eintragen." });
      const photo = files.find((file) => file.fieldName === "photo");
      const home = readHome();
      const item = {
        id: `household-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        task,
        room: sanitizeHomeItem(fields.room, 30) || "Unbekannter Tatort",
        tone: sanitizeHomeItem(fields.tone, 60) || "Kleine Erinnerung",
        photo: moveFileToHome(photo),
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: "",
      };
      home.household.unshift(item);
      writeHome(home);
      return sendJson(res, 201, item);
    }

    const householdMatch = url.pathname.match(/^\/api\/home\/household\/([^/]+)$/);
    if (householdMatch && req.method === "PATCH") {
      const body = await collectBody(req, 128 * 1024);
      const payload = body.length ? JSON.parse(body.toString("utf8")) : {};
      const home = readHome();
      const item = home.household.find((entry) => entry.id === decodeURIComponent(householdMatch[1]));
      if (!item) return sendJson(res, 404, { error: "Fundstück nicht gefunden." });
      item.done = Boolean(payload.done);
      item.completedAt = item.done ? new Date().toISOString() : "";
      writeHome(home);
      return sendJson(res, 200, item);
    }

    if (householdMatch && req.method === "DELETE") {
      const home = readHome();
      const id = decodeURIComponent(householdMatch[1]);
      const item = home.household.find((entry) => entry.id === id);
      if (!item) return sendJson(res, 404, { error: "Fundstück nicht gefunden." });
      deleteHomeUpload(item.photo);
      home.household = home.household.filter((entry) => entry.id !== id);
      writeHome(home);
      return sendJson(res, 200, { ok: true });
    }

    if (url.pathname === "/api/home/gallery" && req.method === "POST") {
      const body = await collectBody(req, 12 * 1024 * 1024);
      const { fields, files } = parseMultipart(body, req.headers["content-type"] || "");
      const photo = files.find((file) => file.fieldName === "photo");
      if (!photo) return sendJson(res, 400, { error: "Bitte ein Foto auswählen." });

      const latitudeValue = sanitizeHomeItem(fields.latitude, 30);
      const longitudeValue = sanitizeHomeItem(fields.longitude, 30);
      const latitude = Number(latitudeValue);
      const longitude = Number(longitudeValue);
      const hasCoordinates = Boolean(latitudeValue && longitudeValue)
        && Number.isFinite(latitude) && Number.isFinite(longitude)
        && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
      const parsedDate = new Date(sanitizeHomeItem(fields.takenAt, 40));
      const locationHint = sanitizeHomeItem(fields.locationHint, 100);
      const location = hasCoordinates ? await reverseGeocodeHome(latitude, longitude) : locationHint;
      const home = readHome();
      const item = {
        id: `gallery-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        photo: moveFileToHome(photo),
        caption: sanitizeHomeItem(fields.caption, 140),
        takenAt: Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString(),
        location: location || locationHint || (hasCoordinates ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : ""),
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null,
        metadataSource: sanitizeHomeItem(fields.metadataSource, 20) || "file",
        originalName: sanitizeHomeItem(fields.originalName, 140),
        createdAt: new Date().toISOString(),
      };
      home.gallery.unshift(item);
      writeHome(home);
      return sendJson(res, 201, item);
    }

    const galleryMatch = url.pathname.match(/^\/api\/home\/gallery\/([^/]+)$/);
    if (galleryMatch && req.method === "PATCH") {
      const body = await collectBody(req, 256 * 1024);
      const payload = body.length ? JSON.parse(body.toString("utf8")) : {};
      const home = readHome();
      const item = home.gallery.find((entry) => entry.id === decodeURIComponent(galleryMatch[1]));
      if (!item) return sendJson(res, 404, { error: "Foto nicht gefunden." });
      const parsedDate = new Date(payload.takenAt || "");
      item.caption = sanitizeHomeItem(payload.caption, 140);
      item.location = sanitizeHomeItem(payload.location, 100);
      if (!Number.isNaN(parsedDate.getTime())) item.takenAt = parsedDate.toISOString();
      writeHome(home);
      return sendJson(res, 200, item);
    }

    if (galleryMatch && req.method === "DELETE") {
      const home = readHome();
      const id = decodeURIComponent(galleryMatch[1]);
      const item = home.gallery.find((entry) => entry.id === id);
      if (!item) return sendJson(res, 404, { error: "Foto nicht gefunden." });
      deleteHomeUpload(item.photo);
      home.gallery = home.gallery.filter((entry) => entry.id !== id);
      writeHome(home);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`event: init\ndata: ${JSON.stringify(readMemories())}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (url.pathname === "/api/memories" && req.method === "GET") {
      return sendJson(res, 200, getFilteredMemories(url));
    }

    if (url.pathname === "/api/memories" && req.method === "POST") {
      const body = await collectBody(req);
      const { fields, files } = parseMultipart(body, req.headers["content-type"] || "");
      const memories = readMemories();
      const memory = await buildMemory(fields, files);
      memories.unshift(memory);
      writeMemories(memories);
      broadcast("memoriesUpdated", memories);
      return sendJson(res, 201, memory);
    }

    const memoryDeleteMatch = url.pathname.match(/^\/api\/memories\/([^/]+)$/);
    if ((memoryDeleteMatch || url.searchParams.get("id")) && req.method === "DELETE") {
      const id = decodeURIComponent(memoryDeleteMatch?.[1] || url.searchParams.get("id"));
      const memory = deleteMemory(id);
      if (!memory) return sendJson(res, 404, { error: "Erinnerung nicht gefunden" });
      return sendJson(res, 200, { ok: true, id: memory.id });
    }

    if (memoryDeleteMatch && req.method === "PUT") {
      const id = decodeURIComponent(memoryDeleteMatch[1]);
      const body = await collectBody(req, 1024 * 1024);
      const fields = body.length ? JSON.parse(body.toString("utf8")) : {};
      const memory = await updateMemory(id, fields);
      if (!memory) return sendJson(res, 404, { error: "Erinnerung nicht gefunden" });
      return sendJson(res, 200, memory);
    }

    if (url.pathname === "/api/ai-search" && req.method === "POST") {
      const body = await collectBody(req, 1024 * 1024);
      const payload = body.length ? JSON.parse(body.toString("utf8")) : {};
      const question = String(payload.question || "").trim();
      if (!question) return sendJson(res, 400, { error: "Bitte stelle eine Frage." });
      return sendJson(res, 200, await geminiAiSearch(question, readMemories()));
    }

    return serveStatic(url, res);
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\nCharleen & Raoul Erinnerungen laufen auf http://localhost:${PORT}`);
  console.log(`Projektordner: ${rootDir}\n`);
});

process.on("SIGINT", () => {
  console.log("\nErinnerungsseite wird beendet...");
  server.close(() => process.exit(0));
});
