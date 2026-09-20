export const INTAKE_FIELD_NAMES = [
  "first_name",
  "last_name",
  "full_name",
  "customer_type",
  "service_type",
  "service_duration",
  "organization_name",
  "phone",
  "email",
  "preferred_contact_method",
  "request_description",
  "description_mode",
  "request_priority",
  "ai_need",
  "source",
  "referrer",
  "landing_page",
  "analytics",
  "status",
  "request_type",
];

const text = (value) => String(value ?? "").trim();

export function buildIntakePayload(values, visit) {
  const descriptionMode = values.description_mode;
  const requestDescription =
    descriptionMode === "without_description"
      ? ""
      : text(values.request_description);

  return {
    first_name: text(values.first_name),
    last_name: text(values.last_name),
    full_name: text(values.full_name),
    customer_type: values.customer_type,
    service_type: values.service_type,
    service_duration: values.service_duration ?? null,
    organization_name:
      values.customer_type === "organization_or_project_owner"
        ? text(values.organization_name)
        : "",
    phone: text(values.phone),
    email: text(values.email).toLowerCase(),
    preferred_contact_method: values.preferred_contact_method,
    request_description: requestDescription,
    description_mode: descriptionMode,
    request_priority: descriptionMode === "with_description" ? "medium" : "low",
    ai_need: requestDescription,
    source: visit.source,
    referrer: visit.referrer,
    landing_page: visit.landingPage,
    analytics: {
      session_id: visit.sessionId,
      source: visit.source,
    },
    status: "new",
    request_type: "standard",
  };
}
