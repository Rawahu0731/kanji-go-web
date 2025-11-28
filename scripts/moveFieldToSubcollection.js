import admin from 'firebase-admin';

/*
Usage:
  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
  node scripts/moveFieldToSubcollection.js <collectionPath> <fieldName> [subcollectionName] [batchSize]

What it does:
  - Finds documents in <collectionPath> where <fieldName> exists (uses inequality query).
  - For each document, creates a new doc in subcollection <subcollectionName> (default: "attachments")
    containing the field value and a migratedAt timestamp.
  - Removes the original field from the parent document.

Notes:
  - Run on a staging copy first. Always export/backup your DB before running.
  - Requires firebase-admin and GOOGLE_APPLICATION_CREDENTIALS to be set.
*/

if (process.argv.length < 4) {
  console.error('Usage: node moveFieldToSubcollection.js <collectionPath> <fieldName> [subcollectionName] [batchSize]');
  process.exit(1);
}

const [,, collectionPath, fieldName, subcollectionName = 'attachments', batchSizeArg = '300'] = process.argv;
const BATCH_SIZE = parseInt(batchSizeArg, 10) || 300;

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function migrateBatch() {
  // Query docs that have the field (where != null)
  const query = db.collection(collectionPath)
    .where(fieldName, '!=', null)
    .orderBy(fieldName)
    .limit(BATCH_SIZE);

  const snapshot = await query.get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (!(fieldName in data)) return;

    const value = data[fieldName];
    const subRef = doc.ref.collection(subcollectionName).doc();
    batch.set(subRef, {
      value,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(doc.ref, { [fieldName]: admin.firestore.FieldValue.delete() });
    count += 1;
  });

  await batch.commit();
  return count;
}

async function run() {
  console.log('Starting migration:', { collectionPath, fieldName, subcollectionName, BATCH_SIZE });
  try {
    let total = 0;
    while (true) {
      const moved = await migrateBatch();
      if (moved === 0) break;
      total += moved;
      console.log(`Moved ${moved} docs in this batch. Total: ${total}`);
      // small delay to avoid quota spikes
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log('Migration completed. Total moved:', total);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
