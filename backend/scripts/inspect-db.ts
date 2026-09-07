import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
import * as admin from 'firebase-admin';

function parsePrivateKey(rawKey: string): string {
  let key = (rawKey || '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID!,
    privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    clientId: process.env.FIREBASE_CLIENT_ID!,
  } as admin.ServiceAccount),
});

const db = admin.firestore();

async function check() {
  const locs = await db.collection('locations').get();
  console.log('=== Total Locations in DB: ' + locs.size + ' ===');
  locs.docs.forEach(d => console.log('Location Doc ID: [' + d.id + '] Data ID: [' + d.data().id + '] Name: [' + d.data().name + ']'));

  const infra = await db.collection('infrastructure').get();
  console.log('=== Total Infrastructure in DB: ' + infra.size + ' ===');
  infra.docs.slice(0, 5).forEach(d => console.log('Infra Doc ID: [' + d.id + '] Roads:', (d.data().roads || []).length, 'Schools:', (d.data().schools || []).length, 'Hospitals:', (d.data().hospitals || []).length));

  const terrain = await db.collection('terrain').get();
  console.log('=== Total Terrain in DB: ' + terrain.size + ' ===');

  const soil = await db.collection('soil').get();
  console.log('=== Total Soil in DB: ' + soil.size + ' ===');
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
