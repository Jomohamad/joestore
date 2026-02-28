# خطة الانتقال إلى Supabase و Vercel

هذه الخطة تشرح كيفية تحويل المشروع من العمل محلياً باستخدام SQLite إلى العمل سحابياً باستخدام Supabase (قاعدة بيانات) و Vercel (استضافة).

## المرحلة 1: إعداد Supabase (قاعدة البيانات)

1.  **إنشاء مشروع جديد:**
    *   اذهب إلى [Supabase.com](https://supabase.com) وقم بإنشاء مشروع جديد.
    *   احفظ `Project URL` و `API Key (service_role)` و `Anon Key`.

2.  **إنشاء الجداول (Database Schema):**
    *   اذهب إلى الـ **SQL Editor** في لوحة تحكم Supabase.
    *   انسخ محتوى الملف المرفق `SUPABASE_SCHEMA.sql` والصقه هناك.
    *   اضغط **Run** لإنشاء الجداول وإدخال البيانات الأولية.

## المرحلة 2: تعديل الكود (Backend Refactoring)

بما أن Vercel لا يدعم SQLite (لأنه Serverless)، يجب استبدال `better-sqlite3` بـ `@supabase/supabase-js`.

1.  **تثبيت المكتبة:**
    ```bash
    npm install @supabase/supabase-js
    ```

2.  **إنشاء ملف اتصال Supabase:**
    *   بدلاً من `server/db.ts`، سنقوم بإنشاء `server/supabase.ts` لتهيئة الاتصال.

3.  **تحديث `server.ts`:**
    *   استبدال جميع استعلامات SQL المباشرة (مثل `db.prepare(...).run()`) باستدعاءات Supabase (مثل `supabase.from('games').select('*')`).
    *   تحويل الـ API Routes لتعمل كـ Serverless Functions (أو استخدام Express داخل Vercel Function).

## المرحلة 3: إعداد Vercel (الاستضافة)

1.  **تجهيز المشروع:**
    *   تأكد من وجود ملف `vercel.json` لتوجيه الطلبات (انظر ملف `VERCEL_DEPLOYMENT_GUIDE.md`).

2.  **رفع الكود:**
    *   ارفع المشروع إلى GitHub.

3.  **الربط مع Vercel:**
    *   سجل دخولك في Vercel واربط حساب GitHub.
    *   استورد المستودع (Repository).

## المرحلة 4: المتغيرات البيئية (Environment Variables)

يجب إضافة المتغيرات التالية في إعدادات المشروع على Vercel:

*   `SUPABASE_URL`: رابط مشروعك.
*   `SUPABASE_KEY`: المفتاح العام (Anon Key).
*   `SUPABASE_SERVICE_ROLE_KEY`: المفتاح السري (للعمليات الحساسة من السيرفر فقط).

---

**هل تريد مني البدء في تنفيذ "المرحلة 2" (تعديل الكود) الآن؟**
*ملاحظة: هذا سيجعل التطبيق يتوقف عن العمل محلياً حتى تقوم بإضافة مفاتيح Supabase في ملف `.env`.*
