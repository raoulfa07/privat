const GEMINI_MODEL = "gemini-2.5-flash";

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

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function readMemories(env) {
  if (!env.MEMORY_DATA) throw new Error("Cloudflare Binding fehlt: MEMORY_DATA");
  const memories = await env.MEMORY_DATA.get("memories", "json");
  if (Array.isArray(memories)) return memories;
  await env.MEMORY_DATA.put("memories", JSON.stringify(seedMemories));
  return seedMemories;
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

function fallbackAiSearch(question, memories, configured = false) {
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

  return {
    answer: scored.length
      ? `Ich habe ${scored.length} passende Erinnerung${scored.length === 1 ? "" : "en"} gefunden.`
      : "Ich habe noch keine passende Erinnerung gefunden. Versuche einen Ort, ein Datum, einen Tag oder ein Wort aus der Notiz.",
    memories: scored,
    source: "local",
    configured,
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

async function geminiAiSearch(env, question, memories) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return fallbackAiSearch(question, memories, false);

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
    const fallback = fallbackAiSearch(question, memories, true);
    fallback.warning = `Gemini war nicht erreichbar (${response.status}).`;
    return fallback;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const parsed = extractJsonObject(text);
  const ids = Array.isArray(parsed.memoryIds) ? parsed.memoryIds.slice(0, 8) : [];
  const byId = new Map(memories.map((memory) => [memory.id, memory]));
  const selected = ids.map((id) => byId.get(id)).filter(Boolean);
  const fallback = selected.length ? selected : fallbackAiSearch(question, memories, true).memories;

  return {
    answer: String(parsed.answer || "Ich habe passende Erinnerungen herausgesucht."),
    memories: fallback,
    source: "gemini",
    configured: true,
  };
}

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json().catch(() => ({}));
    const question = String(payload.question || "").trim();
    if (!question) return json({ error: "Bitte stelle eine Frage." }, 400);
    return json(await geminiAiSearch(env, question, await readMemories(env)));
  } catch (error) {
    return json({ error: error.message || "KI-Suche ist nicht erreichbar." }, 500);
  }
}
