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
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId),
  app = configured ? initializeApp(firebaseConfig) : null,
  auth = app ? getAuth(app) : null,
  db = app ? getFirestore(app) : null;
let analyticsPromise;
const field = (value) => {
    if (value === null) return { nullValue: null };
    if (typeof value === "object") {
      const fields = {};
      for (const [key, nested] of Object.entries(value)) fields[key] = field(nested);
      return { mapValue: { fields } };
    }
    return { stringValue: String(value ?? "") };
  },
  bool = (value) => ({ booleanValue: Boolean(value) });
export async function submitIntake(values, visit) {
  if (!configured) throw new Error("firebase-not-configured");
  const payload = {
      ...values,
      organization_name:
        values.customer_type === "organization_or_project_owner"
          ? values.organization_name.trim()
          : "",
      full_name: `${values.first_name || ""} ${values.last_name || ""}`.trim(),
      ai_need: values.request_description,
      source: visit.source,
      referrer: visit.referrer,
      landing_page: visit.landingPage,
      analytics: {
        session_id: visit.sessionId,
        source: visit.source,
      },
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
export async function recordAnalyticsEvent(event) {
  if (!db) return;
  const id = `${event.session_id}_${event.event_name}`.replace(/[^a-zA-Z0-9_-]/g, "");
  await setDoc(doc(db, "analytics_events", id), {
    event_name: event.event_name,
    session_id: event.session_id,
    customer_type: event.customer_type || null,
    service_type: event.service_type || null,
    form_step: event.form_step || null,
    source: event.source || null,
    created_at: serverTimestamp(),
  });
}
async function browserAnalytics() {
  if (!app || !firebaseConfig.measurementId) return null;
  analyticsPromise ||= isSupported().then((supported) =>
    supported ? getAnalytics(app) : null,
  );
  return analyticsPromise;
}
export async function recordGoogleAnalyticsEvent(eventName, parameters) {
  const analytics = await browserAnalytics();
  if (analytics) logEvent(analytics, eventName, parameters);
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
export function subscribeAnalyticsEvents(next, error) {
  const q = query(
    collection(db, "analytics_events"),
    orderBy("created_at", "desc"),
    limit(10000),
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
