import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Lazy initialize Firebase Admin SDK to ensure zero startup crash if credentials are setup dynamically
let firestoreDb: Firestore | null = null;

export function setFirestoreDbForTesting(db: any | null) {
  firestoreDb = db;
}

export function getFirestoreDb(): Firestore {
  if (!firestoreDb) {
    if (getApps().length === 0) {
      const serviceAccountKeyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

      if (serviceAccountKeyJson) {
        try {
          const serviceAccount = JSON.parse(serviceAccountKeyJson);
          initializeApp({
            credential: cert(serviceAccount),
            projectId: projectId || serviceAccount.project_id,
          });
        } catch (e) {
          throw new Error('FAIL-CLOSED 安全中斷：解析 FIREBASE_SERVICE_ACCOUNT_KEY 失敗，拒絕降級為本地或不安全存取。');
        }
      } else {
        // Automatically utilize Google Cloud Run default environment service account
        if (!projectId && process.env.NODE_ENV === 'production') {
          throw new Error('FAIL-CLOSED 安全中斷：未設定 FIREBASE_PROJECT_ID 或 GOOGLE_CLOUD_PROJECT，禁止正式資料庫操作。');
        }
        initializeApp({
          projectId: projectId || undefined,
        });
      }
    }
    firestoreDb = getFirestore();
    // Enable ignoreUndefinedProperties for Firestore clean document serialization
    firestoreDb.settings({ ignoreUndefinedProperties: true });
  }
  return firestoreDb;
}

