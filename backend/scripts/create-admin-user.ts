#!/usr/bin/env ts-node
/**
 * CREATE ADMIN USER — Run once after seeding
 * Usage: cd backend && npx ts-node scripts/create-admin-user.ts
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
  } as admin.ServiceAccount),
});

const db = admin.firestore();

async function main() {
  const email = process.argv[2] || 'admin@landslidewatch.in';
  const password = process.argv[3] || 'Admin@SIH2026';
  const displayName = process.argv[4] || 'System Administrator';

  try {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`User already exists: ${email}`);
    } catch {
      user = await admin.auth().createUser({ email, password, displayName });
      console.log(`Created user: ${email}`);
    }

    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    await db.collection('users').doc(user.uid).set({
      uid: user.uid, email, displayName, role: 'admin',
      createdAt: new Date().toISOString(), lastLogin: null,
    }, { merge: true });

    console.log(`\n✅ Admin user ready`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);

    // Create a viewer user for demo
    const viewerEmail = 'viewer@landslidewatch.in';
    let viewerUser;
    try {
      viewerUser = await admin.auth().getUserByEmail(viewerEmail);
    } catch {
      viewerUser = await admin.auth().createUser({ email: viewerEmail, password: 'Viewer@SIH2026', displayName: 'Demo Viewer' });
    }
    await admin.auth().setCustomUserClaims(viewerUser.uid, { role: 'viewer' });
    await db.collection('users').doc(viewerUser.uid).set({ uid: viewerUser.uid, email: viewerEmail, displayName: 'Demo Viewer', role: 'viewer', createdAt: new Date().toISOString(), lastLogin: null }, { merge: true });
    console.log(`\n✅ Viewer user ready`);
    console.log(`   Email: ${viewerEmail}`);
    console.log(`   Password: Viewer@SIH2026`);

    // Create authority user
    const authEmail = 'authority@landslidewatch.in';
    let authUser;
    try {
      authUser = await admin.auth().getUserByEmail(authEmail);
    } catch {
      authUser = await admin.auth().createUser({ email: authEmail, password: 'Authority@SIH2026', displayName: 'District Authority' });
    }
    await admin.auth().setCustomUserClaims(authUser.uid, { role: 'authority' });
    await db.collection('users').doc(authUser.uid).set({ uid: authUser.uid, email: authEmail, displayName: 'District Authority', role: 'authority', createdAt: new Date().toISOString(), lastLogin: null }, { merge: true });
    console.log(`\n✅ Authority user ready`);
    console.log(`   Email: ${authEmail}`);
    console.log(`   Password: Authority@SIH2026`);

    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin user:', err);
    process.exit(1);
  }
}

main();
