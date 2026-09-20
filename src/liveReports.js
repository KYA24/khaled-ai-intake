export const metricKeys = ["views","unique_viewers","active_viewers","average_watch_seconds","peak_concurrent","average_concurrent","comments","likes","new_followers","shares","gifts","diamonds"];
export const LIVE_REPORT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "TikTok Live report",
  type: "object",
  required: ["id", "date", "title"],
  properties: {
    id: { type: "string", minLength: 1 },
    date: { type: "string", format: "date", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    title: { type: "string", minLength: 1 },
    duration_minutes: { type: ["number", "null"], minimum: 0 },
    metrics: { type: "object", additionalProperties: { type: ["number", "null"], minimum: 0 } },
    audience: { type: "object" },
    observations: { type: "array" },
    insights: { type: "array" },
    report_sections: { type: "object" },
  },
  additionalProperties: true,
};
export const LIVE_REPORT_JSON_TEMPLATE = JSON.stringify({
  id: "tiktok-live-YYYY-MM-DD",
  date: "2026-09-17",
  title: "بث TikTok — التاريخ أو عنوان البث",
  duration_minutes: null,
  metrics: Object.fromEntries(metricKeys.map((key) => [key, null])),
  audience: {
    gender: { male: null, female: null },
    age: { "18-24": null, "25-34": null, "35+": null },
    countries_or_regions: { "Saudi Arabia": null },
  },
  observations: [],
  insights: [],
  report_sections: {
    next_live_suggestions: [],
    tofu_content_ideas: [],
    decision_summary: [],
    regulatory_notes: [],
  },
}, null, 2);
const number = (v) => (v !== "" && v != null && Number.isFinite(Number(v)) ? Number(v) : null);
const validNonNegativeNumber = (v) => v == null || (typeof v === "number" && Number.isFinite(v) && v >= 0);
const nullishText = new Set(["", "null", "n/a", "na", "غير متاح", "غير متوفر", "—", "-"]);
const reportListKeys = ["next_live_suggestions", "tofu_content_ideas", "decision_summary", "regulatory_notes"];
const arabicDigits = { "٠":"0", "١":"1", "٢":"2", "٣":"3", "٤":"4", "٥":"5", "٦":"6", "٧":"7", "٨":"8", "٩":"9" };
const toAsciiDigits = (value) => value.replace(/[٠-٩]/g, (digit) => arabicDigits[digit]);
const normalizeNumericValue = (value) => {
  if (value == null || typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (nullishText.has(trimmed.toLowerCase())) return null;
  const normalized = toAsciiDigits(trimmed)
    .replace(/[٪%]/g, "")
    .replace(/[٬,\s]/g, "")
    .replace("٫", ".");
  return normalized !== "" && Number.isFinite(Number(normalized)) ? Number(normalized) : value;
};
const normalizeNumericMap = (input) => input && typeof input === "object" && !Array.isArray(input)
  ? Object.fromEntries(Object.entries(input).map(([key, value]) => [key, normalizeNumericValue(value)]))
  : input;
const normalizeList = (value) => Array.isArray(value) ? value : typeof value === "string" && value.trim() ? [value.trim()] : [];
const stripMarkdownFence = (value) => {
  const text = String(value ?? "").replace(/^\uFEFF/, "").trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : text;
};
const unwrapLiveReportPayload = (parsed) => {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return [parsed];
  if (parsed.id != null || parsed.date != null || parsed.title != null) return [parsed];
  for (const key of ["reports", "sessions", "live_sessions"]) if (Array.isArray(parsed[key])) return parsed[key];
  for (const key of ["report", "session", "live_session"]) if (parsed[key] && typeof parsed[key] === "object" && !Array.isArray(parsed[key])) return [parsed[key]];
  return [parsed];
};
const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
export function validateLiveSession(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return { valid:false, errors:["يجب أن يكون التقرير كائن JSON"] };
  if (typeof input.id !== "string" || !input.id.trim()) errors.push("الحقل id مطلوب ويجب أن يكون نصًا");
  if (typeof input.title !== "string" || !input.title.trim()) errors.push("الحقل title مطلوب ويجب أن يكون نصًا");
  if (typeof input.date !== "string" || !input.date.trim()) errors.push("الحقل date مطلوب");
  else if (!validDate(input.date)) errors.push("الحقل date يجب أن يكون تاريخًا صحيحًا بصيغة YYYY-MM-DD");
  if (input.duration_minutes != null && !validNonNegativeNumber(input.duration_minutes)) errors.push("duration_minutes يجب أن يكون رقمًا موجبًا أو null");
  if (input.metrics != null && (typeof input.metrics !== "object" || Array.isArray(input.metrics))) errors.push("metrics يجب أن يكون كائنًا");
  for (const [key, value] of Object.entries(input.metrics || {})) {
    if (!validNonNegativeNumber(value)) errors.push(`metrics.${key} يجب أن يكون رقمًا`);
  }
  for (const key of ["observations","insights"]) if (input[key] != null && !Array.isArray(input[key])) errors.push(`${key} يجب أن تكون قائمة`);
  if (input.audience != null && (typeof input.audience !== "object" || Array.isArray(input.audience))) errors.push("audience يجب أن يكون كائنًا");
  if (input.report_sections != null && (typeof input.report_sections !== "object" || Array.isArray(input.report_sections))) errors.push("report_sections يجب أن يكون كائنًا");
  return { valid: !errors.length, errors };
}
export function prepareLiveSessionImport(json, existingIds = []) {
  let parsed;
  try {
    parsed = JSON.parse(stripMarkdownFence(json));
  } catch {
    return { items: [], errors: ["JSON غير صالح — ألصق كائن JSON أو قائمة تقارير، ويمكن أن يكون داخل كتلة ```json."] };
  }
  const rawItems = unwrapLiveReportPayload(parsed);
  const items = rawItems.map(normalizeSession);
  const errors = items.flatMap((item, index) =>
    validateLiveSession(item).errors.map((error) => `التقرير ${index + 1}: ${error}`),
  );
  if (errors.length) return { items: [], errors };
  const ids = items.map((item) => item.id);
  const existing = new Set(existingIds);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index || existing.has(id)))];
  if (duplicateIds.length)
    return { items: [], errors: [`معرّفات مكررة أو موجودة مسبقًا: ${duplicateIds.join("، ")}. غيّر المعرّف قبل الحفظ.`] };
  return { items, errors: [] };
}
export function derivedMetrics(session) { const m=session?.metrics||{}; const safe=(a,b)=>number(m[a])!=null&&number(m[b])>0?Math.round(number(m[a])/number(m[b])*1000)/10:null; return { followConversion:safe("new_followers","unique_viewers"), commentIntensity:safe("comments","views"), likeAffinity:safe("likes","views"), shareIntent:safe("shares","views"), peakRetention:safe("peak_concurrent","unique_viewers") }; }
export function summarizeSessions(sessions) { const values=k=>sessions.map(s=>number(s.metrics?.[k])).filter(v=>v!=null); const sum=k=>values(k).reduce((a,b)=>a+b,0); const avg=k=>{const v=values(k);return v.length?Math.round(sum(k)/v.length):null}; return {count:sessions.length,views:sum("views"),unique_viewers:sum("unique_viewers"),average_watch_seconds:avg("average_watch_seconds"),peak_concurrent:Math.max(0,...values("peak_concurrent")),new_followers:sum("new_followers"),comments:sum("comments"),likes:sum("likes")}; }
export function normalizeSession(input) {
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const reportSections=source.report_sections&&typeof source.report_sections==="object"&&!Array.isArray(source.report_sections)?source.report_sections:{};
  const audience=source.audience&&typeof source.audience==="object"&&!Array.isArray(source.audience)?source.audience:{};
  const normalized={
    ...source,
    id:String(source.id??"").trim(),
    date:typeof source.date==="string"?source.date.trim():source.date,
    title:String(source.title??"").trim(),
    duration_minutes:normalizeNumericValue(source.duration_minutes),
    metrics:normalizeNumericMap(source.metrics),
    audience:{
      ...audience,
      gender:normalizeNumericMap(audience.gender),
      age:normalizeNumericMap(audience.age),
      countries_or_regions:normalizeNumericMap(audience.countries_or_regions),
    },
    observations:normalizeList(source.observations),
    insights:normalizeList(source.insights),
    report_sections:{
      ...reportSections,
      ...Object.fromEntries(reportListKeys.map((key)=>[key,normalizeList(reportSections[key])])),
    },
  };
  if (normalized.duration_minutes === undefined) delete normalized.duration_minutes;
  if (normalized.metrics === undefined) delete normalized.metrics;
  delete normalized.updated_at;
  delete normalized.created_at;
  return normalized;
}
export function normalizeAudienceDistribution(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { entries: [], total: 0, hasData: false };
  }
  const entries = Object.entries(input)
    .filter(([, value]) => validNonNegativeNumber(value))
    .map(([key, value]) => ({ key, value: Number(value) }));
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (!entries.length || total <= 0) {
    return { entries: [], total, hasData: false };
  }
  return {
    entries: entries.map((entry) => ({
      ...entry,
      share: (entry.value / total) * 100,
      percentage: Math.round((entry.value / total) * 100),
    })),
    total,
    hasData: true,
  };
}
