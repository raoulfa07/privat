import memories from "./memories.mjs";

export default async (request) => {
  const response = await memories(new Request(new URL("/api/memories", request.url), { method: "GET" }));
  const data = await response.json();
  return new Response(`event: init\ndata: ${JSON.stringify(data)}\n\n`, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
