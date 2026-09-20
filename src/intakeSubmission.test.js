import { describe, expect, it } from "vitest";
import { buildIntakePayload, INTAKE_FIELD_NAMES } from "./intakeSubmission";

const visit = {
  source: "live",
  referrer: "https://example.com/live",
  landingPage: "https://khaled-ai-intake.web.app/",
  sessionId: "12345678-1234-1234-1234-123456789012",
};

const values = {
  first_name: "خالد",
  last_name: "العتيق",
  full_name: "خالد العتيق",
  customer_type: "individual",
  service_type: "service",
  service_duration: null,
  organization_name: "لا يجب حفظها",
  phone: "+966500000000",
  email: "",
  preferred_contact_method: "whatsapp",
  request_description: "أحتاج بناء نظام واضح لإدارة الطلبات",
  description_mode: "with_description",
  request_priority: "high",
  accidental_client_field: "must-not-be-sent",
};

describe("intake submission contract", () => {
  it("sends only the Firestore allowlisted fields", () => {
    const payload = buildIntakePayload(values, visit);
    expect(Object.keys(payload)).toEqual(INTAKE_FIELD_NAMES);
    expect(payload).not.toHaveProperty("accidental_client_field");
    expect(payload.request_priority).toBe("medium");
    expect(payload.status).toBe("new");
    expect(payload.request_type).toBe("standard");
  });

  it("supports a valid request without a description", () => {
    const payload = buildIntakePayload(
      { ...values, description_mode: "without_description" },
      visit,
    );
    expect(payload.request_description).toBe("");
    expect(payload.ai_need).toBe("");
    expect(payload.request_priority).toBe("low");
  });
});
