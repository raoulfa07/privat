const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(rootDir, "data");
const uploadDir = path.join(publicDir, "uploads");
const dbPath = path.join(dataDir, "memories.json");
const clients = new Set();

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
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify(seedMemories, null, 2));
}

function readMemories() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeMemories(memories) {
  fs.writeFileSync(dbPath, JSON.stringify(memories, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
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
      files.push({
        id: `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: filename,
        url: `/uploads/${storedName}`,
        previewUrl: "",
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

function buildMemory(fields, files) {
  const now = new Date().toISOString();
  const primaryImage = files.find(isImageFile);
  const imageMetadata = primaryImage?.metadata || {};
  const date = fields.date || imageMetadata.date || now.slice(0, 10);
  const place = fields.place || "Unbekannter Ort";

  return {
    id: `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: fields.title || `${place} · ${date}`,
    date,
    place,
    lat: fields.lat ? Number(fields.lat) : null,
    lng: fields.lng ? Number(fields.lng) : null,
    type: fields.type || (files.some(isImageFile) ? "photo" : "note"),
    note: fields.note || "",
    tags: Array.from(new Set([...normalizeTags(fields.tags), ...(primaryImage ? ["foto"] : [])])),
    files,
    metadata: {
      source: primaryImage ? "image" : "manual",
      takenAt: imageMetadata.takenAt || "",
      camera: "",
      dimensions: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function getFilteredMemories(url) {
  const query = String(url.searchParams.get("q") || "").toLowerCase();
  const type = String(url.searchParams.get("type") || "all");
  return readMemories()
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
      const memory = buildMemory(fields, files);
      memories.unshift(memory);
      writeMemories(memories);
      broadcast("memoriesUpdated", memories);
      return sendJson(res, 201, memory);
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
