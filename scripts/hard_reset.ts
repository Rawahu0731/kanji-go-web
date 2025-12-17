/**
 * Hard reset script for Season 2
 * Usage:
 *   node -r ts-node/register scripts/hard_reset.ts --serviceAccount=./serviceAccountKey.json --dryRun
 *
 * The script will:
 *  - Read all documents in `users` collection
 *  - Copy each user doc into `archive/season1/users/{uid}` with `archivedAt`
 *  - Copy ranking (if exists) into `archive/season1/rankings/{uid}`
 *  - Replace `users/{uid}` with a minimal document keeping `username` and basic account fields
 *  - Create empty subdocs under users/{uid}/{key}/data for `cardCollection`,`characters`,`collectionPlus`,`collectionPlusPlus`,`skillLevels`
 *
 * WARNING: This script performs destructive updates when not run with `--dryRun`.
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

interface Args {
  serviceAccount?: string;
  dryRun?: boolean;
}

const argv = require('minimist')(process.argv.slice(2));
const args: Args = {
  serviceAccount: argv.serviceAccount,
  dryRun: !!argv.dryRun,
};

if (!args.serviceAccount) {
  console.error('Missing --serviceAccount=path/to/key.json');
  process.exit(1);
}

const keyPath = path.resolve(process.cwd(), args.serviceAccount);
if (!fs.existsSync(keyPath)) {
  console.error('service account file not found:', keyPath);
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function archiveAndResetAll() {
  console.log('Starting hard reset (dryRun=' + args.dryRun + ')');

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} user documents`);

  let count = 0;
  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    const data = doc.data();

    // Archive user doc
    const archiveUserRef = db.doc(`archive/season1/users/${uid}`);
    const rankingRef = db.doc(`rankings/${uid}`);
    const archiveRankingRef = db.doc(`archive/season1/rankings/${uid}`);

    if (args.dryRun) {
      console.log(`[DRY] Archive users/${uid} -> ${archiveUserRef.path}`);
    } else {
      await archiveUserRef.set({ archivedAt: Date.now(), data });
    }

    // Archive ranking if exists
    const rankingSnap = await rankingRef.get();
    if (rankingSnap.exists) {
      const rankingData = rankingSnap.data();
      if (args.dryRun) {
        console.log(`[DRY] Archive ranking ${rankingRef.path} -> ${archiveRankingRef.path}`);
      } else {
        await archiveRankingRef.set({ archivedAt: Date.now(), data: rankingData });
      }
    }

    // Build minimal user doc to keep (username and basic fields)
    const minimal: any = {
      username: data.username || null,
      updatedAt: Date.now(),
      season: 2,
      season2StartedAt: Date.now()
    };

    if (args.dryRun) {
      console.log(`[DRY] Write minimal users/${uid}:`, minimal);
    } else {
      await db.doc(`users/${uid}`).set(minimal, { merge: true });

      // Create empty subdocs for separated collections
      const empty = { value: [], updatedAt: Date.now() };
      const keys = ['cardCollection', 'characters', 'collectionPlus', 'collectionPlusPlus', 'skillLevels'];
      for (const key of keys) {
        await db.doc(`users/${uid}/${key}/data`).set(empty, { merge: true });
      }

      // Optionally remove ranking
      await rankingRef.delete().catch(() => {});
    }

    count++;
    if (count % 100 === 0) console.log(`Processed ${count} users...`);
  }

  console.log('Done. Processed', count);
}

archiveAndResetAll().catch(err => {
  console.error('Fatal error during hard reset:', err);
  process.exit(1);
});
