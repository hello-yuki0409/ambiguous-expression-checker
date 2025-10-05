# 曖昧表現チェッカー

編集者の添削工数削減とライターの成長を可視化できる教育アプリ

## はじめに

前職で 2 年間、医療系 SEO コンテンツの品質管理に取り組んでいましたが、曖昧表現の添削/フィードバックに多くの時間を取られていました。

「でしょう」「など」「場合がある」といった曖昧表現は便利ですが、多用されると"意味の解像度"が下がり、記事の品質だけでなく、**クリニックの信頼までも落としてしまう**直接的な原因にもなります。

現場では、曖昧さを戻すための往復が増え、レビューの基準ブレも起こりやすいという課題に繰り返し直面しました。

そこで、曖昧さを**曖昧なままにしない仕組み**を用意し、執筆段階で気づきと修正を促すことで、編集の負荷を軽減したいと考え、本プロダクトを作りました。

## コンセプト

私は編集現場で働く中で、**執筆段階で「気づく → 直す → 学ぶ」を自走できる仕組み**が必要だと考えました。

このプロダクトは、次の価値仮説に基づいています。

- **可視化**：曖昧な箇所が視覚的にわかる（気づける）
- **納得**：なぜ曖昧なのか、理由がわかる（腑に落ちる）
- **前進**：言い換えのヒントが得られる（時短につながる）
- **成長**：修正の積み重ねが可視化される（続けられる）

特に、自分の成長が可視化される機能は、ライターのモチベーション向上にも繋げられ、短期の契約解除を防ぐ効果も期待できます。
また、曖昧な理由を知れることで同じ理由のフィードバックを削減し、編集者とライターの関係性悪化を防げます。

- **編集者**：本当に価値のある指摘（構成・論拠・読者体験）への集中
- **読者**：曖昧さに迷わず要点へ辿り着ける体験
- **執筆者**：自分の癖に気づき、上達を実感できる環境

この三者が同時に報われる状態を、このプロダクトで目指しています。

## 概要

- **曖昧表現の検出とハイライト**: Monaco Editor 上で文章をチェックし、カテゴリ別・深刻度別に装飾。検出結果の一覧や頻出語も表示します。
- **言い換え候補の提案**: 選択した曖昧表現について、本文全体の文脈を参照しつつ OpenAI から 1 案と理由を取得します。
- **バージョン保存 & 履歴管理**: 保存時に Firebase UID と著者ラベルを Supabase に記録。履歴画面では複数バージョンを比較し、Diff を表示できます。
- **統計ダッシュボード**: 最新版と前回との差分、曖昧度スコアの推移、カテゴリ別件数、頻出の曖昧語を確認できます。

### 想定シナリオ（ライター視点のフロー）

1. 原稿を下書きしながら曖昧箇所に気づく
2. 理由を読み、適切な言い換えを即時に試す
3. 積み重ねを振り返り、自分の癖と変化を知る

### スコープ外（今後実装予定）

- 医学的正確性や根拠の判定そのもの
- 事実関係の一次情報確認
- トンマナを意識した言い換え

## デモ動画

めっちゃありがたいらしい。
1 分以内とかに収められたらいいなぁくらい。なるべく短く

## 環境

- **フロントエンド**: React 19 / Vite / TypeScript / Tailwind CSS (shadcn/ui) / Monaco Editor / Recharts
- **バックエンド**: Firebase Functions (Node.js 20, TypeScript) + Prisma
- **データベース**: Supabase (PostgreSQL)。`functions/src/storage.ts` が Prisma とインメモリ実装を切り替えながら利用します。
- **認証**: Firebase Authentication（Email/Password）。`src/contexts/auth-context.ts` と `src/components/RequireAuth.tsx` がガード。
- **AI**: OpenAI Responses API（デフォルトは `gpt-4.1-mini`。`OPENAI_REWRITE_MODEL` で `gpt-4.1` や `gpt-4o` へ変更可能）。
- **ホスティング**: Firebase Hosting + Functions。ローカル開発は Firebase Emulator Suite を使用。
- **品質管理**: ESLint / TypeScript 型チェック / Jest + React Testing Library。

## 利用方法

### 前提条件

- Node.js 20 以上
- npm（または互換クライアント）
- Firebase CLI (`npm install -g firebase-tools`)
- Supabase などの PostgreSQL 接続先
- OpenAI API キー

### 1. 依存関係の導入

```bash
npm install
npm --prefix functions install
```

### 2. 環境変数を設定

- Vite 用: `./.env.local`
- Functions 本番用: `functions/.env`
- Functions エミュレータ用: `functions/.env.local`

**ルート /.env.local**
```
VITE_FIREBASE_API_KEY=xxxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxxx
VITE_FIREBASE_APP_ID=1:************:web:************
```

**functions/.env(.local)**
```
DATABASE_URL=postgresql://...:6543/postgres?schema=aimai
DIRECT_DATABASE_URL=postgresql://...:5432/postgres?schema=aimai
OPENAI_API_KEY=sk-...
OPENAI_REWRITE_MODEL=gpt-4.1-mini
USE_IN_MEMORY_STORAGE=false
```
`DATABASE_URL` は Supabase の Connection Pooler（例: 6543）を指定すると Functions から安定します。

### 3. Prisma でスキーマを適用

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

ローカルで新しいマイグレーションを作る場合は `npx prisma migrate dev` を使用します。

### 4. Firebase Emulator を起動

```bash
npm run build:functions
firebase emulators:start --only functions,hosting
```

### 5. フロントエンド開発サーバを起動

別ターミナルで以下を実行します。

```bash
npm run dev
```

Firebase Authentication の Email/Password プロバイダを有効化し、テストユーザーを作成してログインします。未ログインの場合は自動的に `/login` にリダイレクトされます。

### 6. 利用フロー

1. `/` エディタで本文を入力し「チェック」を押下すると、`src/lib/detection.ts` が `src/lib/patterns.ts` の辞書を用いて曖昧表現を検出します。
2. 検出一覧（`src/components/FindingsPanel.tsx`）の「候補」をクリックすると `rewriteText` API が呼び出され、`functions/src/rewrite.ts` が OpenAI から言い換え案＋理由を JSON Schema 形式で取得します。対象前後 120 文字を文脈に渡すため、断定的で自然な敬体に修正されます。
3. 「保存」で `functions/src/versions.ts` に POST。Supabase に `User`・`Article`・`ArticleVersion`・`CheckRun`・`Finding` を保存し、Firebase UID でスコープします。
4. `/history` では記事一覧とバージョン一覧を参照し、Monaco Diff で比較できます。削除は `DELETE /api/versions/:id` を呼び、UI と DB を同期します。
5. `/dashboard` は `functions/src/dashboard.ts` が集計した曖昧度スコア推移・カテゴリ別件数・頻出語を表示します。

## 環境変数リファレンス

| 変数名 | 用途 / 参照箇所 |
| --- | --- |
| `VITE_FIREBASE_*` | `src/lib/firebase.ts`。クライアントの Firebase 初期化に使用。 |
| `OPENAI_API_KEY` | `functions/src/rewrite.ts`。Responses API へ渡すキー。 |
| `OPENAI_REWRITE_MODEL` | 同上。`gpt-4.1-mini` が既定。高精度が必要なら `gpt-4.1` などを指定。 |
| `DATABASE_URL` | `functions/src/db.ts`。Prisma の接続先。Supabase のコネクションプーラー推奨。 |
| `DIRECT_DATABASE_URL` | Prisma のマイグレーション用に直結ポートを指定。 |
| `USE_IN_MEMORY_STORAGE` | `functions/src/storage.ts`。`true` にすると Prisma を使わずメモリストレージで挙動確認。 |

## ディレクトリ構成（抜粋）

```
.
├─ src/
│  ├─ pages/Editor.tsx          # 曖昧表現チェック ＋ 言い換え UI
│  ├─ pages/History.tsx         # バージョン履歴・Diff 表示
│  ├─ pages/Dashboard.tsx       # 曖昧度の集計可視化
│  ├─ components/               # Atomic Design 準拠の UI
│  ├─ contexts/                 # 認証などの共有状態
│  └─ lib/                      # 検出ロジック、API ラッパ、Firebase 初期化 等
├─ functions/
│  ├─ src/rewrite.ts            # OpenAI 連携（Responses API）
│  ├─ src/versions.ts           # バージョン CRUD
│  ├─ src/dashboard.ts          # 集計 API
│  ├─ src/storage.ts            # Prisma とメモリを抽象化
│  └─ src/index.ts              # Functions エントリーポイント
├─ prisma/                      # Prisma schema とマイグレーション
└─ README.md
```

## 画面構成

| 画面 / パス | 主な機能 | 関連ファイル |
| --- | --- | --- |
| エディタ `/` | 曖昧表現検出／言い換え候補生成／保存。Monaco ハイライトと履歴メーターを提供。 | `src/pages/Editor.tsx`, `src/components/FindingsPanel.tsx`, `functions/src/rewrite.ts` |
| 履歴 `/history` | 記事一覧・バージョン一覧・Monaco Diff。削除ダイアログで Supabase と UI を同期。 | `src/pages/History.tsx`, `src/components/organisms/history/VersionDeleteDialog.tsx`, `functions/src/versions.ts` |
| ダッシュボード `/dashboard` | 最新 vs 前回比較、スコア推移、カテゴリ別件数、頻出語ランキング。 | `src/pages/Dashboard.tsx`, `functions/src/dashboard.ts` |
| ログイン `/login` | Firebase Email/Password 認証フォーム。 | `src/pages/Login.tsx`, `src/contexts/auth-context.ts` |

## バックエンド API 概要

| メソッド / パス | 説明 | 主な実装 |
| --- | --- | --- |
| `POST /api/rewrite` | OpenAI で言い換え案を 1 件生成。カテゴリ指針と前後文脈を付与し JSON Schema で構造化。 | `functions/src/rewrite.ts` |
| `GET /api/versions` | 記事一覧・記事詳細・バージョン詳細を返却。`take` / `skip` に対応。 | `functions/src/versions.ts` |
| `POST /api/versions` | 書き換え結果を保存し、`CheckRun` と `Finding` を紐付け。 | 同上 |
| `DELETE /api/versions/:id` | `findings → check_runs → article_versions` の順に削除。 | 同上 |
| `GET /api/dashboard` | 曖昧度スコア／カテゴリ件数／頻出語の集計。Prisma 不通時はメモリにフォールバック。 | `functions/src/dashboard.ts` |

全エンドポイントで `Authorization: Bearer <Firebase ID トークン>` が必須です。

## よく使うコマンド

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | Vite 開発サーバ（http://localhost:5173） |
| `npm run build` | Web アプリの本番ビルド（dist/） |
| `npm run build:functions` | Functions の TypeScript ビルド（`functions/lib/` へ出力） |
| `npm test` | Jest + React Testing Library |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 型チェック |
| `make deploy` | Firebase Hosting + Functions へ本番デプロイ（`Makefile` 参照） |
| `make deploy-preview` | Hosting プレビューチャネルへデプロイ（7 日間有効） |

## テストと品質

- **ユニット / UI テスト**: `npm test`
- **静的解析**: `npm run lint`, `npm run typecheck`
- **ビルド検証**: `npm run build`, `npm run build:functions`
- CI 導入時は npm scripts もしくは `Makefile` のタスクを GitHub Actions などから呼び出します。

## 実装済み機能の技術メモ

- `src/lib/detection.ts` … 正規表現ベースで曖昧語を検出。ゼロ幅マッチ対策で `re.lastIndex++` を実装。
- `functions/src/storage.ts` … Prisma とメモリの二重実装。Prisma 初期化エラー時にメモリへフォールバックし、旧データの UID を再紐付けする補正を含みます。
- `functions/src/rewrite.ts` … OpenAI Responses API を JSON Schema で制約。カテゴリごとのガイドラインと few-shot 例を使い、敬体で断定的な文を返すよう最適化。原文と同一の返信は `null` 扱いにして UI でエラーハンドリング。
- `src/pages/History.tsx` … Monaco DiffEditor を常時マウントし、`onMount` で左右両方に `wordWrap` を適用。削除後は一覧と Diff を都度リフレッシュ。
- `functions/src/dashboard.ts` … Prisma 集計に失敗した場合はメモリに保存されたバージョン情報から再計算するフォールバック処理を実装。

## 実装予定の機能

- 医学的根拠チェックやファクト検証機能
- 曖昧表現辞書のカスタマイズ（追加 / 編集 / インポート）
- ダッシュボードの CSV / PDF エクスポート
- 組織単位のロール管理と共有ダッシュボード

## トラブルシューティング

| 症状 | 対処 |
| --- | --- |
| `Missing Firebase configuration` | `VITE_FIREBASE_*` が正しく設定されているか確認し、Vite を再起動。ルートと Functions の `.env` を取り違えていないか確認。 |
| `/api/versions` が 404 になる | ブラウザ拡張機能がリクエストを書き換えている可能性。シークレットウィンドウで再試行し、Authorization ヘッダーが付与されているか確認。 |
| ダッシュボードで 500 エラー | Supabase 接続が切れている可能性。`DATABASE_URL`（6543）と `DIRECT_DATABASE_URL`（5432）を確認し、`npm run build:functions` → emulator 再起動。 |
| DiffEditor でモデル破棄エラー | `keepCurrentOriginalModel` / `keepCurrentModifiedModel` で緩和済み。ブラウザ再読み込みで改善しない場合は Issue を作成。 |
| OpenAI 429 / 401 | レート制限・権限を確認。モデル変更後は Functions を再ビルド。必要なら `OPENAI_REWRITE_MODEL` を軽量モデルへ戻す。 |

## ライセンスと注意事項

本リポジトリは社内利用を想定しているためライセンスは未設定です。外部公開する際は適切なライセンスを別途検討してください。環境変数には機密情報を含むため、Git にコミットしないよう `.gitignore` を利用し、アクセス権限を適切に管理してください。
