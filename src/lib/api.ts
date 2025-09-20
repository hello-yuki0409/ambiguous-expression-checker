export async function rewriteText(
  text: string,
  style: "敬体" | "常体"
): Promise<string | null> {
  const res = await fetch("/api/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, style }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  return (json?.candidate as string | undefined) ?? null;
}
