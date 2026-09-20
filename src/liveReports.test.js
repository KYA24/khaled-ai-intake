import { describe, expect, it } from "vitest";
import { LIVE_REPORT_JSON_SCHEMA, LIVE_REPORT_JSON_TEMPLATE, derivedMetrics, metricKeys, normalizeAudienceDistribution, normalizeSession, prepareLiveSessionImport, validateLiveSession } from "./liveReports";

describe("Live Reports contract", () => {
  it("publishes a complete, directly parseable JSON template", () => {
    const template = JSON.parse(LIVE_REPORT_JSON_TEMPLATE);
    expect(validateLiveSession(template).valid).toBe(true);
    expect(Object.keys(template.metrics)).toEqual(metricKeys);
    expect(Object.values(template.metrics).every((value) => value === null)).toBe(true);
    expect(template.duration_minutes).toBeNull();
    expect(template.audience.gender).toEqual({ male: null, female: null });
    expect(LIVE_REPORT_JSON_SCHEMA.required).toEqual(["id", "date", "title"]);
  });

  it("rejects missing required fields", () => {
    expect(validateLiveSession({ date: "2026-09-17" }).valid).toBe(false);
    expect(validateLiveSession({ id: "x", title: "بث" }).errors).toContain("الحقل date مطلوب");
  });

  it("rejects malformed lists and metrics", () => {
    const result = validateLiveSession({ id: "x", title: "بث", date: "2026-09-17", metrics: { views: "abc" }, observations: "text" });
    expect(result.errors).toContain("metrics.views يجب أن يكون رقمًا");
    expect(result.errors).toContain("observations يجب أن تكون قائمة");
  });

  it("rejects invalid dates and negative numeric values", () => {
    const result = validateLiveSession({ id: "x", title: "بث", date: "17-09-2026", metrics: { views: -1 } });
    expect(result.errors).toContain("الحقل date يجب أن يكون تاريخًا صحيحًا بصيغة YYYY-MM-DD");
    expect(result.errors).toContain("metrics.views يجب أن يكون رقمًا");
  });

  it("rejects numeric strings and impossible calendar dates", () => {
    const result = validateLiveSession({ id: "x", title: "بث", date: "2026-99-99", duration_minutes: "35", metrics: { views: "1200", custom: "4" } });
    expect(result.errors).toContain("الحقل date يجب أن يكون تاريخًا صحيحًا بصيغة YYYY-MM-DD");
    expect(result.errors).toContain("duration_minutes يجب أن يكون رقمًا موجبًا أو null");
    expect(result.errors).toContain("metrics.views يجب أن يكون رقمًا");
    expect(result.errors).toContain("metrics.custom يجب أن يكون رقمًا");
  });

  it("normalizes safely without turning missing fields into undefined strings", () => {
    expect(normalizeSession(null).id).toBe("");
    expect(normalizeSession({ id: " x ", title: " بث " })).toMatchObject({ id: "x", title: "بث", observations: [], insights: [] });
  });

  it("derives percentages only when denominators exist", () => {
    expect(derivedMetrics({ metrics: { new_followers: 5, unique_viewers: 100 } }).followConversion).toBe(5);
    expect(derivedMetrics({ metrics: { comments: 5, views: 0 } }).commentIntensity).toBeNull();
  });

  it("turns measured audience values into chart-ready shares", () => {
    expect(normalizeAudienceDistribution({ male: 25, female: 75 })).toEqual({
      entries: [
        { key: "male", value: 25, share: 25, percentage: 25 },
        { key: "female", value: 75, share: 75, percentage: 75 },
      ],
      total: 100,
      hasData: true,
    });
  });

  it("does not invent audience percentages from null or zero values", () => {
    expect(normalizeAudienceDistribution({ male: null, female: null }).hasData).toBe(false);
    expect(normalizeAudienceDistribution({ male: 0, female: 0 }).hasData).toBe(false);
  });

  it("previews valid JSON", () => {
    const result = prepareLiveSessionImport('{"id":"live-1","date":"2026-09-17","title":"بث تجريبي","metrics":{"views":100}}');
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({ id: "live-1", title: "بث تجريبي" });
  });

  it("accepts AI responses wrapped in a markdown JSON fence", () => {
    const result = prepareLiveSessionImport('```json\n{"id":"live-fenced","date":"2026-09-17","title":"بث داخل كتلة"}\n```');
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({ id: "live-fenced", title: "بث داخل كتلة" });
  });

  it("unwraps common report containers and normalizes textual measurements", () => {
    const result = prepareLiveSessionImport(JSON.stringify({
      report: {
        id: "live-ai-output",
        date: "2026-09-17",
        title: "بث من النموذج",
        duration_minutes: "١٦٤",
        metrics: { views: "3,500", comments: "٥١١", shares: "N/A" },
        audience: { gender: { male: "63%", female: "٣٦٪" } },
        observations: "ملاحظة واحدة",
        report_sections: { decision_summary: "قرار واحد" },
      },
    }));
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({
      duration_minutes: 164,
      metrics: { views: 3500, comments: 511, shares: null },
      audience: { gender: { male: 63, female: 36 } },
      observations: ["ملاحظة واحدة"],
      report_sections: { decision_summary: ["قرار واحد"] },
    });
  });

  it("removes storage-managed timestamps before saving a copied report", () => {
    const item = normalizeSession({ id: "x", date: "2026-09-17", title: "بث", updated_at: { seconds: 1 }, created_at: "old" });
    expect(item).not.toHaveProperty("updated_at");
    expect(item).not.toHaveProperty("created_at");
    expect(item).not.toHaveProperty("duration_minutes");
    expect(item).not.toHaveProperty("metrics");
  });

  it("rejects malformed and incomplete JSON", () => {
    expect(prepareLiveSessionImport("{").errors[0]).toContain("JSON غير صالح");
    expect(prepareLiveSessionImport('{"date":"2026-09-17"}').errors.join(" ")).toContain("الحقل id مطلوب");
  });

  it("rejects duplicate IDs in storage or the same import", () => {
    expect(prepareLiveSessionImport('{"id":"live-1","date":"2026-09-17","title":"بث"}', ["live-1"]).errors[0]).toContain("موجودة مسبقًا");
    const repeated = '[{"id":"same","date":"2026-09-17","title":"أ"},{"id":"same","date":"2026-09-18","title":"ب"}]';
    expect(prepareLiveSessionImport(repeated).errors[0]).toContain("مكررة");
  });
});
