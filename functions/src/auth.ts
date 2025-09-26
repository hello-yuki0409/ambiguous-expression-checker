import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps } from "firebase-admin/app";

// Initialize Firebase Admin SDK once per instance
if (getApps().length === 0) {
  initializeApp();
}

export async function verifyFirebaseToken(authorizationHeader?: string) {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    throw new Error("unauthorized");
  }
  const idToken = authorizationHeader.split(" ")[1];
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded;
}
