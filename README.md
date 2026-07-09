# Dragon Deck

中国越境EC事業の施策、定常運用、タスクを忘れないためのボードです。

## まず動かす手順

```bash
cd "/Users/keiichiumezawa/Documents/中国EC"
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 今入っている画面

- ログイン画面の見た目
- 施策ダッシュボード
- タグ別横断ビュー
- 案件詳細Drawer
- タスクリスト
- タスク詳細Drawer
- タグ管理画面
- ユーザー許可リスト管理画面

## 環境の分け方

本番データを壊さないため、Supabaseは本番用とステージング用を分けます。

```text
Vercel Production / main
  -> Supabase Production

Vercel Preview / 改修ブランチ
  -> Supabase Staging

ローカル開発
  -> Supabase Staging
```

ローカルの `.env.local` には、原則としてステージングSupabaseのURLとPublishable keyを入れます。本番Supabaseの値はVercel Productionだけに設定します。

## 本番DB操作の安全ルール

本番Supabaseに対するデータベース操作は、事故防止のため以下を必ず守ります。

- 本番DBで許可なく実行してよいのは `select` などの読み取りだけ
- 本番DBへの `insert`、`update`、`delete`、`alter`、`create`、`drop`、`truncate` は必ず事前にユーザー確認を取る
- 本番DBにDDLやデータ変更SQLを流す前に、対象SQL、影響範囲、戻し方を説明する
- 本番DBの変更前にはバックアップまたは復元方法を確認する
- Codexから本番DBを変更する場合も、ユーザーの明示的な許可なしに実行しない
- ステージングDBのデータ入れ替えは開発用途として許可するが、実行前に対象がステージングであることを確認する

このルールはSupabase CLI、Supabase MCP、SQL Editorのどれを使う場合も同じです。

## Supabase CLIとMCPの使い分け

このプロジェクトでは、Supabase CLIを正式なDB変更ルート、Supabase MCPを調査・確認の補助として使います。

### Supabase CLIでやること

- DBスキーマ変更をマイグレーションSQLとして管理する
- ステージングDBへマイグレーションを適用する
- 本番DBへ適用する前に、差分を確認する
- ローカルSupabase環境を使う場合に起動する

CLIは履歴がGitに残るため、DB変更の正式ルートに向いています。

### Supabase MCPでやること

- テーブル一覧やカラム確認
- 件数確認
- RLSポリシー確認
- ログやエラー調査
- SQLの読み取り系確認

MCPは便利ですが、AIからDBを直接操作できるため危険もあります。最初はステージングSupabaseだけに接続し、本番Supabaseには接続しない運用にします。

### MCPの安全ルール

- 最初はステージングDBのみ接続する
- 可能ならRead-only設定で始める
- 本番DBへの `execute_sql` や `apply_migration` は、ユーザーの明示確認なしに使わない
- 本番DBの変更はマイグレーションSQLを確認してから、人間が実行する
- `drop table`、`truncate`、既存データを消すSQLは禁止

Supabase公式ドキュメントでは、MCPはAIツールからSupabaseプロジェクトへ接続し、テーブル確認、SQL実行、マイグレーション適用などができる機能として説明されています。だからこそ、最初はステージング限定にします。

## ステージングSupabaseを作る手順

### 1. Supabaseでステージングプロジェクトを作る

Supabase Dashboardで新しいプロジェクトを作ります。

推奨名:

```text
china-ec-board-staging
```

リージョンやプランは、本番と同じか近いものにします。

### 2. ステージングDBにスキーマを作る

まず本番DBではなく、ステージングDBのSQL Editorで実行します。

1. `supabase/schema.sql`
2. `supabase/seed-tags.sql`
3. `supabase/20260708_add_project_card_due_date.sql`
4. `supabase/20260708_add_mini_tasks.sql`
5. `supabase/20260709_update_mini_task_statuses.sql`
6. 必要に応じて `supabase/secure-auth-policies.sql`

既存の本番データはコピーしません。確認に必要なダミーデータだけをステージングに入れます。

### 3. Googleログイン設定をステージングにも入れる

Supabase Stagingの `Authentication` でGoogle Providerを有効化します。

URL Configurationには、少なくとも以下を追加します。

```text
http://localhost:3000
https://<Vercel Preview URL>
```

### 4. Vercelの環境変数を分ける

Vercel Project `china-ec-board` の Environment Variables で、同じキー名を環境ごとに別の値で設定します。

Production:

```env
NEXT_PUBLIC_SUPABASE_URL=本番SupabaseのURL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=本番SupabaseのPublishable key
```

Preview / Development:

```env
NEXT_PUBLIC_SUPABASE_URL=ステージングSupabaseのURL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ステージングSupabaseのPublishable key
```

Vercelの環境変数は、変更後の新しいデプロイから反映されます。設定変更後はPreviewを再デプロイします。

## Supabaseプロジェクト作成後にやること

### 1. テーブルを作る

Supabase Dashboardで作成したプロジェクトを開きます。

1. 左メニューの `SQL Editor` を開く
2. `New query` を押す
3. このリポジトリの `supabase/schema.sql` の中身をすべてコピーする
4. SQL Editorに貼り付ける
5. `Run` を押す

成功すると、`Table Editor` に以下のテーブルができます。

- `tags`
- `project_cards`
- `project_card_tags`
- `qa_logs`
- `qa_log_tags`
- `allowed_users`
- `attachments`

### 2. 接続情報を控える

Supabase Dashboardでプロジェクトを開き、`Connect` または `Settings > API Keys` から以下を確認します。

- Project URL
- Publishable key

Supabaseの現在の案内では、ブラウザ側から使うキーは `sb_publishable_...` のPublishable keyを使います。古い画面の場合は `anon public` key と表示されることがあります。

### 3. `.env.local` を作る

`.env.example` を参考にして、プロジェクト直下に `.env.local` を作ります。

```env
NEXT_PUBLIC_SUPABASE_URL=ここにProject URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ここにPublishable key
```

`.env.local` は秘密情報なのでGitには入れません。

### 4. 次に実装すること

ここまでできたら、アプリ側をSupabaseに接続します。

- `@supabase/supabase-js` を追加
- タグ一覧をSupabaseから取得
- 案件カードをSupabaseに保存
- QAログをSupabaseに保存
- 最後にGoogleログインとアクセス制限を入れる

## Googleログインと許可ユーザー制限

### 1. Supabase AuthでGoogleを有効化

Supabase Dashboardで以下を設定します。

1. `Authentication` を開く
2. `Sign In / Providers` を開く
3. `Google` を有効化する
4. Google Cloud Consoleで作った `Client ID` と `Client Secret` を入れる
5. Supabase側に表示される callback URL をGoogle Cloud Consoleの承認済みリダイレクトURIに登録する

ローカル確認では、Supabaseの `Authentication > URL Configuration` に `http://localhost:3000` を許可URLとして入れます。

### 2. 最初の管理者を登録してRLSを切り替える

`supabase/secure-auth-policies.sql` を開き、以下を書き換えます。

```sql
YOUR_GOOGLE_EMAIL@example.com
```

自分のGoogleメールに変更したら、Supabaseの `SQL Editor` で実行します。

これで `allowed_users` に入っているGoogleアカウントだけが、案件・QA・タグを読み書きできます。

### 3. チームメンバーを追加する

`supabase/add-allowed-user.sql` を開き、以下を書き換えます。

```sql
EMAIL_HERE@example.com
```

追加したいメンバーのGoogleメールに変更して、Supabaseの `SQL Editor` で実行します。
