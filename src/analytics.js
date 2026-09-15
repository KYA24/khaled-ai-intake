import {
  recordAnalyticsEvent,
  recordGoogleAnalyticsEvent,
} from "./firebase";

const SOURCE_VALUES = ["tiktok", "linkedin", "live", "direct", "referral", "other"];

export function resolveSource(explicit, referrer, currentHostname) {
  const normalized = explicit?.toLowerCase();
  if (normalized) return SOURCE_VALUES.includes(normalized) ? normalized : "other";
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === currentHostname) return "direct";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("linkedin")) return "linkedin";
    return "referral";
  } catch {
    return "other";
  }
}

function getSessionId() {
  const key = "intake_analytics_session";
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(key, value);
  }
  return value;
}

export function getVisitContext() {
  const explicit = new URLSearchParams(window.location.search).get("source")?.toLowerCase();
  const source = resolveSource(explicit, document.referrer, window.location.hostname);
  return {
    sessionId: getSessionId(),
    source,
    referrer: document.referrer || "",
    landingPage: `${window.location.origin}${window.location.pathname}`,
  };
}

export async function trackFunnelEvent(eventName, values = {}, formStep = null) {
  const visit = getVisitContext();
  const dedupeKey = `intake_event_${eventName}`;
  if (sessionStorage.getItem(dedupeKey)) return;
  sessionStorage.setItem(dedupeKey, "pending");
  const event = {
    event_name: eventName,
    session_id: visit.sessionId,
    customer_type: values.customer_type || null,
    service_type: values.service_type || null,
    form_step: formStep ? String(formStep) : null,
    source: visit.source,
  };
  if (import.meta.env.DEV) console.debug("Analytics Event", eventName, event);
  const gaParameters = {
    customer_type: event.customer_type || undefined,
    service_type: event.service_type || undefined,
    form_step: event.form_step || undefined,
    source: event.source,
  };
  const results = await Promise.allSettled([
    recordAnalyticsEvent(event),
    recordGoogleAnalyticsEvent(eventName, gaParameters),
  ]);
  if (results.every((result) => result.status === "rejected")) {
    sessionStorage.removeItem(dedupeKey);
  } else {
    sessionStorage.setItem(dedupeKey, "sent");
  }
}
