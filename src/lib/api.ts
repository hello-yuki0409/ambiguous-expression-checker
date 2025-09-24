import type { Finding } from "@/lib/detection";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type ApiErrorShape = { error?: { message?: string } };

type CheckRunSummary = {
  id: string;
  aimaiScore: number;
  totalCount: number;
  charLength: number;
  createdAt: string;
};

type VersionSummary = {
  id: string;
  index: number;
  title: string | null;
  createdAt: string;
  checkRun: CheckRunSummary | null;
};

type ArticleSummary = {
  id: string;
  title: string | null;
  authorLabel: string | null;
  createdAt: string;
  updatedAt: string;
  latest: VersionSummary | null;
  previous: VersionSummary | null;
};

type ArticleDetail = {
  id: string;
  title: string | null;
  authorLabel: string | null;
  createdAt: string;
  updatedAt: string;
  versions: VersionSummary[];
};

type FindingDetail = {
  id: string;
  start: number;
  end: number;
  matchedText: string;
  category: Finding["category"];
  severity: Finding["severity"];
  reason: string | null;
  patternId: string | null;
};

type VersionDetail = {
  id: string;
  index: number;
  title: string | null;
  content: string;
  createdAt: string;
  article: { id: string; title: string | null; authorLabel: string | null };
  checkRun: (CheckRunSummary & { findings: FindingDetail[] }) | null;
};

type SaveVersionRequest = {
  articleId?: string | null;
  title?: string | null;
  authorLabel?: string | null;
  content: string;
  findings: Array<
    Pick<Finding, "start" | "end" | "category" | "severity"> & {
      text: string;
      reason?: string | null;
      patternId?: string | null;
    }
  >;
};

type SaveVersionResponse = {
  article: { id: string; title: string | null; authorLabel: string | null };
  version: { id: string; index: number; title: string | null; createdAt: string };
  checkRun: CheckRunSummary;
};

async function request<TResponse>(
  input: RequestInfo,
  init?: RequestInit
): Promise<TResponse> {
  const res = await fetch(input, init);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const data = (json as ApiErrorShape | null)?.error;
    const message = data?.message || `API error: ${res.status}`;
    throw new Error(message);
  }

  return (json ?? {}) as TResponse;
}

export async function rewriteText(text: string, style: "敬体" | "常体") {
  const data = await request<{ candidate?: string | null }>("/api/rewrite", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ text, style }),
  });
  return data.candidate?.trim() ?? null;
}

export async function saveVersion(payload: SaveVersionRequest) {
  const data = await request<SaveVersionResponse>("/api/versions", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  return data;
}

export async function fetchArticlesSummary() {
  const data = await request<{ articles: ArticleSummary[] }>("/api/versions");
  return data.articles;
}

export async function fetchArticleDetail(articleId: string) {
  const data = await request<{ article: ArticleDetail }>(
    `/api/versions?articleId=${encodeURIComponent(articleId)}`
  );
  return data.article;
}

export async function fetchVersionDetail(versionId: string) {
  const data = await request<{ version: VersionDetail }>(
    `/api/versions?versionId=${encodeURIComponent(versionId)}`
  );
  return data.version;
}

export type {
  ArticleDetail,
  ArticleSummary,
  CheckRunSummary,
  FindingDetail,
  SaveVersionRequest,
  SaveVersionResponse,
  VersionDetail,
  VersionSummary,
};
