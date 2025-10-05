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

- **可視化**：曖昧な箇所を視覚的に示し、見落としを減らす
- **理由提示**：なぜ曖昧なのかを短い説明で示し、納得感を高める
- **言い換え支援**：より具体的な表現のヒントを提示し、修正を前に進める
- **成長の見える化**：修正の履歴や傾向を数値で示し、上達を実感できる

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

## 環境 - 技術スタック -

アプリを動かす前提条件。使った技術を一通り書く。コードを見なくても分かるようにしっかり書く。

## 利用方法

適切に説明できる → 理解している証拠

## 実装予定の機能

どんな技術でどんなことをしようとしているのかを書く。先々を踏まえて考えられているアピールをする。

## おわりに

共通の困りごと
1 本の記事レビューに時間がかかり、書き手ごとに品質のばらつきが出る。対策として表現ガイドやチェックリストを作っても、運用・更新・浸透のコストが高い。

核心の仮説
曖昧表現は定型のパターンで出現することが多く、まずはローカル辞書 × 正規表現で即時検出 →“見える化”と即修正ができれば、レビューの再現性と速度を底上げできる。

リアルタイムに曖昧表現を検出・修正し、履歴や改善度を可視化するライティング支援ツールです。Firebase 認証でログインしたユーザーごとに Supabase (PostgreSQL) 上へバージョン履歴を保存し、言い換え候補は OpenAI API を用いて生成します。

## 主要機能

- **曖昧表現の検出とハイライト**: Monaco Editor 上で文章をチェックし、カテゴリ別・深刻度別に装飾。検出結果の一覧や頻出語も表示します。
- **言い換え候補の提案**: 選択した曖昧表現について、本文全体の文脈を参照しつつ OpenAI から 1 案と理由を取得します。
- **バージョン保存 & 履歴管理**: 保存時に Firebase UID と著者ラベルを Supabase に記録。履歴画面では複数バージョンを比較し、Diff を表示できます。
- **統計ダッシュボード**: 最新版と前回との差分、曖昧度スコアの推移、カテゴリ別件数、頻出の曖昧語を確認できます。

## 画面構成

| 画面                        | 概要                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| エディタ `/`                | 入力・検出・言い換え・保存を行います。ローカルとクラウドに履歴を残し、計測時間のメトリクスも表示します。              |
| 履歴 `/history`             | 記事一覧とバージョン一覧、比較用 Diff、バージョン削除機能を提供します。ログイン中のユーザーのデータのみ取得されます。 |
| ダッシュボード `/dashboard` | 直近の改善状況や曖昧度の推移、カテゴリ別トレンド、頻出語ランキングを可視化します。                                    |

## 技術スタック

- **フロントエンド**: React 19, Vite, TypeScript, Tailwind CSS (shadcn/ui), Monaco Editor, Recharts
- **認証**: Firebase Authentication (Email/Password)
- **バックエンド**: Firebase Functions (Node.js 20, TypeScript)
- **データストア**: Supabase (PostgreSQL) + Prisma
- **AI**: OpenAI API (GPT-4o-mini)
- **インフラ**: Firebase Hosting & Functions、Firebase Emulator でのローカル開発
- **品質管理**: Jest, React Testing Library, ESLint, TypeScript 型チェック

## ディレクトリ構成（抜粋）

```
.
├─ src/                    # Web フロント
│  ├─ pages/               # ルーティング単位のページ（Editor / History / Dashboard）
│  ├─ components/          # Atomic Design ベースの UI コンポーネント
│  ├─ contexts/, hooks/    # 認証状態や共通ロジック
│  ├─ lib/                 # API ラッパー、検出ロジック、Firebase 初期化、履歴管理
│  └─ index.css            # Tailwind & カスタムスタイル
├─ functions/              # Firebase Functions (バックエンド API)
│  ├─ src/
│  │  ├─ index.ts          # エントリーポイント（rewrite / versions / dashboard をエクスポート）
│  │  ├─ rewrite.ts        # 言い換え API
│  │  ├─ versions.ts       # 記事 & バージョン API (CRUD)
│  │  ├─ dashboard.ts      # ダッシュボード用統計 API
│  │  ├─ storage.ts        # Prisma / メモリ実装をラップしたストレージ層
│  │  └─ auth.ts, db.ts    # Firebase Admin, Prisma Client 初期化
│  └─ lib/                 # ビルド済み JavaScript
├─ prisma/                 # Prisma スキーマとマイグレーション
├─ firebase.json           # Hosting / Functions のルーティング設定
├─ Makefile                # よく使うタスクをまとめたコマンド
└─ README.md
```

## セットアップ

### 前提条件

- Node.js 20 以上
- npm (または互換のパッケージマネージャ)
- Firebase CLI (`npm install -g firebase-tools`)
- Supabase など PostgreSQL 接続先
- OpenAI API キー

### 1. 依存関係のインストール

```bash
npm install
npm --prefix functions install
```

### 2. 環境変数の設定

#### Web (Vite) 用 `.env.local`

プロジェクトルートに配置します。

```
VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef0123456789
```

#### Functions 用

- 本番デプロイ用: `functions/.env`
- エミュレータ用: `functions/.env.local` (Firebase Emulator 起動時に読み込み)

```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>?schema=public&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>?schema=public
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 💡 Supabase を利用する場合、`DATABASE_URL` には connection pooler (6543) を、`DIRECT_DATABASE_URL` には通常ポート (5432) を指定すると Prisma Migrate と Functions 実行を両立できます。

#### Firebase 認証情報

- ローカル開発では Emulator + `firebase login:ci` 等で取得した資格情報を使用します。
- 本番デプロイ時は `firebase deploy` 実行ユーザーの権限が利用されます。

### 3. データベース準備

Prisma スキーマ (Supabase 上の `article_versions` など) を適用します。

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
# ローカル開発で新規マイグレーションを作る場合
npx prisma migrate dev --schema prisma/schema.prisma
```

### 4. Firebase Emulator の起動

1. Functions をトランスパイル
   ```bash
   npm run build:functions
   ```
2. 環境変数を読み込んだ状態で Emulator を起動
   ```bash
   firebase emulators:start --only functions,hosting
   ```

### 5. フロントエンドの開発サーバ

別ターミナルで以下を実行します。

```bash
npm run dev
```

Firebase Authentication の Email/Password プロバイダを有効化し、エミュレータまたは本番プロジェクト側でユーザーを作成してください。ログインしていない場合、認証が必要なページは `/login` にリダイレクトされます。

## よく使うコマンド

| コマンド                  | 説明                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `npm run dev`             | Vite 開発サーバ (http://localhost:5173)                     |
| `npm run build`           | Web アプリの本番ビルド (dist/)                              |
| `npm run build:functions` | Functions の TypeScript ビルド                              |
| `npm test`                | Jest テスト (React Testing Library)                         |
| `npm run lint`            | ESLint                                                      |
| `npm run typecheck`       | TypeScript 型チェック                                       |
| `make deploy`             | Firebase Hosting + Functions へ本番デプロイ (Makefile 参照) |
| `make deploy-preview`     | Firebase Hosting のプレビューチャネルへデプロイ             |

## 提供 API エンドポイント (Firebase Functions)

| メソッド / パス            | 説明                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /api/rewrite`        | 言い換え候補を生成。リクエスト: `{ text, context?, style? }`。レスポンス: `{ rewrite, reason }`      |
| `GET /api/versions`        | 記事一覧 (`take`, `skip`)、`articleId` ごとの詳細、`versionId` 詳細を返す (Firebase ID トークン必須) |
| `POST /api/versions`       | 記事バージョンの保存。本文、検出結果、著者ラベルを登録                                               |
| `DELETE /api/versions/:id` | バージョン削除。`findings → check_runs → article_versions` の順に削除                                |
| `GET /api/dashboard`       | ログイン中ユーザーのダッシュボード統計を返却                                                         |

すべての API は `Authorization: Bearer <Firebase ID トークン>` ヘッダー必須です。

## データモデル概要

- **User**: Firebase UID を主キーとして保持。`authorLabel` を更新
- **Article**: 著者ごとの記事。`versions` との 1:N 関係
- **ArticleVersion**: 記事のバージョン履歴 (本文を保存)
- **CheckRun**: 保存時の検出結果を統計化 (曖昧度スコア、件数、文字数)
- **Finding**: 各曖昧表現の位置情報・カテゴリ・理由

Prisma スキーマは `prisma/schema.prisma` を参照してください。

## ブラウザ拡張機能に関する注意

一部の広告ブロッカーやネットワーク制御系のブラウザ拡張がリクエストを改変し、保存 API (`/api/versions`) が 404 になることがあります。その場合はシークレットウィンドウでの利用や、該当拡張機能を一時的に無効化してください。

## トラブルシューティング

| 症状                                    | 対処                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Missing Firebase configuration` エラー | `VITE_FIREBASE_*` の各環境変数を再確認。Vite を再起動する                                                                                                                                  |
| ダッシュボードで 500 エラー             | Functions 側の `DATABASE_URL` が未設定、または Supabase 接続が拒否された可能性。ログに `prisma unavailable` が出ている場合は、メモリフォールバックが動作しないほどデータが空かどうかを確認 |
| DiffEditor でエラーが発生               | v0.4.0 以降はモデル保持を実装済み。ブラウザを再読み込みし、それでも出る場合は Issue へ報告                                                                                                 |
| OpenAI 429 / 401                        | `OPENAI_API_KEY` のレートやスコープを確認。環境変数を更新後は Functions を再ビルド                                                                                                         |
