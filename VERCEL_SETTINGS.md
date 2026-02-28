# Vercel Environment Variables & Settings

هذا الملف يشرح جميع المتغيرات البيئية (Environment Variables) المطلوبة لتشغيل المشروع على Vercel، بالإضافة إلى الإعدادات الأساسية.

## 1. المتغيرات البيئية (Environment Variables)

يجب إضافة هذه المتغيرات في لوحة تحكم Vercel تحت قسم **Settings > Environment Variables**.

| اسم المتغير | الوصف | مثال للقيمة | ملاحظات |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | رابط مشروع Supabase الخاص بك. يستخدمه الـ Frontend والـ Backend. | `https://xyz.supabase.co` | تجده في Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام (Public Key) لمشروع Supabase. يستخدمه الـ Frontend. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | تجده في Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | المفتاح السري (Secret Key) لمشروع Supabase. يستخدمه الـ Backend فقط للعمليات الحساسة (تجاوز RLS إذا لزم الأمر). | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **هام جداً:** لا تشارك هذا المفتاح أبداً ولا تضعه في كود الـ Frontend. |

### شرح تفصيلي:

*   **`VITE_SUPABASE_URL`**: هو العنوان الذي يوجه إليه التطبيق طلبات قاعدة البيانات.
*   **`VITE_SUPABASE_ANON_KEY`**: يسمح للمستخدمين "المجهولين" (غير المسجلين دخولهم) بالتفاعل مع قاعدة البيانات وفقاً لسياسات الأمان (RLS) التي حددتها.
*   **`SUPABASE_SERVICE_ROLE_KEY`**: يمنح صلاحيات كاملة على قاعدة البيانات. في هذا التطبيق، نستخدمه في السيرفر لضمان تنفيذ العمليات (مثل إنشاء الطلبات) بغض النظر عن سياسات المستخدم، رغم أننا يمكننا الاكتفاء بـ Anon Key إذا كانت السياسات مضبوطة بشكل صحيح، لكن وجوده يمنح مرونة أكبر للسيرفر.

## 2. إعدادات المشروع (Project Settings)

عند إنشاء المشروع على Vercel، تأكد من الإعدادات التالية:

*   **Framework Preset**: اختر `Vite`.
*   **Root Directory**: `./` (المجلد الرئيسي).
*   **Build Command**: `npm run build` (أو `vite build`).
*   **Output Directory**: `dist`.
*   **Install Command**: `npm install`.

## 3. ملف `vercel.json`

تم إنشاء ملف `vercel.json` في المشروع لضمان التوجيه الصحيح:

*   أي طلب يبدأ بـ `/api/` يتم توجيهه إلى `api/index.ts` (الذي يشغل سيرفر Express).
*   أي طلب آخر يتم توجيهه إلى `index.html` (ليتم التعامل معه بواسطة React Router في الـ Frontend).

## 4. ملاحظات هامة للنشر

*   **قاعدة البيانات**: تأكد من أنك قمت بتنفيذ كود SQL الموجود في `SUPABASE_SCHEMA.sql` داخل Supabase قبل نشر التطبيق، وإلا لن تعمل قاعدة البيانات.
*   **البيانات**: التطبيق سيبدأ بقاعدة بيانات فارغة (باستثناء البيانات الأولية التي أضفتها عبر SQL).
*   **الأمان**: تأكد من تفعيل Row Level Security (RLS) في Supabase لاحقاً لتقييد الوصول إذا تطور التطبيق ليسمح بتسجيل دخول المستخدمين.
