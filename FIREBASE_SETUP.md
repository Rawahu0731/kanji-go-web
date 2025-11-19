# Firebase セットアップガイド

このアプリケーションでは、ランキング機能とクロスデバイス同期にFirebaseを使用しています。

## 🔥 Firebase の設定方法

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: kanji-go-web）
4. Google Analyticsは任意で設定
5. プロジェクトを作成

### 2. Webアプリの登録

1. Firebaseコンソールのプロジェクト画面で、「ウェブアプリを追加」（</>アイコン）をクリック
2. アプリのニックネームを入力（例: kanji-go-web）
3. Firebase Hostingは任意
4. 「アプリを登録」をクリック
5. 表示される設定情報（apiKey, authDomain など）をメモ

### 3. Authentication の設定

1. Firebaseコンソールで「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブを選択
4. 「Google」を選択して有効化
5. プロジェクトのサポートメールを設定して保存

### 4. Firestore Database の設定

1. Firebaseコンソールで「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. 本番環境モードまたはテストモードを選択（推奨: 本番環境モード）
4. ロケーションを選択（推奨: asia-northeast1 (東京)）
5. 「有効にする」をクリック

### 5. Firestore のセキュリティルール設定

Firestore Databaseの「ルール」タブで、以下のルールを設定してください：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーデータ: ログインユーザーのみ自分のデータを読み書き可能
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // ランキングデータ: 全員が読み取り可能、ログインユーザーのみ自分のデータを書き込み可能
    match /rankings/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

「公開」をクリックしてルールを適用します。

### 6. 環境変数の設定

1. `.env.example`ファイルをコピーして`.env`ファイルを作成：
   ```bash
   cp .env.example .env
   ```

2. `.env`ファイルを編集し、手順2でメモした設定情報を入力：
   ```
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

3. 開発サーバーを再起動：
   ```bash
   npm run dev
   ```

## 📋 機能説明

### ログイン機能
- ヘッダーの「Googleでログイン」ボタンからログイン
- ログインすると、プレイデータが自動的にFirebaseに保存されます
- 別の端末でも同じGoogleアカウントでログインすれば、同じデータで続きをプレイできます

### ランキング機能
- ヘッダーの「🏆 ランキング」ボタンからランキングページにアクセス
- 累計XPでプレイヤーがランキング表示されます
- リアルタイムで他のプレイヤーと競争できます

### データ同期
- ログイン中はプレイデータが自動的にFirebaseに保存されます
- ローカルストレージにも保存されるため、オフラインでもプレイ可能
- ログインしていない場合は、ローカルストレージのみでデータが管理されます

## 🚨 注意事項

- `.env`ファイルは**絶対にGitにコミットしないでください**
- `.gitignore`に`.env`が含まれていることを確認してください
- 本番環境では、Firebaseのセキュリティルールを適切に設定してください
- Firebase Blaze プラン（従量課金）にアップグレードすると、より多くのリクエストを処理できます

## 🔧 トラブルシューティング

### ログインできない
- Firebase Console で Authentication の Google プロバイダーが有効になっているか確認
- `.env`ファイルの設定値が正しいか確認
- ブラウザのコンソールにエラーメッセージが表示されていないか確認

### データが保存されない
- Firestore Database が有効になっているか確認
- セキュリティルールが正しく設定されているか確認
- ブラウザのコンソールで Firebase エラーを確認

### ランキングが表示されない
- Firestore の `rankings` コレクションにデータが存在するか確認
- セキュリティルールで読み取りが許可されているか確認

## 💡 Firebase なしで使用する場合

Firebaseの設定をしない場合でも、アプリは正常に動作します：
- ログイン機能は表示されません
- ランキング機能は使用できません
- データはローカルストレージのみに保存されます
- 各端末で独立したデータとなります

完全な機能を使用するには、Firebaseの設定を行ってください。
