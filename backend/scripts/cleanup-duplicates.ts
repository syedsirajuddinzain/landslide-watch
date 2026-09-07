#!/usr/bin/env ts-node
/**
 * ONE-OFF CLEANUP — deletes ALL documents in the collections seed-locations.ts
 * populates, so you can re-seed from a clean slate with no duplicates.
 * Usage: cd backend && npx ts-node scripts/cleanup-duplicates.ts
 */
import dotenv from 'dotenv';
dotenv.config();
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    clientId: process.env.FIREBASE_CLIENT_ID!,
  } as admin.ServiceAccount),
});
const db = admin.firestore();

const COLLECTIONS = ['locations', 'terrain', 'soil', 'infrastructure', 'drainage', 'land_cover', 'rainfall', 'risk_assessments', 'historical_landslides'];

async function deleteCollection(name: string) {
  const snap = await db.collection(name).get();
  console.log(`${name}: deleting ${snap.size} documents...`);
  const batchSize = 400;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`${name}: done.`);
}

async function main() {
  console.log('🧹 Cleaning up ALL seed-related collections...\n');
  for (const c of COLLECTIONS) {
    await deleteCollection(c);
  }
  console.log('\n✅ Cleanup complete. Now run: npx ts-node scripts/seed-locations.ts');
  process.exit(0);
}
main().catch(err => { console.error('Cleanup failed:', err); process.exit(1); });