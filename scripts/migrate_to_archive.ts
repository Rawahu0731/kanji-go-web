/**
 * migrate_to_archive.ts
 * Usage:
 *  npx ts-node scripts/migrate_to_archive.ts --dry-run --limit=10
 *  npx ts-node scripts/migrate_to_archive.ts           (実行)
 *
 * 動作:
 *  - 指定したコレクションを `Archive/{collection}/{docId}/snapshot_{ISO}` にコピー
 *  - コピー成功後: users は `uid,email,displayName,playerName` のみ残して上書き
 *                その他のコレクションは元ドキュメントを削除
 *  - `--dry-run` を付けると書き込みを行わずログのみ出力
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin with optional service account JSON if provided.
try {
  const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (svcPath && fs.existsSync(svcPath)) {
    const abs = path.resolve(svcPath);
    const keyRaw = fs.readFileSync(abs, 'utf8');
    const key = JSON.parse(keyRaw);
    admin.initializeApp({ credential: admin.credential.cert(key) });
    console.log('Initialized admin SDK with service account:', abs);
  } else {
    admin.initializeApp();
    console.log('Initialized admin SDK with default credentials (GOOGLE_APPLICATION_CREDENTIALS not set or file missing)');
  }
} catch (e) {
  console.error('Failed to initialize Firebase Admin SDK:', e);
  process.exit(1);
}

const db = admin.firestore();

// include both singular and plural just in case different environments use either
const collectionsToArchive = ['users', 'revolution', 'ranking', 'rankings'];

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return undefined;
}

const dryRun = process.argv.includes('--dry-run');
const limitArg = getArg('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;

async function archiveCollection(collectionName: string) {
  console.log(`Processing collection: ${collectionName}`);
  let query = db.collection(collectionName) as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
  if (limit && limit > 0) query = query.limit(limit);

  const snapshot = await query.get();
  console.log(`Found ${snapshot.size} documents in ${collectionName}`);

  let processed = 0;
  for (const doc of snapshot.docs) {
    const docId = doc.id;
    const data = doc.data();
    const iso = new Date().toISOString();
    const archiveRef = db.collection('Archive').doc(collectionName).collection(docId).doc(`snapshot_${iso}`);

    console.log(`- Archiving ${collectionName}/${docId} -> Archive/${collectionName}/${docId}/snapshot_${iso}`);
    if (!dryRun) {
      try {
        await archiveRef.set({ source: data, archivedAt: admin.firestore.FieldValue.serverTimestamp() });
      } catch (err) {
        console.error(`  Failed to write archive for ${docId}:`, err);
        continue;
      }

      try {
        if (collectionName === 'users') {
          const keep: Record<string, any> = {};
          if (data.uid) keep.uid = data.uid;
          if (data.email) keep.email = data.email;
          if (data.displayName) keep.displayName = data.displayName;
          if (data.playerName) keep.playerName = data.playerName;
          await doc.ref.set(keep, { merge: false });
          console.log(`  Reset user ${docId} (kept fields: ${Object.keys(keep).join(', ')})`);
        } else {
          await doc.ref.delete();
          console.log(`  Deleted original doc ${collectionName}/${docId}`);
        }
      } catch (err) {
        console.error(`  Failed to clean original for ${docId}:`, err);
      }
    }

    processed++;
  }

  console.log(`Finished ${collectionName}: processed ${processed} documents.`);
}

async function main() {
  console.log('Starting migration to Archive. dryRun=', dryRun, ' limit=', limit);
  for (const c of collectionsToArchive) {
    try {
      await archiveCollection(c);
    } catch (err) {
      console.error(`Error processing collection ${c}:`, err instanceof Error ? err.stack || err.message : err);
    }
  }
  console.log('Migration complete.');
}

(async () => {
  try {
    await main();
    process.exit(0);
  } catch (e) {
    console.error('Fatal error:', e instanceof Error ? e.stack || e.message : e);
    process.exit(1);
  }
})();
