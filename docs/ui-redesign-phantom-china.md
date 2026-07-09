# Phantom China UI Redesign

## 作業ブランチ

`codex/ui-redesign`

## 作業開始前コミット

`662206b Use dedicated voice transcription endpoint`

## 目的

既存の保存処理、Supabase接続、認証、AI API、DB構造を変更せず、見た目とUIモーションだけを大きく差し替える実験ブランチです。

## 現行構造の確認

- `app/page.tsx`: 画面、状態管理、Supabase保存、AIタスク抽出、音声入力、Drawer/Modalが集約されています。
- `app/styles.css`: classic UIのグローバルCSSです。
- `app/layout.tsx`: グローバルCSS読み込みとHTMLルートです。
- `app/api/ai/*`: AI APIルートです。今回のUI改修では触りません。
- `lib/supabase.ts`: Supabaseクライアントです。今回のUI改修では触りません。

## 新UI関連ファイル

- `app/ui-theme-client.tsx`
- `app/phantom-china/tokens.css`
- `app/phantom-china/layout.css`
- `app/phantom-china/components.css`
- `app/phantom-china/motion.css`
- `app/phantom-china/responsive.css`

## 既存ファイルへの最小変更

- `app/layout.tsx`: 新UI CSSとテーマ初期化コンポーネントを読み込みます。
- `app/styles.css`: classicでもテーマ切替ボタンが画面端に固定される最低限のスタイルを追加しています。

## 配色整理

既存CSSから抽出した中国伝統色を、新UI用トークンへ整理しました。

- Primary: `#5d8160`
- Secondary: `#b18944`
- Accent: `#d66e26`
- Background Light: `#f4eee5`
- Surface: `#fffaf2`
- Surface Strong: `#f3e5ad`
- Border / Text: `#222326`
- Danger: `#b41e22`
- Warning: `#d8b953`

## テーマ切り替え

新UI:

```text
http://localhost:3000/?theme=phantom-china
```

旧UI:

```text
http://localhost:3000/?theme=classic
```

画面右下の小さなテーマボタンでも切り替えできます。選択結果は `localStorage` の `dashboard-ui-theme` に保存されます。

## localStorageを消して戻す方法

ブラウザのDevTools Consoleで以下を実行します。

```js
localStorage.removeItem("dashboard-ui-theme");
location.href = "/?theme=classic";
```

## 新UIファイルを読み込まない方法

`app/layout.tsx` から以下のimportを外します。

```ts
import "./phantom-china/tokens.css";
import "./phantom-china/layout.css";
import "./phantom-china/components.css";
import "./phantom-china/motion.css";
import "./phantom-china/responsive.css";
```

あわせて `<UiThemeClient />` と `import { UiThemeClient } from "./ui-theme-client";` を外すと、完全にclassicだけになります。

## ブランチごと破棄する方法

この実験を採用しない場合は、`codex/ui-redesign` を破棄して `main` に戻します。

```bash
git switch main
git branch -D codex/ui-redesign
```

## 個別revertの順序

1. 新UI CSS追加コミットをrevert
2. テーマ基盤追加コミットをrevert

この順序なら、classic UIへの影響を最小にできます。

## 画面幅の方針

今回のユーザー確認により、スマホ向けレスポンシブ最適化は対象外にしました。

新UIはデスクトップ業務利用を前提に、最小幅 `1180px` を維持します。狭いブラウザでは要素を無理に縦積みせず、横スクロールでデスクトップレイアウトを保ちます。

## リスク

- `app/page.tsx` が大きいため、今後の本格リデザインではコンポーネント分割した方が安全です。
- 新UIはCSS override中心なので、既存class名が変わると見た目が崩れます。
- clip-pathを多用するため、古いブラウザでは一部の斜め形状が弱く表示される可能性があります。
- スマホ表示は今回の対象外です。
