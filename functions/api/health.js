export async function onRequestGet({ env }) {
  const checks = {
    functions: true,
    memoryDataBinding: Boolean(env.MEMORY_DATA),
    memoryFilesBinding: Boolean(env.MEMORY_FILES),
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
  };

  const missing = [];
  if (!checks.memoryDataBinding) missing.push("MEMORY_DATA");
  if (!checks.memoryFilesBinding) missing.push("MEMORY_FILES");

  return Response.json({
    ok: missing.length === 0,
    checks,
    missing,
    message: missing.length
      ? `Cloudflare Binding fehlt: ${missing.join(", ")}`
      : "Cloudflare Functions und Speicher-Bindings sind erreichbar.",
  }, {
    status: missing.length ? 500 : 200,
  });
}
