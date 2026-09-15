import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId),
  app = configured ? initializeApp(firebaseConfig) : null,
  auth = app ? getAuth(app) : null,
  db = app ? getFirestore(app) : null;
const field = (value) => value === null ? ({ nullValue: null }) : ({ stringValue: String(value ?? "") }),
  bool = (value) => ({ booleanValue: Boolean(value) });
export async function submitIntake(values) {
  if (!configured) throw new Error("firebase-not-configured");
  const sourceRaw =
      new URLSearchParams(window.location.search).get("source") || "tiktok",
    source = ["tiktok", "instagram", "linkedin", "referral"].includes(
      sourceRaw.toLowerCase(),
    )
      ? sourceRaw.toLowerCase()
      : "tiktok",
    payload = {
      ...values,
      organization_name:
        values.customer_type === "organization_or_project_owner"
          ? values.organization_name.trim()
          : "",
      full_name: `${values.first_name || ""} ${values.last_name || ""}`.trim(),
      ai_need: values.request_description,
      source,
      status: "new",
    },
    documentId = crypto.randomUUID().replaceAll("-", ""),
    endpoint = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit?key=${firebaseConfig.apiKey}`,
    controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const fields = {};
    for (const [key, value] of Object.entries(payload))
      fields[key] = typeof value === "boolean" ? bool(value) : field(value);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: `projects/${firebaseConfig.projectId}/databases/(default)/documents/intake_submissions/${documentId}`,
              fields,
            },
            updateTransforms: [
              { fieldPath: "submitted_at", setToServerValue: "REQUEST_TIME" },
            ],
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`firebase-submit-${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
export function onAdminAuth(next, error) {
  if (!auth) {
    error(new Error("Firebase غير مهيأ"));
    return () => {};
  }
  return onAuthStateChanged(auth, next, error);
}
export async function signInAdmin() {
  if (!auth) throw new Error("Firebase غير مهيأ");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    login_hint: "k.alateeq.cis@gmail.com",
    prompt: "select_account",
  });
  return signInWithPopup(auth, provider);
}
export function signOutAdmin() {
  return auth ? signOut(auth) : Promise.resolve();
}
export function subscribeSubmissions(next, error) {
  const q = query(
    collection(db, "intake_submissions"),
    orderBy("submitted_at", "desc"),
    limit(500),
  );
  return onSnapshot(
    q,
    (snap) => next(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    error,
  );
}
export function updateSubmission(id, changes) {
  if (!db) throw new Error("Firebase غير مهيأ");
  return updateDoc(doc(db, "intake_submissions", id), {
    ...changes,
    reviewed_at: serverTimestamp(),
  });
}
export function deleteSubmission(id) {
  if (!db) throw new Error("Firebase غير مهيأ");
  return deleteDoc(doc(db, "intake_submissions", id));
}
