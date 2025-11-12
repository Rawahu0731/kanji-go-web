# 漢字勉強サイト (kanji-go-web)

漢字レベル7・8の画像と読み方を学習できるWebアプリケーションです。不具合情報は microCMS で管理しています。

## 機能

- 漢字一覧表示（レベル7・8）
- 問題モード（入力形式・四択形式）
- 単語帳モード
- ジャンル絞り込み
- 検索機能（送り仮名検索、構成要素検索）
- 不具合情報（microCMS連携）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. microCMS の設定

不具合情報を表示するには、microCMS のセットアップが必要です。

#### microCMS 側の設定

1. [microCMS](https://microcms.io/) でアカウント作成・ログイン
2. 新しいサービスを作成（サービスID をメモ）
3. API を作成:
   - **エンドポイント名**: `articles`
   - **APIの型**: リスト形式
4. API スキーマ（フィールド）を以下のように設定:

| フィールドID | 表示名 | 種類 | 必須 | 説明 |
|-------------|--------|------|------|------|
| `title` | タイトル | テキストフィールド | ✓ | 記事のタイトル |
| `date` | 日付 | 日時 | ✓ | 報告日 |
| `body` | 本文 | リッチエディタ | ✓ | 記事の本文（HTML） |
| `type` | 種類 | セレクトフィールド | ✓ | `bug` (不具合情報用) |
| `status` | ステータス | セレクトフィールド |  | 不具合の状態 |
| `tags` | タグ | 複数選択 |  | 任意のタグ |

**`type` フィールドの選択肢**:
- `bug` (不具合情報用)

**`status` フィールドの選択肢**:
- `investigating` (調査中)
- `fixed` (修正済み)
- `wontfix` (対応なし)

5. APIキーを発行:
   - 「API キー」→「新規作成」
   - **GET のみ許可** する読み取り専用キーを作成
   - キーをメモ

#### アプリケーション側の設定

1. `.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

2. `.env` に microCMS の情報を記入:

```env
VITE_MICROCMS_SERVICE_ID=your-service-id
VITE_MICROCMS_API_KEY=your-api-key
```

- `VITE_MICROCMS_SERVICE_ID`: microCMS のサービスID
- `VITE_MICROCMS_API_KEY`: 読み取り専用の APIキー

> **⚠️ セキュリティ注意**  
> クライアントサイドで API キーを使用するため、**必ず読み取り専用（GET のみ）**のキーを使用してください。書き込み権限のあるキーは使用しないでください。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開いてアクセスできます。

### 4. ビルド

```bash
npm run build
```

ビルドされたファイルは `dist/` ディレクトリに出力されます。

## ページ構成

- `/` - メイン画面（漢字学習）
- `/patch-notes.html` - パッチノート（更新履歴）※静的HTML
- `/known-issues` - 既知の不具合（microCMS連携）

## 技術スタック

- **フレームワーク**: React 19 + TypeScript
- **ビルドツール**: Vite (rolldown-vite)
- **ルーティング**: React Router
- **CMS**: microCMS (不具合情報管理)
- **スタイル**: CSS

## microCMS コンテンツの追加方法

1. microCMS の管理画面にログイン
2. `articles` API を開く
3. 「コンテンツを追加」をクリック
4. 必要な情報を入力:
   - **タイトル**: 不具合のタイトル
   - **日付**: 報告日
   - **本文**: HTML形式で記述（リッチエディタを使用）
   - **種類**: `bug`（不具合）を選択
   - **ステータス**: 
     - `investigating` (🔍 調査中) - 調査・対応を検討中
     - `fixed` (✅ 修正済み) - 修正が完了
     - `wontfix` (⚪ 対応なし) - 仕様や対応不要（自然解決含む）
   - **タグ**: 任意（例: `緊急`, `UI` など）
5. 「公開」をクリック

サイトをリロードすると、新しいコンテンツが反映されます。ステータスはタイトルの横にバッジで表示されます。

## ライセンス

MIT

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
