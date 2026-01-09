/**
 * Remove "zero" character from all users (only if story is not unlocked)
 * Usage:
 *   npx ts-node scripts/remove_zero_character.cts --serviceAccount=./secrets/kanji-study-50c28-firebase-adminsdk-fbsvc-5267decc62.json --dryRun
 *   npx ts-node scripts/remove_zero_character.cts --serviceAccount=./secrets/kanji-study-50c28-firebase-adminsdk-fbsvc-5267decc62.json
 *
 * The script will:
 *  - Read all documents in `users` collection
 *  - Check if user has story unlocked (hasStoryInvitation, unlockedScenes, etc.)
 *  - If story is NOT unlocked and user has "zero" character, remove it
 *  - If story IS unlocked, keep "zero" character (skip removal)
 *  - Update the document
 *
 * WARNING: This script performs destructive updates when not run with `--dryRun`.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

interface Args {
  serviceAccount?: string
  dryRun?: boolean;
}

const argv = minimist(process.argv.slice(2));
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

const serviceAccountJson = fs.readFileSync(keyPath, 'utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);

try {
  console.log('Loaded serviceAccount keys:', Object.keys(serviceAccount).slice(0, 3).join(', '));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('Firebase Admin initialized successfully');
} catch (err) {
  console.error('Failed to initialize firebase-admin:', err);
  process.exit(1);
}

const db = admin.firestore();

async function removeZeroCharacter() {
  console.log('Starting zero character removal (dryRun=' + args.dryRun + ')');

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} user documents`);

  let processedCount = 0;
  let removedFromCollectionCount = 0;
  let removedFromEquippedCount = 0;

  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    let userModified = false;

    // Read main user document data to check story progress
    const userData = doc.data();
    const storyUnlocked = !!(
      userData?.hasStoryInvitation ||
      (Array.isArray(userData?.unlockedScenes) && userData.unlockedScenes.length > 0) ||
      (Array.isArray(userData?.completedChapters) && userData.completedChapters.length > 0) ||
      (Array.isArray(userData?.clearedQuizzes) && userData.clearedQuizzes.length > 0) ||
      userData?.hasCompletedEndroll
    );

    // Check characters subcollection
    const charactersRef = db.doc(`users/${uid}/characters/data`);
    const charactersSnap = await charactersRef.get();

    if (charactersSnap.exists) {
      const charactersData = charactersSnap.data();
      const characters = charactersData?.value || [];

      // Check if user has "zero" character
      const hasZero = characters.some((char) => char.id === 'zero');

      if (hasZero) {
        if (storyUnlocked) {
          if (args.dryRun) {
            console.log(`[SKIP] User ${uid} has story unlocked; keeping "zero"`);
          }
        } else {
          const filteredCharacters = characters.filter((char) => char.id !== 'zero');
          if (args.dryRun) {
            console.log(`[DRY] Remove "zero" from users/${uid}/characters/data`);
            console.log(`  Before: ${characters.length} characters`);
            console.log(`  After: ${filteredCharacters.length} characters`);
          } else {
            await charactersRef.update({
              value: filteredCharacters,
              updatedAt: Date.now()
            });
            console.log(`✓ Removed "zero" from users/${uid}/characters/data`);
          }
          removedFromCollectionCount++;
          userModified = true;
        }
      }
    }

    // Check if "zero" is equipped in the main user document (only remove when story not unlocked)
    const equippedCharacter = userData?.equippedCharacter;

    if (equippedCharacter && equippedCharacter.id === 'zero') {
      if (storyUnlocked) {
        if (args.dryRun) {
          console.log(`[SKIP] User ${uid} has story unlocked; keeping equipped "zero"`);
        }
      } else {
        if (args.dryRun) {
          console.log(`[DRY] Remove "zero" from users/${uid} equippedCharacter`);
        } else {
          await db.doc(`users/${uid}`).update({
            equippedCharacter: null,
            updatedAt: Date.now()
          });
          console.log(`✓ Removed "zero" from users/${uid} equippedCharacter`);
        }
        removedFromEquippedCount++;
        userModified = true;
      }
    }

    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(`Processed ${processedCount} users...`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total users processed: ${processedCount}`);
  console.log(`Users with "zero" in collection: ${removedFromCollectionCount}`);
  console.log(`Users with "zero" equipped: ${removedFromEquippedCount}`);
  console.log(`${args.dryRun ? '[DRY RUN] No changes were made' : 'Removal completed'}`);
}

removeZeroCharacter().catch(err => {
  console.error('Fatal error during zero character removal:', err);
  process.exit(1);
});
