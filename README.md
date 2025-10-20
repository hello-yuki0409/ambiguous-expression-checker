## はじめに

編集者の添削工数削減と、教育用ツールとしてライターの成長度合いを定量的に可視化できるアプリです。

前職で 2 年間、医療系 SEO コンテンツの品質管理に取り組んでいましたが、曖昧表現の添削/フィードバックに多くの時間を取られていました。

「でしょう」「など」「場合がある」といった曖昧表現は便利ですが、多用されると"意味の解像度"が下がり、記事の品質だけでなく、**クリニックの信頼までも落としてしまう**直接的な原因にもなります。

現場では、曖昧さを戻すための往復が増え、レビューの基準ブレも起こりやすいという課題に繰り返し直面してきました。

そこで、曖昧さを**曖昧なままにしない仕組み**を用意し、執筆段階で気づきと修正を促すことで、編集の負荷を軽減したいと考え、本プロダクトを作りました。

## コンセプト

私は編集現場で働く中で、**執筆段階で「気づく -> 直す -> 学ぶ」を自走できる仕組み**が必要だと考えました。

このプロダクトは、次の価値仮説に基づいています。

- **可視化**：曖昧な箇所が視覚的にわかる（気づける）
- **納得**：なぜ曖昧なのか、理由がわかる（腑に落ちる）
- **前進**：言い換えのヒントが得られる（時短につながる）
- **成長**：修正の積み重ねが可視化される（続けられる）

曖昧の理由が分かったり成長度合いが可視化されたりすることで、業務委託ライターのモチベーション向上に繋がるだけでなく、曖昧な理由を知れることで同じ理由のフィードバックを削減し、編集者とライターの関係性悪化を防げます。

これにより、短期の契約解除を防ぐ効果も期待できます。

- **編集者**：本当に価値のある指摘（構成・論拠・読者体験）への集中
- **読者**：曖昧さに迷わず要点へ辿り着ける体験
- **執筆者**：自分の癖に気づき、上達を実感できる環境

この三者が同時に報われる状態を、このプロダクトで目指しています。

## 概要

- **曖昧表現の検出とハイライト**: Monaco Editor 上で文章をチェックし、カテゴリ別・深刻度別に装飾。検出結果の一覧や頻出語も表示します。
- **言い換え候補の提案**: 選択した曖昧表現について、対象箇所の前後 120 文字前後の文脈を参照しつつ OpenAI から 1 案と理由を取得します。
- **バージョン保存 & 履歴管理**: 保存時に Firebase UID と著者ラベルを Supabase に記録。履歴画面では複数バージョンを比較し、Diff を表示できます。
- **統計ダッシュボード**: 最新版と前回との差分や曖昧度スコアの推移、カテゴリ別件数、頻出の曖昧語を確認できます。

### 想定シナリオ（ライター視点のフロー）

1. 原稿を下書きしながら曖昧箇所に気づく
2. 理由を読み、適切な言い換えに変換する
3. 積み重ねを振り返り、自分の癖と変化を知る

### スコープ外（今後実装予定）

- 医学的正確性や根拠の判定そのもの
- 事実関係の一次情報確認
- トンマナを意識した言い換え

## デモ動画


![2025-10-2022 49 17-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/f04d2008-cd34-4281-b863-a8976a23b381)



## 技術スタック

| レイヤー       | 採用技術 / 補足                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| フロントエンド | React 19 / Vite / TypeScript / Tailwind CSS (shadcn/ui) / Monaco Editor / Recharts                                      |
| バックエンド   | Firebase Functions (Node.js 20, TypeScript) + Prisma。`functions/src/storage.ts` が Prisma とメモリ実装を切り替えて使用 |
| データベース   | Supabase (PostgreSQL)。`DATABASE_URL` で connection pooler、`DIRECT_DATABASE_URL` で 5432 を利用                        |
| 認証           | Firebase Authentication（Email/Password）。`src/contexts/auth-context.ts`、`src/components/RequireAuth.tsx`             |
| AI             | OpenAI Responses API。既定は `gpt-4.1-mini`、`OPENAI_REWRITE_MODEL` で `gpt-4.1` / `gpt-4o` などに切替可                |
| インフラ       | Firebase Hosting + Functions、Firebase Emulator Suite                                                                   |
| 品質管理       | ESLint / TypeScript / Jest + React Testing Library（`src/__tests__/sampleComponent.spec.tsx`）                          |

## セットアップ & 実行手順

### 1. 前提ツール

- Node.js 20 以上
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- Supabase など PostgreSQL 接続先
- OpenAI API キー（Responses API 対応）

### 2. 依存関係の導入

```bash
npm install
npm --prefix functions install
```

### 3. 環境変数の配置

| ファイル               | 用途                   | 主なキー                                                                                                 |
| ---------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `./.env.local`         | Vite（クライアント）   | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` など                         |
| `functions/.env`       | 本番 Functions         | `DATABASE_URL`, `DIRECT_DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_REWRITE_MODEL`, `USE_IN_MEMORY_STORAGE` |
| `functions/.env.local` | エミュレータ Functions | 本番と同形式で OK                                                                                        |

`DATABASE_URL` には Supabase Connection Pooler（例: 6543）を設定すると Functions から安定します。`DIRECT_DATABASE_URL` は 5432 を指定し、Prisma のマイグレーションに利用します。

### 4. Prisma スキーマを適用

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

ローカル検証で新マイグレーションを作る場合は `npx prisma migrate dev` を利用してください。

### 5. Emulator & フロントエンドを起動

```bash
# Functions を事前ビルド
npm run build:functions

# Firebase Emulator（Functions / Hosting）
firebase emulators:start --only functions,hosting

# 別ターミナルで実行
npm run dev
```

Firebase Authentication の Email/Password プロバイダを有効化し、テストユーザーでログインします（未ログイン時は `/login` にリダイレクトされます）。

### 6. ユーザーフロー概要

| ステップ           | 実装ポイント                                                                                     | 補足                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 曖昧表現の検出     | `src/lib/detection.ts` が `src/lib/patterns.ts` を用いて正規表現検出。ゼロ幅対策で `lastIndex++` | Monaco Editor 上で severity / category に応じた装飾を付与                                                    |
| 言い換え候補生成   | `/api/rewrite` -> `functions/src/rewrite.ts`                                                      | カテゴリ指針と周辺 120 文字の文脈を Responses API に渡し、JSON Schema で敬体・断定的な候補と理由を取得       |
| バージョン保存     | `/api/versions` POST -> `functions/src/versions.ts`                                               | Firebase UID + authorLabel でスコープし、`ArticleVersion` / `CheckRun` / `Finding` を Supabase に保存        |
| 履歴 / Diff 表示   | `src/pages/History.tsx`                                                                          | Monaco DiffEditor を常時マウントし、左右とも word wrap とモデル保持で UX を改善                              |
| ダッシュボード集計 | `/api/dashboard` -> `functions/src/dashboard.ts`                                                  | 最新 2 件比較・スコア推移・カテゴリ件数・頻出語を返却。Prisma 不通時はメモリスナップショットにフォールバック |

## 環境変数リファレンス

| 変数名                  | 用途 / 参照箇所                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `VITE_FIREBASE_*`       | `src/lib/firebase.ts`。クライアントの Firebase 初期化                                           |
| `OPENAI_API_KEY`        | `functions/src/rewrite.ts`。Responses API へのキー                                              |
| `OPENAI_REWRITE_MODEL`  | 同上。既定は `gpt-4.1-mini`。必要に応じて上位モデルに変更                                       |
| `DATABASE_URL`          | `functions/src/db.ts`。Prisma 接続先（Connection Pooler 推奨）                                  |
| `DIRECT_DATABASE_URL`   | Prisma マイグレーション用の直結ポート                                                           |
| `USE_IN_MEMORY_STORAGE` | `functions/src/storage.ts`。`true` でインメモリ実装を優先（接続不能時のフォールバックにも使用） |

## ディレクトリ構成（抜粋）

```
.
├─ src/
│  ├─ pages/Editor.tsx          # 曖昧表現チェック & 言い換え UI
│  ├─ pages/History.tsx         # バージョン一覧 & Monaco Diff
│  ├─ pages/Dashboard.tsx       # スコア・カテゴリ・頻出語の可視化
│  ├─ components/               # Atomic Design ベースの UI
│  ├─ contexts/                 # Firebase Auth コンテキスト
│  ├─ lib/                      # detection / patterns / api / firebase util
│  └─ __tests__/sampleComponent.spec.tsx
├─ functions/
│  ├─ src/rewrite.ts            # OpenAI Responses API 連携
│  ├─ src/versions.ts           # バージョン CRUD & 認証検証
│  ├─ src/dashboard.ts          # 集計 API（Prisma フォールバック付き）
│  ├─ src/storage.ts            # Prisma + メモリ抽象化
│  └─ src/index.ts              # Cloud Functions エントリーポイント
├─ prisma/                      # Prisma schema & migrations
└─ README.md
```

## 画面と主な機能

| 画面 / パス                 | 主な機能                                                         | 関連コンポーネント                                                                                                       |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| エディタ `/`                | 曖昧表現検出・言い換え候補・保存・直近履歴メーター               | `Editor.tsx`, `FindingsPanel.tsx`, `RewriteDialog.tsx`                                                                   |
| 履歴 `/history`             | 記事一覧・バージョン一覧・Monaco Diff・削除ダイアログ            | `History.tsx`, `VersionDeleteDialog.tsx`, `functions/src/versions.ts`                                                    |
| ダッシュボード `/dashboard` | 最新 vs 前回比較、曖昧度スコア推移、カテゴリ別件数、頻出語 TOP10 | `Dashboard.tsx`, `CategoryTrendSection.tsx`, `ScoreTrendSection.tsx`, `FrequentPhrasesSection.tsx`, `SummarySection.tsx` |
| ログイン `/login`           | Firebase Email/Password 認証フォーム                             | `Login.tsx`, `auth-context.ts`, `RequireAuth.tsx`                                                                        |

## Functions API 一覧

| メソッド / パス            | 役割                                                                                     | 主な実装                     |
| -------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- |
| `POST /api/rewrite`        | OpenAI Responses API を呼び出し、敬体で断定的な言い換えと理由を返却                      | `functions/src/rewrite.ts`   |
| `GET /api/versions`        | 記事サマリ／記事詳細／バージョン詳細を返却（`take` / `skip`対応）                        | `functions/src/versions.ts`  |
| `POST /api/versions`       | 検出結果を保存し、`CheckRun`・`Finding` を Supabase に紐付け                             | `functions/src/versions.ts`  |
| `DELETE /api/versions/:id` | `findings -> check_runs -> article_versions` の順で削除し整合性を保つ                      | `functions/src/versions.ts`  |
| `GET /api/dashboard`       | 最新 2 件比較・スコア推移・カテゴリ件数・頻出語を集計。Prisma 不通時はメモリデータを利用 | `functions/src/dashboard.ts` |

※ 全エンドポイントで Firebase ID トークン（`Authorization: Bearer ...`）が必須です。

## 開発用コマンド

| コマンド                             | 説明                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `npm run dev`                        | Vite 開発サーバ（http://localhost:5173）                                 |
| `npm run build`                      | Web アプリ本番ビルド（dist/）                                            |
| `npm run build:functions`            | Functions を `functions/lib/` にトランスパイル                           |
| `npm test`                           | Jest + React Testing Library（`src/__tests__/sampleComponent.spec.tsx`） |
| `npm run lint` / `npm run typecheck` | 静的解析・型チェック                                                     |
| `make deploy`                        | Firebase Hosting + Functions へデプロイ                                  |
| `make deploy-preview`                | Hosting プレビュー チャネルへデプロイ（7 日間有効）                      |

## 品質とテスト

- **Jest + React Testing Library**: `src/__tests__/sampleComponent.spec.tsx` を起点に UI テストを追加可能。
- **静的解析**: `npm run lint`, `npm run typecheck` で ESLint / TypeScript を実行。
- **ビルド検証**: `npm run build`, `npm run build:functions` で SPA / Functions 双方のコンパイルを確認。
- **CI 想定**: npm scripts と `Makefile` タスクを GitHub Actions などから実行。`USE_IN_MEMORY_STORAGE=true` で Prisma 接続なしの最小検証も可能。

## 実装ハイライト

- `src/lib/detection.ts` … 正規表現で曖昧語を検出。ゼロ幅マッチ対策で `lastIndex++` を実装。
- `functions/src/rewrite.ts` … Responses API を JSON Schema で制約。カテゴリ指針＋ few-shot 例で敬体・断定的な候補を生成し、原文と同じ結果は `null` で返却。
- `functions/src/storage.ts` … Prisma とメモリの二重実装。Prisma 初期化エラー時でもメモリへフェイルオーバーし、UID を持たない旧データも再紐付け。
- `functions/src/dashboard.ts` … Prisma が不通でもメモリスナップショットから集計を再計算し、ダッシュボードの 500 エラーを回避。
- `src/pages/History.tsx` … DiffEditor を常時マウントし `onMount` で左右エディタの word wrap を強制。削除後は UI と Supabase の整合を取る。

## 今後の展望

- 医学的根拠チェックやファクト検証機能
- 曖昧表現辞書のカスタマイズ（追加 / 編集 / インポート）
- ダッシュボードの CSV / PDF エクスポート
- 組織単位のロール管理と共有ダッシュボード
- トンマナを意識した言い換え
- 曖昧と冗長表現検出の切り替え

## トラブルシューティング

| 症状                             | 対処                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Missing Firebase configuration` | `./.env.local` の `VITE_FIREBASE_*` を確認し Vite を再起動。Functions 用 `.env` と取り違えていないかチェック                                                                                                   |
| `/api/versions` が 404           | ブラウザ拡張がリクエストを書き換えている可能性。シークレットウィンドウで再試行し Authorization ヘッダーを確認                                                                                                  |
| ダッシュボードが 500             | Supabase 接続が落ちている可能性。`DATABASE_URL`（6543）と `DIRECT_DATABASE_URL`（5432）を再確認し、`npm run build:functions` -> emulator 再起動。ログに "prisma unavailable" が出ればメモリフォールバックが動作 |
| DiffEditor のモデル破棄エラー    | 常時マウント＋モデル保持で対策済み。解消しない場合はブラウザ再読み込み、それでも NG なら Issue を作成                                                                                                          |
| OpenAI 429 / 401                 | レート制限・権限を確認。必要に応じて `OPENAI_REWRITE_MODEL` を軽量モデルへ戻す。Functions を再ビルド                                                                                                           |

## ライセンス / 注意事項

社内利用を想定しているためライセンスは未設定です。外部公開する場合は別途ライセンスを検討してください。環境変数には機密情報が含まれるため Git にコミットせず、`.gitignore` とアクセス権限で保護してください。
