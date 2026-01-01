// scripts/clear_revolution.js
// Usage:
//  node scripts/clear_revolution.js --dry-run
//  node scripts/clear_revolution.js --delete

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to service account JSON in this repo
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'secrets', 'kanji-study-50c28-firebase-adminsdk-fbsvc-5267decc62.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('Service account JSON not found at', SERVICE_ACCOUNT_PATH);
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listAndMaybeDelete(dryRun = true) {
  // Target collection used by client: test/root/revolution
  const collRef = db.collection('test').doc('root').collection('revolution');
  const snapshot = await collRef.get();
  console.log('Found', snapshot.size, 'revolution docs under test/root/revolution');

  let count = 0;
  for (const doc of snapshot.docs) {
    count++;
    const id = doc.id;
    const data = doc.data();
    console.log('\nDoc:', id, JSON.stringify({ updatedAt: data.updatedAt || null, infinityPoints: data.infinityPoints || null, ipUpgrades: data.ipUpgrades || null }));
    if (!dryRun) {
      try {
        await collRef.doc(id).delete();
        console.log('Deleted', id);
      } catch (err) {
        console.warn('Failed to delete', id, err);
      }
    }
  }

  console.log('\nProcessed', count, 'documents. dryRun=', dryRun);
}

(async () => {
  const args = process.argv.slice(2);
  const dryRun = args.indexOf('--delete') === -1;
  if (dryRun) console.log('Running in dry-run mode. Use --delete to actually remove docs.');
  try {
    await listAndMaybeDelete(dryRun);
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Error', err);
    process.exit(2);
  }
})();
