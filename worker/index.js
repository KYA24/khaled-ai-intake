const headers = { "Content-Type": "application/json; charset=utf-8" };

function reply(env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" } });
}

async function authenticate(request, env) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("authentication-required"), { status: 401 });
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw Object.assign(new Error("invalid-firebase-session"), { status: 401 });
  const base64 = (value) => value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const decode = (value) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64(value)), (character) => character.charCodeAt(0))));
  const header = decode(encodedHeader), claims = decode(encodedPayload);
  const keys = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com").then((response) => response.json());
  const jwk = keys.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw Object.assign(new Error("invalid-firebase-session"), { status: 401 });
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signature = Uint8Array.from(atob(base64(encodedSignature)), (character) => character.charCodeAt(0));
  const validSignature = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
  const now = Math.floor(Date.now() / 1000);
  const validClaims = claims.aud === env.FIREBASE_PROJECT_ID && claims.iss === `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}` && claims.exp > now && claims.iat <= now && claims.sub;
  if (!validSignature || !validClaims || claims.email !== "k.alateeq.cis@gmail.com") throw Object.assign(new Error("draft-generation-not-authorized"), { status: 403 });
}

const STYLE_GUIDE = `أنت طبقة كتابة داخل نظام خالد، ولست بوتًا عامًا.
- ابدأ بتحية قصيرة ودافئة باسم العميل، بدون مبالغة.
- أظهر أنك فهمت طلبه بذكر المشكلة أو المجال تحديدًا.
- استخدم عربية سعودية طبيعية، مهنية وخفيفة، وليست فصحى جامدة ولا عامية مبتذلة.
- اجعل الرسالة قصيرة: 3 إلى 6 فقرات قصيرة، وكل فقرة تؤدي وظيفة واحدة.
- لا تكرر وصف العميل كاملًا، ولا تستخدم عبارات تسويقية عامة مثل حلول مبتكرة.
- لا تعد بنتيجة قبل فهم التفاصيل، ولا تشخّص تقنيًا من وصف ناقص.
- اقترح خطوة تالية واحدة واضحة: سؤال محدد، أو جلسة، أو مراجعة.
- إذا كانت أول جلسة مجانية، اذكرها فقط إذا كان السياق يبررها.
- اختم باسم خالد فقط، ولا تضف توقيعًا طويلًا أو رموزًا كثيرة.

مثال الأسلوب: السلام عليكم [الاسم]، يعطيك العافية.\n\nاطلعت على طلبك، وفهمت إنك مهتم بـ[المجال/المشكلة]، وخصوصًا [التفصيل المهم].\n\nأقترح نبدأ بجلسة قصيرة نفهم فيها وضعك الحالي، وبعدها نحدد المسار العملي المناسب لك بدل ما ندخل في أشياء كثيرة بشكل عشوائي.\n\nخالد`;
const clean = (value, max) => String(value || "").trim().slice(0, max);

function parseText(value) {
  if (typeof value === "string") return value.replace(/^```(?:text|markdown)?\s*/i, "").replace(/\s*```$/, "").trim();
  return value?.draft || value?.message || value?.text || "";
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin && origin !== env.ALLOWED_ORIGIN) return reply(env, { error: "origin-not-allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN, "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return reply(env, { ok: true, model: env.CLOUDFLARE_AI_MODEL || "@cf/zai-org/glm-4.7-flash" });
    if (request.method !== "POST" || url.pathname !== "/generate-draft") return reply(env, { error: "not-found" }, 404);
    try {
      await authenticate(request, env);
      const body = await request.json();
      const input = { name: clean(body.name, 120), organization: clean(body.organization, 160), service: clean(body.service, 80), contactMethod: clean(body.contactMethod, 30), request: clean(body.request, 2500), classification: clean(body.classification, 40), notes: clean(body.notes, 1000), bookingUrl: clean(body.bookingUrl, 500) };
      if (!input.name || !input.request) throw Object.assign(new Error("invalid-draft-input"), { status: 400 });
      if (!env.AI) throw Object.assign(new Error("workers-ai-not-configured"), { status: 503 });
      const prompt = `${STYLE_GUIDE}\n\nبيانات الطلب:\n- الاسم: ${input.name}\n- الجهة: ${input.organization || "غير مذكورة"}\n- نوع الطلب: ${input.service || "غير مذكور"}\n- طريقة التواصل: ${input.contactMethod || "غير مذكورة"}\n- تصنيف خالد: ${input.classification || "يحتاج مراجعة"}\n- ملاحظات خالد: ${input.notes || "لا توجد"}\n- وصف العميل: ${input.request}\n- رابط الحجز إن احتجته: ${input.bookingUrl || "لا تضفه"}\n\nاكتب الرسالة النهائية فقط، بدون شرح أو عنوان أو علامات اقتباس.`;
      const model = env.CLOUDFLARE_AI_MODEL || "@cf/zai-org/glm-4.7-flash";
      const result = await env.AI.run(model, { messages: [{ role: "system", content: prompt }, { role: "user", content: "اكتب مسودة واتساب مناسبة لهذا العميل الآن." }], temperature: 0.35, max_tokens: 700, stream: false });
      const draft = parseText(result?.choices?.[0]?.message?.content ?? result?.response ?? result);
      if (!draft) throw new Error("draft-api-empty");
      return reply(env, { draft, provider: "cloudflare", model, generatedAt: new Date().toISOString() });
    } catch (error) {
      return reply(env, { error: error.message || "draft-generation-failed" }, error.status || 500);
    }
  },
};
