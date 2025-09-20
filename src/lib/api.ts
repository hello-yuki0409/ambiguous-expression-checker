export async function rewriteText(text: string, style: "敬体" | "常体") {
  const res = await fetch("/api/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, style }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `API error: ${res.status}`;
    throw new Error(msg);
  }
  return (json?.candidate as string | undefined) ?? null;
}
