# دليل النشر على Vercel (Deployment Guide)

هذا الدليل يشرح الإعدادات الخاصة بملف `vercel.json` وكيفية نشر التطبيق.

## 1. ملف إعدادات Vercel (`vercel.json`)

بما أننا نستخدم Express كـ Backend، نحتاج لإخبار Vercel بتوجيه طلبات الـ API إلى ملف السيرفر، وطلبات الواجهة (Frontend) إلى الملفات الثابتة.

قم بإنشاء ملف باسم `vercel.json` في المجلد الرئيسي بالمحتوى التالي:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

*ملاحظة: ستحتاج إلى تعديل هيكلية المشروع قليلاً لإنشاء مجلد `api` يحتوي على نقطة دخول (Entry Point) للسيرفر لكي يفهمها Vercel.*

## 2. تعديل `package.json`

تأكد من أن أوامر البناء (Build) صحيحة:

```json
"scripts": {
  "build": "vite build",
  "start": "node server.js" 
}
```

في Vercel، الأمر الافتراضي هو `npm run build`، وسيقوم بإنشاء مجلد `dist` للملفات الثابتة.

## 3. خطوات النشر (Deployment Steps)

1.  **GitHub:**
    *   قم بعمل Commit و Push للكود إلى مستودع GitHub الخاص بك.

2.  **Vercel Dashboard:**
    *   اضغط **Add New...** -> **Project**.
    *   اختر مستودع GitHub الخاص بالمشروع.
    *   في خانة **Framework Preset**، اختر `Vite`.
    *   في خانة **Root Directory**، اتركه `./` (الافتراضي).

3.  **Environment Variables (المتغيرات البيئية):**
    *   اضغط على قسم **Environment Variables**.
    *   أضف المفاتيح الخاصة بـ Supabase التي حصلت عليها:
        *   `VITE_SUPABASE_URL`
        *   `VITE_SUPABASE_ANON_KEY`
        *   `SUPABASE_SERVICE_ROLE_KEY` (للاستخدام في السيرفر فقط)

4.  **Deploy:**
    *   اضغط **Deploy**.
    *   انتظر حتى تكتمل العملية (دقيقة أو دقيقتين).

## 4. استكشاف الأخطاء (Troubleshooting)

*   **خطأ 404 في الـ API:** تأكد من أن ملف `vercel.json` موجود وأنك قمت بتحويل كود السيرفر ليعمل كـ Serverless Function (كما هو مشروح في خطة الانتقال).
*   **خطأ اتصال قاعدة البيانات:** تأكد من أن المتغيرات البيئية صحيحة وأنك لا تستخدم `better-sqlite3` في بيئة Vercel.
