import { deleteArticle } from "@/lib/api";

jest.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue("test-token"),
    },
  },
}));

describe("deleteArticle API helper", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls the versions endpoint with articleId", async () => {
    // articleId のクエリ付きで DELETE が送信されることを確認する
    await deleteArticle("article-123");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/versions?articleId=article-123",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.any(Headers),
      })
    );
  });
});
