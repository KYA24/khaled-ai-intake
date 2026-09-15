import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronLeft,
  Check,
  CircleCheckBig,
  CircleDashed,
  FileText,
  LogIn,
  LogOut,
  ListChecks,
  Mail,
  MessageCircle,
  Phone,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import {
  deleteSubmission,
  onAdminAuth,
  signInAdmin,
  signOutAdmin,
  submitIntake,
  subscribeAnalyticsEvents,
  subscribeSubmissions,
  updateSubmission,
} from "./firebase";
import { getVisitContext, trackFunnelEvent } from "./analytics";
import "./styles.css";
import "./enhancements.css";
import "./motion.css";
import "./intro-hold.css";
import "./admin-review.css";
import "./admin-analytics.css";
import "./premium-intake.css";
import "./intake-refinement.css";

const OWNER_EMAIL = "k.alateeq.cis@gmail.com";
const initial = {
  full_name: "",
  first_name: "",
  last_name: "",
  customer_type: "",
  service_type: "",
  service_duration: null,
  organization_name: "",
  phone: "+966 ",
  email: "",
  preferred_contact_method: "",
  request_description: "",
};
const contactOptions = [
  { v: "whatsapp", l: "واتساب", I: MessageCircle },
  { v: "call", l: "مكالمة", I: Phone },
  { v: "email", l: "بريد إلكتروني", I: Mail },
];

function Field({ label, error, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${props.name}-error` : undefined}
      />
      {error && (
        <small id={`${props.name}-error`} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
function Choice({ selected, icon: Icon, children, ...props }) {
  return (
    <button
      type="button"
      className={`choice ${selected ? "selected" : ""}`}
      aria-pressed={selected}
      {...props}
    >
      <span className="choice-icon">
        <Icon size={22} />
      </span>
      <strong>{children}</strong>
      {selected && (
        <span className="check">
          <Check size={14} />
        </span>
      )}
    </button>
  );
}
function ServiceChoice({ selected, title, duration, children, icon: Icon, ...props }) {
  return (
    <button type="button" className={`service-choice ${selected ? "selected" : ""}`} aria-pressed={selected} {...props}>
      <span className="service-choice-icon"><Icon size={22} /></span>
      <span className="service-choice-copy">
        <span className="service-choice-head"><strong>{title}</strong>{duration && <small>{duration}</small>}</span>
        <span>{children}</span>
      </span>
      {selected && <span className="check"><Check size={14} /></span>}
    </button>
  );
}
function App() {
  return window.location.pathname.startsWith("/admin") ? (
    <AdminApp />
  ) : (
    <IntakeApp />
  );
}

function LegacyIntakeApp() {
  const [intro, setIntro] = useState(true),
    [step, setStep] = useState(1),
    [data, setData] = useState(initial),
    [errors, setErrors] = useState({}),
    [sending, setSending] = useState(false),
    [done, setDone] = useState(false),
    [failed, setFailed] = useState("");
  const panel = useRef(null),
    total = 4;
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 7650);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!intro)
      setTimeout(
        () =>
          panel.current?.querySelector("input,textarea,button.choice")?.focus(),
        350,
      );
  }, [step, intro]);
  const set = (k, v) => {
    setData((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
    setFailed("");
  };
  const validate = () => {
    const e = {};
    if (step === 1 && !data.customer_type)
      e.customer_type = "اختر واحد من الخيارين";
    if (step === 2 && data.ai_need.trim().length < 15)
      e.ai_need = "اكتب المشكلة بشكل أوضح، حتى لو بس بجملة";
    if (step === 3 && data.full_name.trim().length < 3)
      e.full_name = "اكتب اسمك الكامل";
    if (step === 4) {
      const digits = data.phone.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 15)
        e.phone = "تأكد من رقم الجوال ورمز الدولة";
      if (
        (data.preferred_contact_method === "email" || data.wants_quick_reply) &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
      )
        e.email = "اكتب بريد إلكتروني صحيح";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => {
    setFailed("");
    if (validate()) setStep((s) => Math.min(total, s + 1));
  };
  const back = () => {
    setErrors({});
    setFailed("");
    setStep((s) => Math.max(1, s - 1));
  };
  const addSuggestion = (item) =>
    set(
      "ai_need",
      data.ai_need.trim() ? `${data.ai_need.trim()}، ${item}` : item,
    );
  const submit = async () => {
    if (step !== total) return;
    if (!validate()) return;
    setSending(true);
    setFailed("");
    try {
      await submitIntake({
        ...data,
        phone: data.phone.trim(),
        email: data.email.trim().toLowerCase(),
        ai_need: data.ai_need.trim(),
        full_name: data.full_name.trim(),
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      setFailed("ما وصل الطلب. تأكد من اتصالك وجرّب مرة ثانية.");
    } finally {
      setSending(false);
    }
  };
  if (intro) return <Intro />;
  if (done) return <Success data={data} />;
  return (
    <main className="shell">
      <div className="ambient-glow" aria-hidden="true" />
      <header>
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={16} />
          </span>
          <span>AI · WORKFLOW</span>
        </div>
        <span className="count">
          {step} من {total}
        </span>
      </header>
      <div className="progress">
        <span style={{ width: `${(step * 100) / total}%` }} />
      </div>
      <form
        onSubmit={(event) => event.preventDefault()}
        onInput={triggerTypingFx}
        noValidate
      >
        <section key={step} className="step" ref={panel}>
          {step === 1 && (
            <>
              <p className="eyebrow">خلّنا نبدأ من وضعك</p>
              <h1>بتوظّف الذكاء الاصطناعي لك، أو ضمن جهة؟</h1>
              <p className="helper top-helper">
                عشان تكون المقترحات أقرب لطبيعة شغلك.
              </p>
              <div className="choices two">
                <Choice
                  icon={UserRound}
                  selected={data.customer_type === "individual"}
                  onClick={() => set("customer_type", "individual")}
                >
                  فرد
                </Choice>
                <Choice
                  icon={Building2}
                  selected={data.customer_type === "organization"}
                  onClick={() => set("customer_type", "organization")}
                >
                  جهة / فريق
                </Choice>
              </div>
              {errors.customer_type && (
                <small className="group-error">{errors.customer_type}</small>
              )}
              {data.customer_type === "organization" && (
                <div className="reveal">
                  <Field
                    label="اسم الجهة (اختياري)"
                    name="organization_name"
                    autoComplete="organization"
                    value={data.organization_name}
                    onChange={(e) => set("organization_name", e.target.value)}
                  />
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <p className="eyebrow">نبدأ من المشكلة</p>
              <h1>وش أكثر شيء يستهلك وقتك أو يعطّلك في الشغل؟</h1>
              <p className="helper">
                اكتبها بطريقتك، حتى لو كانت بسيطة. المهم نعرف وين يروح وقتك.
              </p>
              <div className="suggestion-block">
                <span className="suggestion-title">مقترحات تساعدك تبدأ</span>
                <div className="chips">
                  {suggestions.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => addSuggestion(item)}
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
              <label className="field textarea">
                <span>المشكلة أو المهمة</span>
                <textarea
                  name="ai_need"
                  rows="6"
                  placeholder="مثال: كل أسبوع أجمع بيانات من أكثر من ملف وأرتبها يدويًا في تقرير."
                  value={data.ai_need}
                  onChange={(e) => set("ai_need", e.target.value)}
                  aria-invalid={Boolean(errors.ai_need)}
                />
                {errors.ai_need && <small>{errors.ai_need}</small>}
                <em>كل ما كنت محدد، كانت مراجعتنا أدق.</em>
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <p className="eyebrow">عرفنا المشكلة</p>
              <h1>طيب، وش اسمك؟</h1>
              <p className="helper top-helper">
                عشان أكلمك باسمك لما أراجع احتياجك.
              </p>
              <Field
                label="الاسم الكامل"
                name="full_name"
                autoComplete="name"
                value={data.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                error={errors.full_name}
              />
            </>
          )}
          {step === 4 && (
            <>
              <p className="eyebrow">آخر خطوة</p>
              <h1>وين تحب نتواصل معك؟</h1>
              <div className="stack">
                <Field
                  label="رقم الجوال"
                  name="phone"
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  value={data.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  error={errors.phone}
                />
                <div>
                  <span className="field-label">الطريقة الأنسب</span>
                  <div className="choices contact">
                    {contactOptions.map(({ v, l, I }) => (
                      <Choice
                        key={v}
                        icon={I}
                        selected={data.preferred_contact_method === v}
                        onClick={() => set("preferred_contact_method", v)}
                      >
                        {l}
                      </Choice>
                    ))}
                  </div>
                </div>
                <label
                  className={`quick-card ${data.wants_quick_reply ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={data.wants_quick_reply}
                    onChange={(e) => set("wants_quick_reply", e.target.checked)}
                  />
                  <span className="quick-check">
                    {data.wants_quick_reply && <Check size={15} />}
                  </span>
                  <span>
                    <strong>أبي أنضم لقائمة العملاء الأوائل</strong>
                    <small>
                      خالد يراجع الطلبات ويختار الحالات الأنسب للتجربة المجانية.
                    </small>
                  </span>
                </label>
                {(data.wants_quick_reply ||
                  data.preferred_contact_method === "email") && (
                  <div className="reveal">
                    <Field
                      label="البريد الإلكتروني"
                      name="email"
                      type="email"
                      dir="ltr"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={data.email}
                      onChange={(e) => set("email", e.target.value)}
                      error={errors.email}
                    />
                    {data.wants_quick_reply && (
                      <p className="early-note">
                        <Sparkles size={15} /> التسجيل لا يعني الاختيار
                        تلقائيًا.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
        {failed && (
          <div className="submit-error" role="alert">
            {failed}
          </div>
        )}
        <footer>
          {step > 1 ? (
            <button type="button" className="back" onClick={back}>
              <ArrowRight size={18} /> رجوع
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="primary"
            onClick={step === total ? submit : next}
            disabled={sending}
          >
            {sending ? (
              <>
                <span className="spinner" />
                جاري الإرسال
              </>
            ) : step === total ? (
              <>
                إرسال الطلب <ArrowLeft size={18} />
              </>
            ) : (
              <>
                التالي <ArrowLeft size={18} />
              </>
            )}
          </button>
        </footer>
      </form>
      <p className="privacy">بياناتك لفهم احتياجك والتواصل معك فقط.</p>
    </main>
  );
}
function IntakeApp() {
  const [intro, setIntro] = useState(true), [step, setStep] = useState(1), [data, setData] = useState(initial), [showConsultation, setShowConsultation] = useState(false), [errors, setErrors] = useState({}), [sending, setSending] = useState(false), [done, setDone] = useState(false), [failed, setFailed] = useState("");
  const panel = useRef(null), total = 4;
  useEffect(() => { trackFunnelEvent("form_view", data, 1); }, []);
  useEffect(() => { const timer = setTimeout(() => setIntro(false), 3850); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (!intro) setTimeout(() => panel.current?.querySelector("input,textarea,button")?.focus(), 340); }, [step, intro]);
  useEffect(() => { if (step === 4) trackFunnelEvent("contact_step_reached", data, 4); }, [step]);
  const set = (key, value) => { setData((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); setFailed(""); };
  const validate = () => {
    const nextErrors = {};
    if (step === 1 && !data.customer_type) nextErrors.customer_type = "اختر واحد من الخيارين";
    if (step === 2 && !data.service_type) nextErrors.service_type = "اختر النوع الأقرب لاحتياجك";
    if (step === 3 && data.request_description.trim().length < 15) nextErrors.request_description = "اكتب تفاصيل أكثر، حتى لو بس بجملة";
    if (step === 4) {
      if (data.full_name.trim().length < 3) nextErrors.full_name = "اكتب اسمك";
      if (!data.preferred_contact_method) nextErrors.preferred_contact_method = "اختر طريقة التواصل";
      if (["whatsapp", "call"].includes(data.preferred_contact_method)) {
        const digits = data.phone.replace(/\D/g, "");
        if (!/^(9665\d{8}|05\d{8}|\d{9,15})$/.test(digits)) nextErrors.phone = "تأكد من رقم الجوال ورمز الدولة";
      }
      if (data.preferred_contact_method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) nextErrors.email = "اكتب بريد إلكتروني صحيح";
    }
    setErrors(nextErrors); return Object.keys(nextErrors).length === 0;
  };
  const next = () => { if (validate()) setStep((current) => Math.min(total, current + 1)); };
  const back = () => { setErrors({}); setFailed(""); setStep((current) => Math.max(1, current - 1)); };
  const chooseCustomer = (value) => { set("customer_type", value); trackFunnelEvent("customer_type_selected", { ...data, customer_type: value }, 1); setTimeout(() => setStep(2), 260); };
  const chooseService = (value, duration) => { setData((current) => ({ ...current, service_type: value, service_duration: duration })); setErrors((current) => ({ ...current, service_type: "" })); trackFunnelEvent("service_type_selected", { ...data, service_type: value }, 2); setTimeout(() => setStep(3), 260); };
  const submit = async () => {
    if (step !== total || !validate()) return;
    setSending(true); setFailed("");
    try { const parts = data.full_name.trim().split(/\s+/); await submitIntake({ ...data, first_name: parts[0], last_name: parts.slice(1).join(" "), request_description: data.request_description.trim(), phone: ["whatsapp", "call"].includes(data.preferred_contact_method) ? data.phone.trim() : "", email: data.preferred_contact_method === "email" ? data.email.trim().toLowerCase() : "" }, getVisitContext()); await trackFunnelEvent("generate_lead", data, 4); setDone(true); }
    catch (error) { console.error(error); setFailed("ما وصل الطلب. تأكد من اتصالك وجرّب مرة ثانية."); }
    finally { setSending(false); }
  };
  if (intro) return <Intro />;
  if (done) return <Success data={data} />;
  return <main className="shell"><div className="ambient-glow" aria-hidden="true" /><header><div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>AI · WORKFLOW</span></div><span className="count">{step} من {total}</span></header><div className="progress"><span style={{ width: `${step * 25}%` }} /></div>
    <form onSubmit={(event) => event.preventDefault()} onInput={triggerTypingFx} noValidate><section key={step} className="step" ref={panel}>
      {step === 1 && <><div className="availability"><i />فتح المواعيد والخدمات قريبًا</div><p className="eyebrow">خطوة ١</p><h1>من أنت؟</h1><div className="choices two identity-choices">
        <Choice icon={UserRound} selected={data.customer_type === "individual"} onClick={() => chooseCustomer("individual")} className={`choice identity-choice ${data.customer_type === "individual" ? "selected" : ""}`}>فرد</Choice>
        <Choice icon={Building2} selected={data.customer_type === "organization_or_project_owner"} onClick={() => chooseCustomer("organization_or_project_owner")} className={`choice identity-choice ${data.customer_type === "organization_or_project_owner" ? "selected" : ""}`}>جهة أو صاحب مشروع</Choice>
      </div>{errors.customer_type && <small className="group-error">{errors.customer_type}</small>}</>}
      {step === 2 && <><p className="eyebrow">اختر الأقرب لك</p><h1>وش تحتاج؟</h1><p className="helper top-helper">سجّل اهتمامك الآن، وبنتواصل معك عند فتح المواعيد والخدمات.</p><div className="service-list main-service-list">
        <ServiceChoice icon={CalendarClock} title="استشارة" selected={showConsultation || ["short_session", "deep_session"].includes(data.service_type)} onClick={() => { setShowConsultation(true); setData((current) => ({ ...current, service_type: "", service_duration: null })); }}>مناقشة مركزة لسؤال، قرار، مشكلة، أو مشروع.</ServiceChoice>
        {showConsultation && <div className="consultation-options reveal"><button type="button" className={data.service_type === "short_session" ? "selected" : ""} onClick={() => chooseService("short_session", "20-30_min")}><strong>قصيرة</strong><span>20–30 دقيقة</span></button><button type="button" className={data.service_type === "deep_session" ? "selected" : ""} onClick={() => chooseService("deep_session", "up_to_60_min")}><strong>معمقة</strong><span>حتى 60 دقيقة</span></button></div>}
        <ServiceChoice icon={BriefcaseBusiness} title="خدمة" selected={data.service_type === "service"} onClick={() => chooseService("service", null)}>تنفيذ موقع، Dashboard، أداة AI، Portfolio، Workflow، نظام داخلي، أو حل رقمي مشابه.</ServiceChoice>
      </div>{errors.service_type && <small className="group-error">{errors.service_type}</small>}</>}
      {step === 3 && <><p className="eyebrow">التفاصيل</p><h1>{data.service_type === "service" ? "وش الشيء اللي ودك أسويه لك؟" : "وش الموضوع اللي ودك نناقشه؟"}</h1><p className="helper">{data.service_type === "service" ? "اشرح الفكرة باختصار: وش تبغى تبني؟ لمين؟ وش النتيجة اللي تتوقعها؟" : "اكتب لي باختصار وش وضعك الحالي، وش القرار أو النتيجة اللي ودك تطلع فيها من الجلسة."}</p>{data.service_type === "service" && <div className="example-list"><span>موقع</span><span>Dashboard</span><span>أداة AI</span><span>Portfolio</span><span>Workflow</span><span>نظام داخلي</span><span>فكرة أخرى</span></div>}<label className="field textarea"><span>وصف الطلب</span><textarea name="request_description" rows="6" placeholder={data.service_type === "service" ? "مثال: أبي Dashboard لفريقي تجمع المهام والمشاريع وتوضح حالة كل مشروع بشكل واضح." : "مثال: عندي مشروع صغير وأستخدم ChatGPT يوميًا، لكن أبي أعرف أفضل طريقة أنظم فيها Workflow وأعرف وش الأشياء اللي فعلًا تستاهل AI."} value={data.request_description} onChange={(event) => { if (!data.request_description) trackFunnelEvent("request_started", data, 3); set("request_description", event.target.value); }} aria-invalid={Boolean(errors.request_description)} />{errors.request_description && <small>{errors.request_description}</small>}</label>{data.service_type === "service" && <p className="qualification-note"><CircleDashed size={17} />قبل أي تنفيذ، نسوي مكالمة قصيرة تقريبًا 10 دقائق لفهم الطلب والتأكد أني أقدر أخدمك فيه. بعدها نتفق على الخطوة المناسبة.</p>}</>}
      {step === 4 && <><p className="eyebrow">آخر خطوة</p><h1>كيف نتواصل معك؟</h1><div className="stack"><Field label="الاسم الكامل" name="full_name" autoComplete="name" value={data.full_name} onChange={(event) => set("full_name", event.target.value)} error={errors.full_name} />{data.customer_type === "organization_or_project_owner" && <div className="reveal"><Field label="اسم الجهة أو المشروع (اختياري)" name="organization_name" autoComplete="organization" value={data.organization_name} onChange={(event) => set("organization_name", event.target.value)} /></div>}<div><span className="field-label">طريقة التواصل المفضلة</span><div className="choices contact">{contactOptions.map(({ v, l, I }) => <Choice key={v} icon={I} selected={data.preferred_contact_method === v} onClick={() => set("preferred_contact_method", v)}>{l}</Choice>)}</div>{errors.preferred_contact_method && <small className="group-error">{errors.preferred_contact_method}</small>}</div>{["whatsapp", "call"].includes(data.preferred_contact_method) && <div className="reveal"><Field label={data.preferred_contact_method === "whatsapp" ? "رقم WhatsApp" : "رقم الجوال"} name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={data.phone} onChange={(event) => set("phone", event.target.value)} error={errors.phone} /></div>}{data.preferred_contact_method === "email" && <div className="reveal"><Field label="البريد الإلكتروني" name="email" type="email" dir="ltr" inputMode="email" autoComplete="email" placeholder="name@example.com" value={data.email} onChange={(event) => set("email", event.target.value)} error={errors.email} /></div>}</div></>}
    </section>{failed && <div className="submit-error" role="alert">{failed}</div>}<footer>{step > 1 ? <button type="button" className="back" onClick={back}><ArrowRight size={18} /> رجوع</button> : <span />}<button type="button" className="primary" onClick={step === total ? submit : next} disabled={sending}>{sending ? <><span className="spinner" />جاري الإرسال</> : step === total ? <>إرسال الطلب <ArrowLeft size={18} /></> : <>التالي <ArrowLeft size={18} /></>}</button></footer></form><p className="privacy">بياناتك لفهم طلبك والتواصل معك فقط.</p></main>;
}
function Intro() {
  return (
    <main className="intro intro-v2">
      <div className="intro-aura" />
      <div className="orbit">
        <i />
        <i />
        <i />
        <span>
          <Sparkles size={21} />
        </span>
      </div>
      <h1>
        <span className="intro-question">عندك سؤال أو فكرة؟</span>
        <strong>خلّنا نحدد الخطوة المناسبة.</strong>
      </h1>
      <p>جلسة مركزة أو خدمة فعلية، حسب احتياجك.</p>
      <div className="intro-line">
        <span />
      </div>
      <span className="intro-skip">واضح، مباشر، وبدون تعقيد</span>
    </main>
  );
}
let typingTimer;
function triggerTypingFx(event) {
  if (!event.target.matches("input,textarea")) return;
  const shell = event.currentTarget.closest(".shell");
  shell?.classList.remove("typing");
  void shell?.offsetWidth;
  shell?.classList.add("typing");
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => shell?.classList.remove("typing"), 380);
}
function Success() {
  return (
    <main className="shell success-wrap">
      <section className="success">
        <div className="success-mark">
          <Check />
        </div>
        <p className="eyebrow">تم الاستلام</p>
        <h1>وصلني طلبك</h1>
        <p>براجع التفاصيل، وإذا كان الطلب مناسبًا بتواصل معك قريب لتحديد الخطوة التالية.</p>
        <strong>شكرًا لثقتك.</strong>
      </section>
    </main>
  );
}
function AdminApp() {
  const [auth, setAuth] = useState({ loading: true, user: null, error: "" }),
    [rows, setRows] = useState([]),
    [queryText, setQueryText] = useState(""),
    [statusFilter, setStatusFilter] = useState("all"),
    [typeFilter, setTypeFilter] = useState("all"),
    [sourceFilter, setSourceFilter] = useState("all"),
    [sort, setSort] = useState("newest"),
    [selectedId, setSelectedId] = useState(null),
    [dataError, setDataError] = useState(""),
    [analyticsEvents, setAnalyticsEvents] = useState([]),
    [analyticsError, setAnalyticsError] = useState("");
  useEffect(() => {
    document.title = "طلبات خالد · AI Workflow";
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/admin-manifest-v2.webmanifest";
    document.head.appendChild(manifest);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations
              .filter(
                (registration) => registration.scope === `${location.origin}/`,
              )
              .map((registration) => registration.unregister()),
          ),
        )
        .then(() =>
          navigator.serviceWorker.register("/admin-sw-v2.js", {
            scope: "/admin/",
          }),
        )
        .catch(() => {});
    }
    return () => manifest.remove();
  }, []);
  useEffect(
    () =>
      onAdminAuth(
        (user) => setAuth({ loading: false, user, error: "" }),
        (err) => setAuth({ loading: false, user: null, error: err.message }),
      ),
    [],
  );
  useEffect(() => {
    if (auth.user?.email !== OWNER_EMAIL) return;
    if (window.location.pathname.startsWith("/admin/analytics"))
      return subscribeAnalyticsEvents(setAnalyticsEvents, (e) => setAnalyticsError(e.message));
    return subscribeSubmissions(setRows, (e) => setDataError(e.message));
  }, [auth.user]);
  if (auth.loading) return <AdminLoading />;
  if (!auth.user)
    return (
      <AdminLogin
        error={auth.error}
        onLogin={async () => {
          try {
            await signInAdmin();
          } catch (e) {
            setAuth((a) => ({ ...a, error: e.message }));
          }
        }}
      />
    );
  if (auth.user.email !== OWNER_EMAIL)
    return (
      <main className="admin-login">
        <section>
          <div className="denied">
            <LogOut />
          </div>
          <h1>هذا الحساب غير مصرح له</h1>
          <p>لوحة الإدارة خاصة بحساب خالد فقط.</p>
          <button className="primary" onClick={signOutAdmin}>
            تسجيل الخروج
          </button>
        </section>
      </main>
    );
  if (window.location.pathname.startsWith("/admin/analytics"))
    return <AnalyticsDashboard user={auth.user} events={analyticsEvents} error={analyticsError} />;
  const filtered = rows
    .filter((r) =>
      [displayName(r), requestDescription(r), r.email, r.phone, r.organization_name, serviceTypeLabel(r)]
        .join(" ")
        .toLowerCase()
        .includes(queryText.toLowerCase()),
    )
    .filter((r) => statusFilter === "all" || requestState(r) === statusFilter)
    .filter((r) => typeFilter === "all" || r.customer_type === typeFilter)
    .filter(
      (r) => sourceFilter === "all" || (r.source || "direct") === sourceFilter,
    )
    .sort((a, b) => {
      const aTime = a.submitted_at?.seconds || 0;
      const bTime = b.submitted_at?.seconds || 0;
      return sort === "oldest" ? aTime - bTime : bTime - aTime;
    });
  const selected = rows.find((row) => row.id === selectedId);
  return (
    <main className="admin-shell">
      <AdminHeader user={auth.user} />
      <Stats rows={rows} />
      <section className="requests">
        <div className="requests-head">
          <div>
            <p className="admin-kicker">إدارة الطلبات</p>
            <h2>طلبات الجلسات والخدمات</h2>
          </div>
          <span className="results-count">
            {filtered.length} من {rows.length}
          </span>
        </div>
        <div className="filters" aria-label="فلترة الطلبات">
          <label className="search">
            <Search size={17} />
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="ابحث بالاسم أو المشكلة"
            />
          </label>
          <label className="filter-control">
            <SlidersHorizontal size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="الحالة"
            >
              <option value="all">كل الحالات</option>
              <option value="new">جديد</option>
              <option value="reviewing">قيد المراجعة</option>
              <option value="reviewed">مكتمل</option>
            </select>
          </label>
          <label className="filter-control">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="نوع العميل"
            >
              <option value="all">كل العملاء</option>
              <option value="individual">أفراد</option>
              <option value="organization_or_project_owner">جهات وأصحاب مشاريع</option>
              <option value="organization">جهات قديمة</option>
            </select>
          </label>
          <label className="filter-control">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="المصدر"
            >
              <option value="all">كل المصادر</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="live">Live</option>
              <option value="direct">Direct</option>
              <option value="referral">إحالة</option>
              <option value="other">Other</option>
              <option value="instagram">Instagram (قديم)</option>
            </select>
          </label>
          <label className="filter-control sort-control">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="الترتيب"
            >
              <option value="newest">الأحدث أولًا</option>
              <option value="oldest">الأقدم أولًا</option>
            </select>
          </label>
        </div>
        {dataError && (
          <div className="submit-error">تعذر تحميل الطلبات: {dataError}</div>
        )}
        <div className="requests-table-wrap">
          <table className="requests-table">
            <thead>
              <tr>
                <th>العميل</th>
                <th>الطلب</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th aria-label="فتح" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <RequestRow
                  key={row.id}
                  row={row}
                  onOpen={() => setSelectedId(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="request-cards-mobile">
          {filtered.map((row) => (
            <RequestMobileCard
              key={row.id}
              row={row}
              onOpen={() => setSelectedId(row.id)}
            />
          ))}
        </div>
        <div>
          {!filtered.length && !dataError && (
            <div className="empty">ما فيه طلبات تطابق الفلاتر.</div>
          )}
        </div>
      </section>
      {selected && (
        <RequestDrawer row={selected} onClose={() => setSelectedId(null)} />
      )}
    </main>
  );
}
function AdminLoading() {
  return (
    <main className="admin-login">
      <span className="spinner dark" />
    </main>
  );
}
function AdminLogin({ onLogin, error }) {
  return (
    <main className="admin-login">
      <section className="admin-login-card">
        <img
          className="admin-app-icon"
          src="/admin-app-icon-v2-512.png"
          alt="أيقونة تطبيق طلبات خالد"
        />
        <p className="admin-kicker">AI · WORKFLOW</p>
        <h1>طلبات خالد</h1>
        <p>راجع طلبات الجلسات والخدمات من مكان واحد.</p>
        <button className="google-button" onClick={onLogin}>
          <LogIn size={19} /> الدخول بحساب Google
        </button>
        <small className="install-hint">
          على الآيفون: افتحها من Safari ثم اختر «إضافة إلى الشاشة الرئيسية».
        </small>
        {error && <div className="submit-error">{error}</div>}
      </section>
    </main>
  );
}
function AdminHeader({ user }) {
  return (
    <header className="admin-header">
      <div className="admin-brand">
        <img src="/khaled-ai-workflow-logo-v1.png" alt="" />
        <span>
          <b>طلبات خالد</b>
          <small>AI Workflow</small>
        </span>
      </div>
      <nav className="admin-nav" aria-label="التنقل في لوحة الإدارة">
        <a href="/admin" className={window.location.pathname === "/admin" || window.location.pathname === "/admin/" ? "active" : ""}><ListChecks size={16} /> الطلبات</a>
        <a href="/admin/analytics" className={window.location.pathname.startsWith("/admin/analytics") ? "active" : ""}><BarChart3 size={16} /> التحليلات</a>
      </nav>
      <div className="admin-user">
        <span>
          <b>{user.displayName || "خالد"}</b>
          <small>{user.email}</small>
        </span>
        {user.photoURL && <img src={user.photoURL} alt="" />}
        <button onClick={signOutAdmin}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

const funnelStages = [
  ["form_view", "مشاهدة النموذج"],
  ["customer_type_selected", "اختيار نوع العميل"],
  ["service_type_selected", "اختيار الخدمة"],
  ["request_started", "بدء وصف الطلب"],
  ["contact_step_reached", "الوصول للتواصل"],
  ["generate_lead", "إرسال الطلب"],
];
const sourceLabels = { tiktok: "TikTok", linkedin: "LinkedIn", live: "Live", direct: "Direct", referral: "Referral", other: "Other" };
const serviceLabels = { short_session: "استشارة قصيرة", deep_session: "استشارة معمقة", service: "خدمة" };
const customerLabels = { individual: "فرد", organization_or_project_owner: "جهة / صاحب مشروع" };

function AnalyticsDashboard({ user, events, error }) {
  const [range, setRange] = useState("30"), [source, setSource] = useState("all"), [customer, setCustomer] = useState("all"), [service, setService] = useState("all");
  const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
  const filtered = events.filter((event) => {
    const time = event.created_at?.toMillis?.() || 0;
    return (!cutoff || time >= cutoff) && (source === "all" || event.source === source) && (customer === "all" || event.customer_type === customer) && (service === "all" || event.service_type === service);
  });
  const count = (name) => filtered.filter((event) => event.event_name === name).length;
  const views = count("form_view"), starts = count("request_started"), contact = count("contact_step_reached"), leads = count("generate_lead");
  const sessions = new Set(filtered.map((event) => event.session_id)).size;
  const conversion = views ? `${Math.round((leads / views) * 100)}%` : "N/A";
  const byDay = aggregateByDay(filtered, range === "1" ? 1 : range === "7" ? 7 : 30);
  return <main className="admin-shell analytics-shell">
    <AdminHeader user={user} />
    <section className="analytics-heading"><div><p className="admin-kicker">Analytics</p><h1>رحلة الزوار والطلبات</h1><p>بيانات تشغيلية مختصرة بدون معلومات شخصية.</p></div></section>
    <section className="analytics-filters" aria-label="فلاتر التحليلات">
      <select value={range} onChange={(e) => setRange(e.target.value)}><option value="1">اليوم</option><option value="7">7 أيام</option><option value="30">30 يومًا</option><option value="all">كل الوقت</option></select>
      <select value={source} onChange={(e) => setSource(e.target.value)}><option value="all">كل المصادر</option>{Object.entries(sourceLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="all">كل العملاء</option>{Object.entries(customerLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select value={service} onChange={(e) => setService(e.target.value)}><option value="all">كل الخدمات</option>{Object.entries(serviceLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
    </section>
    {error && <div className="submit-error">تعذر تحميل التحليلات: {error}</div>}
    <section className="analytics-kpis">
      <AnalyticsKpi label="الزوار / الجلسات" value={sessions} />
      <AnalyticsKpi label="مشاهدات النموذج" value={views} />
      <AnalyticsKpi label="بدأوا الوصف" value={starts} />
      <AnalyticsKpi label="وصلوا للتواصل" value={contact} />
      <AnalyticsKpi label="طلبات مكتملة" value={leads} />
      <AnalyticsKpi label="نسبة التحويل" value={conversion} />
    </section>
    {!filtered.length && !error ? <section className="analytics-empty"><BarChart3 /><h2>ما فيه بيانات ضمن الفلاتر الحالية</h2><p>تبدأ الأرقام بالظهور مع زيارات النموذج الجديدة.</p></section> : <>
      <section className="analytics-grid">
        <article className="analytics-card funnel-card"><h2>مسار النموذج</h2><div className="funnel-list">{funnelStages.map(([name,label], index) => { const value = count(name), previous = index ? count(funnelStages[index - 1][0]) : value, rate = previous ? Math.round(value / previous * 100) : null, drop = previous ? Math.max(previous - value, 0) : 0; return <div key={name}><span><b>{label}</b><small>{index ? `${rate ?? "N/A"}% من المرحلة السابقة · فقد ${drop}` : "نقطة البداية"}</small></span><strong>{value}</strong><i style={{ width: `${views ? Math.min(value / views * 100, 100) : 0}%` }} /></div>; })}</div></article>
        <article className="analytics-card"><h2>الزيارات والطلبات</h2><div className="timeline-chart">{byDay.map((day) => <div key={day.key}><span className="bars"><i style={{ height: `${day.views ? Math.max(day.views / byDay.max * 100, 8) : 0}%` }} /><i className="lead" style={{ height: `${day.leads ? Math.max(day.leads / byDay.max * 100, 8) : 0}%` }} /></span><small>{day.label}</small></div>)}</div><div className="chart-legend"><span><i />زيارات</span><span><i className="lead" />طلبات</span></div></article>
      </section>
      <section className="analytics-grid three"><Breakdown title="مصادر الزيارة" rows={breakdown(filtered.filter(e => e.event_name === "form_view"), "source", sourceLabels)} /><Breakdown title="الطلب على الخدمات" rows={breakdown(filtered.filter(e => e.event_name === "service_type_selected"), "service_type", serviceLabels)} /><Breakdown title="نوع العميل" rows={breakdown(filtered.filter(e => e.event_name === "customer_type_selected"), "customer_type", customerLabels)} /></section>
    </>}
  </main>;
}
function AnalyticsKpi({ label, value }) { return <article><small>{label}</small><strong>{value}</strong></article>; }
function breakdown(events, key, labels) { const counts = {}; events.forEach((event) => { const value = event[key] || "other"; counts[value] = (counts[value] || 0) + 1; }); return Object.entries(labels).map(([value,label]) => ({ label, value: counts[value] || 0 })).filter((row) => row.value); }
function Breakdown({ title, rows }) { const max = Math.max(...rows.map((row) => row.value), 1); return <article className="analytics-card breakdown"><h2>{title}</h2>{rows.length ? rows.map((row) => <div key={row.label}><span><b>{row.label}</b><strong>{row.value}</strong></span><i><em style={{ width: `${row.value / max * 100}%` }} /></i></div>) : <p className="mini-empty">لا توجد بيانات بعد.</p>}</article>; }
function aggregateByDay(events, days) { const result = []; const actualDays = Math.min(days, 30); for (let offset = actualDays - 1; offset >= 0; offset--) { const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() - offset); const key = date.toISOString().slice(0,10); result.push({ key, label: new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date), views: 0, leads: 0 }); } events.forEach((event) => { const date = event.created_at?.toDate?.(); if (!date) return; const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0,10); const day = result.find((item) => item.key === key); if (day && event.event_name === "form_view") day.views++; if (day && event.event_name === "generate_lead") day.leads++; }); result.max = Math.max(...result.flatMap((day) => [day.views, day.leads]), 1); return result; }
function Stats({ rows }) {
  const total = rows.length,
    fresh = rows.filter((r) => requestState(r) === "new").length,
    reviewing = rows.filter((r) => requestState(r) === "reviewing").length,
    reviewed = rows.filter((r) => requestState(r) === "reviewed").length,
    donePercent = total ? Math.round((reviewed / total) * 100) : 0;
  return (
    <section className="stats-board">
      <article className="overview-card">
        <div>
          <p className="admin-kicker">نظرة سريعة</p>
          <h1>{total} طلب</h1>
          <small>كل الطلبات المستلمة</small>
        </div>
        <div
          className="donut"
          style={{ "--progress": `${donePercent * 3.6}deg` }}
        >
          <span>
            <b>{donePercent}%</b>
            <small>مكتمل</small>
          </span>
        </div>
      </article>
      <div className="stat-grid">
        <Stat
          icon={UsersRound}
          label="كل الطلبات"
          value={total}
          tone="purple"
        />
        <Stat
          icon={CircleDashed}
          label="طلبات جديدة"
          value={fresh}
          tone="amber"
        />
        <Stat
          icon={FileText}
          label="قيد المراجعة"
          value={reviewing}
          tone="blue"
        />
        <Stat
          icon={CircleCheckBig}
          label="مكتملة"
          value={reviewed}
          tone="green"
        />
      </div>
    </section>
  );
}
function Stat({ icon: Icon, label, value, tone }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone}`}>
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}
const stateLabels = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  reviewed: "مكتمل",
};
function requestState(row) {
  return ["reviewing", "reviewed"].includes(row.status) ? row.status : "new";
}
function formatDate(row, withTime = false) {
  const date = row.submitted_at?.toDate?.();
  if (!date) return "الآن";
  return new Intl.DateTimeFormat(
    "ar-SA",
    withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  ).format(date);
}
function displayName(row) {
  return (
    row.full_name ||
    `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
    "بدون اسم"
  );
}
function requestDescription(row) {
  return row.request_description || row.ai_need || "بدون وصف";
}
function customerTypeLabel(row) {
  return ["organization", "organization_or_project_owner"].includes(row.customer_type) ? "جهة / مشروع" : "فرد";
}
function serviceTypeLabel(row) {
  return { short_session: "جلسة قصيرة", deep_session: "جلسة معمقة", service: "خدمة" }[row.service_type] || "طلب سابق";
}
function StatusBadge({ row }) {
  const state = requestState(row);
  return (
    <span className={`status-badge ${state}`}>
      <i />
      {stateLabels[state]}
    </span>
  );
}
function RequestRow({ row, onOpen }) {
  return (
    <tr
      onClick={onOpen}
      tabIndex="0"
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      <td>
        <div className="client-cell">
          <span>{displayName(row).slice(0, 1)}</span>
          <div>
            <b>{displayName(row)}</b>
            <small dir="ltr">{row.phone}</small>
          </div>
        </div>
      </td>
      <td>
        <p className="need-cell">{requestDescription(row)}</p>
      </td>
      <td>
        <span className="plain-tag">
          {serviceTypeLabel(row)} · {customerTypeLabel(row)}
        </span>
      </td>
      <td>
        <StatusBadge row={row} />
      </td>
      <td>
        <span className="date-cell">{formatDate(row)}</span>
      </td>
      <td>
        <button
          className="row-open"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          aria-label={`فتح طلب ${displayName(row)}`}
        >
          <ChevronLeft />
        </button>
      </td>
    </tr>
  );
}
function RequestMobileCard({ row, onOpen }) {
  return (
    <button className="request-mobile-card" onClick={onOpen}>
      <div>
        <span className="mobile-avatar">{displayName(row).slice(0, 1)}</span>
        <span>
          <b>{displayName(row)}</b>
          <small>{formatDate(row)}</small>
        </span>
        <StatusBadge row={row} />
      </div>
      <p>{requestDescription(row)}</p>
      <span className="mobile-card-foot">
        <span>
          {serviceTypeLabel(row)} · {customerTypeLabel(row)}
        </span>
        <ChevronLeft size={17} />
      </span>
    </button>
  );
}
function RequestDrawer({ row, onClose }) {
  const [classification, setClassification] = useState(
      row.classification || "NEEDS_CLARIFICATION",
    ),
    [notes, setNotes] = useState(row.khaled_notes || ""),
    [draft, setDraft] = useState(row.draft_message || ""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(""),
    [deleting, setDeleting] = useState(false);
  const save = async (status) => {
    setSaving(true);
    setSaved("");
    try {
      await updateSubmission(row.id, {
        classification,
        khaled_notes: notes,
        draft_message: draft,
        draft_status: status,
        status: status === "approved" ? "reviewed" : "reviewing",
      });
      setSaved(
        status === "approved" ? "تم اعتماد المسودة — لم تُرسل" : "تم الحفظ",
      );
    } catch (e) {
      setSaved("تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };
  const generate = () => {
    setDraft(buildKnowledgeDraft(row, classification, notes));
    setSaved("مسودة معرفية جاهزة للمراجعة");
  };
  const remove = async () => {
    if (!window.confirm(`حذف طلب ${displayName(row)} نهائيًا؟`)) return;
    setDeleting(true);
    try {
      await deleteSubmission(row.id);
      onClose();
    } catch {
      setSaved("تعذر حذف الطلب");
      setDeleting(false);
    }
  };
  return (
    <div
      className="drawer-layer"
      role="dialog"
      aria-modal="true"
      aria-label={`طلب ${displayName(row)}`}
    >
      <button
        className="drawer-backdrop"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <aside className="request-drawer">
        <header className="drawer-header">
          <div>
            <p>تفاصيل الطلب</p>
            <h2>{displayName(row)}</h2>
          </div>
          <button onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>
        <div className="drawer-scroll">
          <div className="drawer-meta">
            <StatusBadge row={row} />
            <span>{formatDate(row, true)}</span>
            <span>
              {customerTypeLabel(row)} · {serviceTypeLabel(row)}
            </span>
            <span>{row.source || "direct"}</span>
          </div>
          {row.organization_name && (
            <p className="drawer-org">{row.organization_name}</p>
          )}
          <section className="need-box">
            <small>وصف الطلب</small>
            <p>{requestDescription(row)}</p>
          </section>
          <div className="drawer-contact">
            <a href={`tel:${row.phone}`} dir="ltr">
              <Phone size={16} />
              {row.phone}
            </a>
            {row.email && (
              <a href={`mailto:${row.email}`} dir="ltr">
                <Mail size={16} />
                {row.email}
              </a>
            )}
            <span>
              {
                contactOptions.find((x) => x.v === row.preferred_contact_method)
                  ?.l
              }
            </span>
          </div>
          <section className="review-panel">
            <label>
              <span>تصنيف الطلب</span>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              >
                <option value="SUITABLE_CLEAR">مناسب وواضح</option>
                <option value="NEEDS_CLARIFICATION">يحتاج توضيح</option>
                <option value="OUT_OF_SCOPE">خارج النطاق</option>
                <option value="HIGH_RISK_HUMAN_REVIEW">
                  حساس — مراجعة بشرية
                </option>
              </select>
            </label>
            <label>
              <span>ملاحظات خالد</span>
              <textarea
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="وش فهمت من الطلب؟ وش النقاط الناقصة؟"
              />
            </label>
            <button className="draft-button" onClick={generate}>
              <WandSparkles size={17} /> إعداد مسودة من قاعدة المعرفة
            </button>
            <label>
              <span>المسودة — لا تُرسل تلقائيًا</span>
              <textarea
                rows="9"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="أنشئ المسودة ثم عدلها هنا..."
              />
            </label>
            <div className="review-actions">
              <button onClick={() => save("draft")} disabled={saving}>
                <Save size={16} /> حفظ كمسودة
              </button>
              <button
                className="approve"
                onClick={() => save("approved")}
                disabled={saving || !draft.trim()}
              >
                <Check size={16} /> اعتماد دون إرسال
              </button>
            </div>
            {saved && <small className="save-state">{saved}</small>}
          </section>
          <button
            className="delete-request"
            onClick={remove}
            disabled={deleting}
          >
            <Trash2 size={16} />
            {deleting ? "جاري الحذف" : "حذف الطلب"}
          </button>
        </div>
      </aside>
    </div>
  );
}
function buildKnowledgeDraft(row, classification, notes) {
  const first =
    (row.full_name || row.first_name || "").trim().split(" ")[0] || "هلا";
  if (classification === "NEEDS_CLARIFICATION")
    return `هلا ${first}،\n\nوصلني طلبك، وأحتاج أفهم المهمة بشكل أدق عشان ما أعطيك كلام عام ما يفيدك.\n\nوش المهمة اللي تكررها أو تستهلك وقتك حاليًا؟ وإذا تقدر، اذكر مثالًا واحدًا للمدخل والنتيجة اللي تحتاجها.\n\nخالد`;
  if (classification === "OUT_OF_SCOPE")
    return `هلا ${first}،\n\nراجعت طلبك، والاحتياج المذكور خارج نطاق الخدمات اللي أقدمها حاليًا، لذلك ما ودي أوعدك بحل ما أقدر أنفذه بالجودة المطلوبة.\n\nيعطيك العافية،\nخالد`;
  if (classification === "HIGH_RISK_HUMAN_REVIEW")
    return `هلا ${first}،\n\nراجعت طلبك، ويبدو أنه يتضمن جانبًا حساسًا يحتاج نفهم نوع البيانات والقرارات المتأثرة قبل اقتراح أي استخدام للذكاء الاصطناعي.\n\nما راح نعتمد اتجاهًا قبل التأكد من الخصوصية والحدود المناسبة.\n\nخالد`;
  const need = requestDescription(row);
  return `هلا ${first}،\n\nراجعت طلبك، وفهمت إن المشكلة الأساسية عندك مرتبطة بـ: ${need}\n\nمبدئيًا، نحتاج نفصل الجزء المتكرر عن الجزء اللي يحتاج قرار بشري، وبعدها نحدد هل الأنسب ذكاء توليدي، أتمتة ثابتة، أو حل أبسط بدون AI.\n\nقبل ما نعتمد أي حل، أحتاج أعرف: وش المدخلات اللي تبدأ منها؟ وشكل النتيجة النهائية اللي تحتاجها؟${notes ? `\n\nملاحظة من مراجعتي: ${notes}` : ""}\n\nهذا النوع قريب من الأشياء اللي أقدر أساعد فيها عمليًا، والتفصيل نبنيه حسب أدواتك وطريقة شغلك بدل حل عام.\n\nخالد`;
}
createRoot(document.getElementById("root")).render(<App />);
