export async function rewriteMock(
  text: string,
  style: "敬体" | "常体"
): Promise<{ candidate: string }> {
  // ダミー実装👅 setTimeout でAPIっぽくする
  const suffix = style === "敬体" ? "。" : "だ。"; // ← style をあえて利用
  const candidate = text.replace(/かもしれない/g, "である") + suffix;
  return new Promise((resolve) =>
    setTimeout(() => resolve({ candidate: `${candidate} （ダミー候補）` }), 500)
  );
}
