export type Finding = {
  start: number;
  end: number;
  text: string;
  category: "HEDGING" | "VAGUE" | "QUANTITY" | "RESPONSIBILITY" | "OTHER";
  severity: 1 | 2 | 3;
  reason?: string;
  patternId?: string;
};

export type Pattern = {
  id: string;
  regex: RegExp;
  category: Finding["category"];
  severity: Finding["severity"];
  explanation?: string;
};

export function detect(content: string, patterns: Pattern[]): Finding[] {
  const findings: Finding[] = [];
  for (const p of patterns) {
    const re = new RegExp(
      p.regex.source,
      p.regex.flags.includes("g") ? p.regex.flags : p.regex.flags + "g"
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      findings.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        category: p.category,
        severity: p.severity,
        reason: p.explanation,
        patternId: p.id,
      });
      if (m[0].length === 0) re.lastIndex++; // ゼロ幅対策
    }
  }
  return findings.sort((a, b) => a.start - b.start);
}
