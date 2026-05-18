function json(data, status = 200) {
  return Response.json(data, { status });
}

export async function onRequestGet({ request, env }) {
  if (!env.MEMORY_FILES) return json({ error: "Cloudflare Binding fehlt: MEMORY_FILES" }, 500);

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return new Response("Missing file key", { status: 400 });

  const object = await env.MEMORY_FILES.get(key);
  if (!object) return new Response("File not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || object.customMetadata?.mime || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
