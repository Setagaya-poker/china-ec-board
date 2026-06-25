# 中国越境EC 施策・QA管理ボード

中国越境EC事業の案件、施策、調査依頼、QAを忘れないためのMVPです。

## まず動かす手順

```bash
cd "/Users/keiichiumezawa/Documents/中国EC"
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 今入っている画面

- ログイン画面の見た目
- 案件カンバン画面
- タグ別横断ビュー
- 案件詳細Drawer
- QA/調査依頼一覧
- QA/調査依頼詳細Drawer
- タグ管理画面
- ユーザー許可リスト管理画面

## 注意

現時点はローカル画面確認用です。Supabase、Google OAuth、Vercel接続は次の段階で設定します。

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
