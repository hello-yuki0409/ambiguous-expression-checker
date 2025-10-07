// ArticleDeleteDialog の表示内容と操作を検証するテスト

import { render, screen, fireEvent } from "@testing-library/react";
import { ArticleDeleteDialog } from "@/components/organisms/history/ArticleDeleteDialog";

const sampleArticle = {
  id: "article-1",
  title: "テスト記事",
  authorLabel: "デモ",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-02T12:34:56.000Z",
  latest: {
    id: "v4",
    index: 3,
    title: "最新版",
    createdAt: "",
    checkRun: null,
  },
  previous: null,
};

describe("ArticleDeleteDialog", () => {
  it("shows article information when open", () => {
    // 開いた状態で記事情報が表示されることを確認する
    render(
      <ArticleDeleteDialog
        open
        onOpenChange={() => undefined}
        target={sampleArticle}
        onConfirm={() => undefined}
      />
    );

    expect(screen.getByText("対象の記事")).toBeInTheDocument();
    expect(screen.getByText("テスト記事")).toBeInTheDocument();
    expect(screen.getByText(/最新バージョン/)).toHaveTextContent("v4");
    expect(
      screen.getByRole("button", { name: "削除する" })
    ).toBeInTheDocument();
  });

  it("invokes onConfirm when clicking the delete button", () => {
    // 「削除する」を押すと onConfirm が呼ばれることを確認する
    const handleConfirm = jest.fn();
    render(
      <ArticleDeleteDialog
        open
        onOpenChange={() => undefined}
        target={sampleArticle}
        onConfirm={handleConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
