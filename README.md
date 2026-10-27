# 漢字勉強サイト

漢字レベル7・8の画像と読み方を学習できる、React + TypeScript製のWebアプリケーションです。

## 機能

- 漢字一覧、検索、単語帳、クイズ
- 経験値、レベル、コイン、バッジ
- カードコレクション、キャラクター、ショップ、スキルツリー
- ストーリーモード
- 回転（インクリメンタル）ゲーム
- 免責事項、利用規約、静的パッチノート

## データ保存

このアプリは外部サービスを使用しません。

- ゲーム進行状況はブラウザの`localStorage`に保存します
- ストーリー進行状況も`localStorage`に保存します
- 回転ゲームの状態も`localStorage`に保存します
- ブラウザや端末を変更した場合、データは自動的に同期されません
- プロフィール画面からローカルのゲームデータを削除できます

## セットアップ

```bash
npm install
npm run dev
```

ビルド:

```bash
npm run build
```

## ページ構成

- `/` - 漢字学習
- `/profile` - プロフィールとローカルデータ管理
- `/characters` - キャラクター
- `/shop` - ショップ
- `/collection` - カードコレクション
- `/collection-plus` - コレクション+
- `/skill-tree` - スキルツリー
- `/revolution` - 回転ゲーム
- `/title` - ストーリータイトル
- `/chapter-select` - 章選択
- `/story` - ストーリー
- `/simple` - シンプル漢字一覧

## 技術スタック

- React 19
- TypeScript
- Vite
- React Router
- `localStorage`

