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

const STYLE_GUIDE = `أنت محرر رسائل واتساب لخالد، ولست محللًا يكتب تقريرًا.

الهدف: رسالة قصيرة جاهزة للإرسال للعميل، بصوت خالد الطبيعي.
- ابدأ بـ: السلام عليكم [الاسم]، يعطيك العافية. أو تحية قريبة منها.
- قل إنك اطلعت على الطلب، ثم لخّص الاحتياج في جملة واحدة فقط.
- اربط الجلسة بفائدة واضحة للعميل: نفهم وضعه، نحدد الاتجاه، ونطلع بخطوة عملية.
- اذكر أن الجلسة الأولى مجانية إذا كان العميل من أوائل العملاء أو كان ذلك مناسبًا للسياق.
- اختم بدعوة واحدة للحجز، ثم اترك رابط الحجز في آخر سطر حرفيًا.
- استخدم عربية سعودية طبيعية ومهنية وخفيفة.
- الرسالة بين 55 و110 كلمة تقريبًا، وفي 3 أو 4 فقرات قصيرة.

ممنوع منعًا قاطعًا:
- لا تكتب تقريرًا أو تحليلًا تقنيًا للعميل.
- لا تعيد وصف الطلب كاملًا ولا تكرر كلام العميل.
- لا تذكر: المدخلات، المخرجات، قرار بشري، ذكاء توليدي، أتمتة ثابتة، ملاحظة من مراجعتي، أو حلول مبتكرة.
- لا تطرح قائمة أسئلة ولا تطلب تفاصيل قبل الحجز.
- لا تضف عنوانًا أو مقدمة تفسيرية أو علامات اقتباس.
- لا تضع رابطًا من عندك؛ سيُضاف رابط الحجز الصحيح آليًا بعد النص.
- لا تكتب أي شيء بعد رابط الحجز، ولا تضع توقيع خالد بعده.

توجيه داخلي لتحليل الحلول التقنية (لا يظهر في الرسالة): عند اقتراح واجهة أو بناء منتج، اعتبر React مع shadcn/ui مكوّنات أساسية مفضلة لأنها مرنة وقابلة للتوسع، وحلّل أي مشكلة تقنية وفق هذا السياق بدل اقتراح واجهة عامة.`;
const clean = (value, max) => String(value || "").trim().slice(0, max);

function parseText(value) {
  if (typeof value === "string") return value.replace(/^```(?:text|markdown)?\s*/i, "").replace(/\s*```$/, "").trim();
  return value?.draft || value?.message || value?.text || "";
}

function fallbackDraft(input) {
  const name = input.name || "هلا";
  const service = input.service && input.service !== "غير مذكور" ? input.service : "الاحتياج اللي ذكرته";
  return `السلام عليكم ${name}، يعطيك العافية.\n\nاطلعت على طلبك، وفهمت أنك تحتاج مساعدة عملية في ${service}، ونحدد لك الاتجاه المناسب بدل التشتت بين خيارات كثيرة.\n\nفي الجلسة الأولى نفهم وضعك وهدفك، وبعدها نطلع بخطوة واضحة تناسبك. الجلسة الأولى مجانية.\n\nاحجز الوقت المناسب لك من هنا:`;
}

function finalizeDraft(value, input) {
  const forbidden = /ملاحظة من مراجعتي|مبدئيًا|المدخلات|النتيجة النهائية|قرار بشري|ذكاء توليدي|أتمتة ثابتة|حلول مبتكرة|بيانات الطلب/i;
  let draft = parseText(value).replace(/https?:\/\/\S+/g, "").replace(/\n?خالد\s*$/u, "").trim();
  if (!draft || draft.length > 900 || forbidden.test(draft)) draft = fallbackDraft(input);
  const booking = input.bookingUrl;
  return booking ? `${draft.replace(/\n?احجز الوقت المناسب لك من هنا:?\s*$/u, "").trim()}\n\nاحجز الوقت المناسب لك من هنا:\n${booking}` : draft;
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
      const draft = finalizeDraft(result?.choices?.[0]?.message?.content ?? result?.response ?? result, input);
      if (!draft) throw new Error("draft-api-empty");
      return reply(env, { draft, provider: "cloudflare", model, generatedAt: new Date().toISOString() });
    } catch (error) {
      return reply(env, { error: error.message || "draft-generation-failed" }, error.status || 500);
    }
  },
};
