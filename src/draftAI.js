import { auth } from "./firebase";

export const draftAIConfigured = Boolean(import.meta.env.VITE_DRAFT_API_URL);

export async function generateDraftMessage(input) {
  if (!draftAIConfigured) throw new Error("draft-api-not-configured");
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("authentication-required");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${import.meta.env.VITE_DRAFT_API_URL.replace(/\/$/, "")}/generate-draft`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `draft-api-${response.status}`);
    if (!payload.draft) throw new Error("draft-api-empty");
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("draft-api-timeout");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
