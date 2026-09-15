# Khaled AI Intake

تجربة عربية RTL متعددة الخطوات لاستقبال طلبات الاستشارات والخدمات التقنية، مع لوحة إدارة خاصة ومحمية.

## المزايا

- تدفق Mobile-first من أربع خطوات.
- استشارة قصيرة أو معمقة، أو طلب خدمة تنفيذية.
- حقول تواصل ديناميكية حسب الطريقة المختارة.
- حفظ الطلبات في Firebase Firestore بعد تأكيد الخادم.
- لوحة إدارة محمية بتسجيل Google وقواعد Firestore.
- توافق مع الطلبات المسجلة بالصيغة السابقة.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local
npm run dev
```

املأ متغيرات Firebase العامة في `.env.local`. هذا الملف مستثنى من Git ولا يجب رفعه.

## البناء

```bash
npm run build
```

## Firebase

- مجموعة الطلبات: `intake_submissions`
- مجموعة أحداث التحليلات: `analytics_events`
- مسار لوحة الإدارة: `/admin`
- مسار التحليلات: `/admin/analytics`
- قواعد الوصول: `firestore.rules`
- إعدادات النشر: `firebase.json`

## Google Analytics 4

لوحة الـFunnel الداخلية تعمل مباشرة عبر Firestore. لتفعيل GA4، اربط مشروع Firebase الحالي بـGoogle Analytics ثم أضف `VITE_FIREBASE_MEASUREMENT_ID` إلى بيئة النشر وأعد البناء.

لا تُرسل الأسماء أو بيانات التواصل أو اسم الجهة أو نص الطلب إلى Analytics.

## الأمان

- لا يحتوي المستودع على مفاتيح خاصة أو بيانات اعتماد.
- إعدادات البيئة المحلية وملفات البناء وبيانات Firebase المحلية مستثناة عبر `.gitignore`.
- مفاتيح Firebase العامة لتطبيقات الويب ليست بديلًا عن قواعد Firestore؛ التحكم الفعلي بالوصول موجود في `firestore.rules`.
