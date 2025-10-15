import RewriteDialog from "@/components/RewriteDialog";
import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { EditorTitleForm } from "@/components/molecules/editor/EditorTitleForm";
import { EditorActionBar } from "@/components/molecules/editor/EditorActionBar";
import { EditorWorkspace } from "@/components/organisms/editor/EditorWorkspace";
import { EditorHistorySection } from "@/components/organisms/editor/EditorHistorySection";
import { PageShell } from "@/components/templates/PageShell";
import { TwoColumnTemplate } from "@/components/templates/TwoColumnTemplate";
import { useAuth } from "@/hooks/useAuth";
import { useEditorState } from "@/hooks/useEditorState";

const CONTEXT_RADIUS = 120;

function buildContextSnippet(
  source: string,
  start: number,
  end: number,
  radius = CONTEXT_RADIUS
) {
  if (!source.length) {
    return "";
  }
  const safeStart = Math.max(0, start - radius);
  const safeEnd = Math.min(source.length, end + radius);
  const snippet = source.slice(safeStart, safeEnd);
  return snippet.trim() ? snippet : source;
}

export default function Editor() {
  const { user } = useAuth();
  const {
    content,
    setContent,
    title,
    handleTitleChange,
    articleId,
    findings,
    ms,
    history,
    historyDeleteOpen,
    setHistoryDeleteOpen,
    selected,
    setSelected,
    saving,
    saveError,
    saveMessage,
    onMount,
    clearAll,
    runCheck,
    handleSave,
    jumpTo,
    replaceSelected,
    handleConfirmDeleteHistory,
  } = useEditorState(user);

  return (
    <PageShell>
      <TwoColumnTemplate
        main={
          <SurfaceCard as="section" className="space-y-4 bg-white/70 p-6 backdrop-blur">
            <div className="space-y-3">
              <EditorTitleForm
                title={title}
                onChange={handleTitleChange}
                articleId={articleId}
              />
              <EditorActionBar
                ms={ms}
                onClear={clearAll}
                onRunCheck={runCheck}
                onSave={handleSave}
                saving={saving}
              />
              {(saveError || saveMessage) && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    saveError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {saveError ?? saveMessage}
                </div>
              )}
            </div>

            <EditorWorkspace
              content={content}
              onContentChange={setContent}
              onMount={onMount}
              findings={findings}
              onJump={jumpTo}
              onSelectFinding={(f) => setSelected(f)}
            />
          </SurfaceCard>
        }
        side={
          <EditorHistorySection
            history={history}
            deleteDialogOpen={historyDeleteOpen}
            onDeleteDialogChange={setHistoryDeleteOpen}
            onConfirmDelete={handleConfirmDeleteHistory}
          />
        }
      />

      <RewriteDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        original={selected?.text ?? ""}
        context={
          selected
            ? buildContextSnippet(content, selected.start, selected.end)
            : content
        }
        category={selected?.category}
        style="敬体"
        onReplace={replaceSelected}
      />
    </PageShell>
  );
}
