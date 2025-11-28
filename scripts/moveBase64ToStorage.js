import admin from 'firebase-admin';
import path from 'path';

/*
Usage:
  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
  node scripts/moveBase64ToStorage.js <collectionPath> <fieldName> <bucketName> [batchSize]

What it does:
  - Finds documents in <collectionPath> where <fieldName> contains a data URI (base64).
  - Uploads the decoded bytes to Cloud Storage under <bucketName>/<collectionPath>/<docId>/...
  - Replaces the field in Firestore with a storage path (gs://...) and adds storage metadata.

Notes:
  - Requires firebase-admin and proper Storage permissions. Test on staging first.
  - Bucket visibility and URL accessibility depends on bucket ACLs/permissions.
*/

if (process.argv.length < 5) {
  console.error('Usage: node moveBase64ToStorage.js <collectionPath> <fieldName> <bucketName> [batchSize]');
  process.exit(1);
}

const [,, collectionPath, fieldName, bucketName, batchSizeArg = '200'] = process.argv;
const BATCH_SIZE = parseInt(batchSizeArg, 10) || 200;

admin.initializeApp({ credential: admin.credential.applicationDefault(), storageBucket: bucketName });
const db = admin.firestore();
const bucket = admin.storage().bucket(bucketName);

const dataUriRegex = /^data:([^;]+);base64,(.*)$/;

async function processBatch() {
  const query = db.collection(collectionPath)
    .where(fieldName, '!=', null)
    .limit(BATCH_SIZE);

  const snapshot = await query.get();
  if (snapshot.empty) return 0;

  const updates = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const raw = data[fieldName];
    if (!raw || typeof raw !== 'string') continue;
    const m = raw.match(dataUriRegex);
    if (!m) continue; // not a data URI

    const contentType = m[1];
    const b64 = m[2];
    const ext = contentType.split('/')[1] || 'bin';
    const filename = `${doc.id}-${fieldName}-${Date.now()}.${ext}`;
    const destPath = path.posix.join(collectionPath, doc.id, filename);

    const buffer = Buffer.from(b64, 'base64');
    const file = bucket.file(destPath);
    await file.save(buffer, { metadata: { contentType } });

    const gsPath = `gs://${bucketName}/${destPath}`;
    updates.push({ ref: doc.ref, update: { [fieldName]: gsPath, storagePath: destPath, storageContentType: contentType } });
  }

  // commit updates in batches
  let i = 0;
  while (i < updates.length) {
    const batch = db.batch();
    const chunk = updates.slice(i, i + 400);
    for (const u of chunk) batch.update(u.ref, u.update);
    await batch.commit();
    i += chunk.length;
  }

  return snapshot.size;
}

async function run() {
  console.log('Starting base64->Storage migration:', { collectionPath, fieldName, bucketName, BATCH_SIZE });
  try {
    let total = 0;
    while (true) {
      const processed = await processBatch();
      if (processed === 0) break;
      total += processed;
      console.log(`Processed ${processed} documents in this batch. Total scanned: ${total}`);
      await new Promise((r) => setTimeout(r, 300));
    }
    console.log('Migration completed. Total scanned:', total);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
