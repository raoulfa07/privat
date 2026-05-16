import { getStore } from "@netlify/blobs";

export default async (request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return new Response("Missing file key", { status: 400 });

  const store = getStore("memory-files");
  const entry = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry || !entry.data) return new Response("File not found", { status: 404 });

  return new Response(entry.data, {
    headers: {
      "Content-Type": entry.metadata?.mime || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
