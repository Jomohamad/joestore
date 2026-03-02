# دليل المشروع الشامل (Comprehensive Project Guide)

هذا الملف يحتوي على جميع التعليمات والأدلة الخاصة بالمشروع مجمعة في مكان واحد.

---

## الفهرس
1. [دليل تحديث التطبيق وقاعدة البيانات (Update Guide)](#1-دليل-تحديث-التطبيق-وقاعدة-البيانات-update-guide)
2. [دليل إعداد مصادقة Supabase (Auth Guide)](#2-دليل-إعداد-مصادقة-supabase-auth-guide)
3. [حل مشكلة Google Auth (Google Auth Fix)](#3-حل-مشكلة-google-auth-google-auth-fix)
4. [دليل تخزين الصور (Storage Guide)](#4-دليل-تخزين-الصور-storage-guide)
5. [دليل الأمان (Security Guide)](#5-دليل-الأمان-security-guide)
6. [دليل النشر (Deployment Guide)](#6-دليل-النشر-deployment-guide)
7. [إعدادات Vercel (Vercel Settings)](#7-إعدادات-vercel-vercel-settings)
8. [حل المشاكل (Troubleshooting)](#8-حل-المشاكل-troubleshooting)
9. [حل مشكلة المفاتيح المفقودة (Missing Keys Fix)](#9-حل-مشكلة-المفاتيح-المفقودة-missing-keys-fix)

---

## 1. دليل تحديث التطبيق وقاعدة البيانات (Update Guide)

لقد تم إجراء التعديلات التالية على الكود:

1.  **إزالة تسجيل الدخول بالبريد الإلكتروني**: تم حذف صفحة إنشاء الحساب وتعديل صفحة تسجيل الدخول لتدعم فقط Google و Apple و Discord.
2.  **إضافة تطبيقات جديدة**: تم إنشاء ملف SQL لإضافة TikTok و Steam و Xbox إلى قاعدة البيانات.

### الخطوات المطلوبة منك الآن:

#### أ. تحديث قاعدة البيانات (Supabase)
يجب عليك تشغيل ملف `COMBINED_SCHEMA.sql` في قاعدة بيانات Supabase الخاصة بك لإضافة التطبيقات الجديدة.

1.  اذهب إلى لوحة تحكم **Supabase**.
2.  انتقل إلى **SQL Editor**.
3.  اضغط على **New Query**.
4.  انسخ محتوى ملف `COMBINED_SCHEMA.sql` الموجود في ملفات المشروع.
5.  الصقه في المحرر واضغط **Run**.

#### ب. إعداد تسجيل الدخول الاجتماعي (Social Login)
يجب عليك تفعيل Apple و Discord في Supabase بالإضافة إلى Google الذي قمت بإعداده سابقاً.

**لإعداد Discord:**
1.  اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications).
2.  أنشئ تطبيقاً جديداً (New Application).
3.  اذهب إلى **OAuth2**.
4.  أضف الـ Redirect URL الخاص بـ Supabase (نفس الرابط الذي استخدمته مع Google).
5.  انسخ **Client ID** و **Client Secret**.
6.  في Supabase > Authentication > Providers، فعل **Discord** وأدخل البيانات.

**لإعداد Apple:**
*   يتطلب حساب مطور Apple (مدفوع). إذا لم يكن لديك، يمكنك تجاهل هذا الجزء أو تركه معطلاً في Supabase (سيظهر الزر ولكن سيعطي خطأ عند الضغط عليه).

#### ج. تنظيف الملفات
لقد قمت بحذف صفحة `Signup.tsx` وتحديث الروابط. يمكنك الآن حذف أي ملفات أخرى تراها غير ضرورية يدوياً إذا أردت، ولكن الملفات الحالية كلها ضرورية لعمل الموقع.

---

## 2. دليل إعداد مصادقة Supabase (Auth Guide)

To make the Login and Signup functionality work, you need to configure Authentication in your Supabase project.

### Enable Email/Password Auth

1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Authentication** > **Providers**.
3.  Click on **Email**.
4.  Ensure **Enable Email provider** is toggled **ON**.
5.  Uncheck "Confirm email" if you want users to be able to login immediately without verifying their email (useful for testing).
6.  Click **Save**.

### Enable Google OAuth

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Search for **"OAuth consent screen"** and configure it (External).
4.  Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
5.  Select **Web application**.
6.  Add your **Authorized redirect URIs**:
    *   You can find this URL in your Supabase Dashboard under **Authentication** > **URL Configuration** > **Site URL**.
    *   It usually looks like: `https://<your-project-ref>.supabase.co/auth/v1/callback`
7.  Copy the **Client ID** and **Client Secret**.
8.  Go back to **Supabase Dashboard** > **Authentication** > **Providers**.
9.  Click on **Google**.
10. Toggle **Enable Google provider** to **ON**.
11. Paste your **Client ID** and **Client Secret**.
12. Click **Save**.

### URL Configuration

**IMPORTANT:** Since you are running this in the AI Studio preview, you **cannot** use `localhost:3000`. You must use the App URL provided by the environment.

1.  In Supabase, go to **Authentication** > **URL Configuration**.
2.  Set the **Site URL** to:
    ```
    https://ais-dev-dfiay2thx25ovzffu7hue6-90317905161.europe-west1.run.app
    ```
3.  In **Redirect URLs**, add the following URLs:
    *   `https://ais-dev-dfiay2thx25ovzffu7hue6-90317905161.europe-west1.run.app`
    *   `https://ais-dev-dfiay2thx25ovzffu7hue6-90317905161.europe-west1.run.app/`
    *   `https://ais-pre-dfiay2thx25ovzffu7hue6-90317905161.europe-west1.run.app` (for the shared view)

### Testing

*   **Sign Up**: Try creating a new account with email/password.
*   **Login**: Try logging in with the account you just created.
*   **Google Login**: Click the "Login with Google" button. It should redirect you to Google, and then back to your app as a logged-in user.

---

## 3. حل مشكلة Google Auth (Google Auth Fix)

هذا الخطأ (Error 400: redirect_uri_mismatch) يعني أن الرابط الذي يستخدمه Supabase للعودة من Google غير مضاف في قائمة الروابط المسموح بها في Google Cloud Console.

لحل المشكلة، اتبع الخطوات التالية بدقة:

### 1. احصل على رابط الـ Callback من Supabase
1.  اذهب إلى لوحة تحكم **Supabase**.
2.  انتقل إلى **Authentication** > **Providers**.
3.  اضغط على **Google** (تأكد أنه مفعل Enabled).
4.  ابحث عن **Callback URL (for OAuth)**.
5.  انسخ هذا الرابط كاملاً. (سيكون مثل: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`)

### 2. أضف الرابط في Google Cloud Console
1.  اذهب إلى [Google Cloud Console](https://console.cloud.google.com/).
2.  تأكد أنك اخترت المشروع الصحيح من القائمة العلوية.
3.  من القائمة الجانبية، اذهب إلى **APIs & Services** > **Credentials**.
4.  في قسم **OAuth 2.0 Client IDs**، اضغط على اسم العميل الذي أنشأته (عادة Web client 1).
5.  انزل إلى قسم **Authorized redirect URIs**.
6.  اضغط على **ADD URI**.
7.  الصق الرابط الذي نسخته من Supabase في الخطوة السابقة.
8.  اضغط **SAVE**.

### 3. جرب مرة أخرى
انتظر بضع دقائق (أحياناً يأخذ Google وقتاً لتحديث الإعدادات)، ثم حاول تسجيل الدخول مرة أخرى في تطبيقك.

---

## 4. دليل تخزين الصور (Storage Guide)

لجعل التطبيق يستخدم الصور من Supabase Storage، اتبع الخطوات التالية:

### 1. إنشاء Bucket للصور
1.  اذهب إلى لوحة تحكم **Supabase**.
2.  انتقل إلى **Storage** من القائمة الجانبية.
3.  اضغط على **New Bucket**.
4.  سمّه `images`.
5.  تأكد من تفعيل خيار **Public bucket** (هذا مهم جداً لتظهر الصور للجميع).
6.  اضغط **Save**.

### 2. رفع الصور
1.  ادخل إلى الـ Bucket الذي أنشأته (`images`).
2.  ارفع صور التطبيقات الجديدة بالأسماء التالية (تأكد من الامتداد jpg أو png):
    *   `tiktok.jpg`
    *   `steam.jpg`
    *   `xbox.jpg`
3.  يمكنك أيضاً رفع صور الألعاب الحالية (مثل `pubg.jpg`, `freefire.jpg`) وتحديث قاعدة البيانات لتشير إليها.

### 3. تحديث قاعدة البيانات
1.  افتح ملف `COMBINED_SCHEMA.sql`.
2.  استبدل `YOUR_PROJECT_ID` بمعرف مشروعك الحقيقي.
    *   يمكنك إيجاده في رابط لوحة التحكم: `https://supabase.com/dashboard/project/<project_id>`
    *   أو في إعدادات المشروع > General > Reference ID.
3.  شغل الملف في **SQL Editor** في Supabase.

### 4. (اختياري) تحديث الألعاب القديمة
إذا أردت تحديث صور الألعاب القديمة (PUBG, Free Fire, etc.) لتستخدم Storage أيضاً:
1.  ارفع صورها إلى الـ Bucket.
2.  شغل أمر SQL لتحديثها:
    ```sql
    UPDATE games SET image_url = 'https://<YOUR_PROJECT_ID>.supabase.co/storage/v1/object/public/images/pubg.jpg' WHERE id = 'pubg-mobile';
    -- كرر الأمر لباقي الألعاب
    ```

---

## 5. دليل الأمان (Security Guide)

إذا ظهرت رسالة تحذير بخصوص كلمات المرور المسربة، فهذا لأنك لم تفعل خاصية التحقق من كلمات المرور المسربة في Supabase. لتفعيلها وحل المشكلة، اتبع الخطوات التالية:

1.  اذهب إلى لوحة تحكم **Supabase** (Dashboard).
2.  اختر مشروعك.
3.  من القائمة الجانبية، اختر **Authentication**.
4.  اضغط على **Providers**.
5.  اختر **Email**.
6.  انزل إلى قسم **Password Policy** (سياسة كلمة المرور).
7.  قم بتفعيل الخيار **"Prevent passwords found in data breaches"** (أو "Enable Leaked Password Protection").
8.  اضغط **Save**.

هذا سيجعل Supabase يتحقق من أن كلمة المرور التي يختارها المستخدم ليست موجودة في قواعد بيانات الاختراقات المعروفة (HaveIBeenPwned)، مما يزيد من أمان تطبيقك.

---

## 6. دليل النشر (Deployment Guide)

بما أنك تريد أن يعمل الموقع بشكل دائم ومتاح للجميع حتى بعد إغلاق AI Studio، يجب عليك "نشر" (Deploy) التطبيق على خدمة استضافة.

أفضل وأسهل خيار لتطبيقات React هو **Vercel** أو **Netlify**. إليك الخطوات بالتفصيل:

### الخطوة 1: رفع الكود إلى GitHub
1.  قم بإنشاء مستودع جديد (Repository) على [GitHub](https://github.com/).
2.  ارفع ملفات المشروع الحالية إلى هذا المستودع.

### الخطوة 2: النشر على Vercel (موصى به)
1.  اذهب إلى [Vercel.com](https://vercel.com/) وقم بإنشاء حساب (يمكنك الدخول بحساب GitHub).
2.  اضغط على **"Add New..."** ثم **"Project"**.
3.  اختر المستودع (Repository) الذي أنشأته للتو واضغط **Import**.
4.  في صفحة الإعدادات (Configure Project):
    *   **Framework Preset**: سيتعرف عليه تلقائياً كـ `Vite`.
    *   **Environment Variables** (مهم جداً):
        *   يجب عليك إضافة المتغيرات الموجودة في ملف `.env` الخاص بك هنا.
        *   أضف `VITE_SUPABASE_URL` وقيمته.
        *   أضف `VITE_SUPABASE_ANON_KEY` وقيمته.
5.  اضغط **Deploy**.

### الخطوة 3: تحديث إعدادات Supabase (مهم جداً)
بمجرد انتهاء النشر، سيعطيك Vercel رابطاً دائماً لموقعك (مثلاً: `https://game-currency-store.vercel.app`).

**يجب عليك تحديث Supabase ليعرف هذا الرابط الجديد:**

1.  اذهب إلى لوحة تحكم **Supabase**.
2.  انتقل إلى **Authentication** > **URL Configuration**.
3.  في خانة **Site URL**، ضع رابط موقعك الجديد (مثلاً: `https://game-currency-store.vercel.app`).
4.  في خانة **Redirect URLs**، أضف الرابط الجديد أيضاً.
5.  **لإعداد Google Auth**:
    *   اذهب إلى **Google Cloud Console**.
    *   انتقل إلى **Credentials** > اختر الـ OAuth Client الخاص بك.
    *   في **Authorized redirect URIs**، أضف الرابط الجديد متبوعاً بـ `/auth/v1/callback`.
    *   مثال: `https://<your-project-ref>.supabase.co/auth/v1/callback` (هذا لا يتغير عادة، ولكن تأكد من أن الـ Origin مسموح به).

### الخطوة 4: مبروك!
الآن موقعك يعمل بشكل دائم على الرابط الجديد، ويمكن لأي شخص في العالم الدخول إليه وتسجيل الدخول وشراء العملات.

---

## 7. إعدادات Vercel (Vercel Settings)

هذا القسم يشرح جميع المتغيرات البيئية (Environment Variables) المطلوبة لتشغيل المشروع على Vercel، بالإضافة إلى الإعدادات الأساسية.

### 1. المتغيرات البيئية (Environment Variables)

يجب إضافة هذه المتغيرات في لوحة تحكم Vercel تحت قسم **Settings > Environment Variables**.

| اسم المتغير | الوصف | مثال للقيمة | ملاحظات |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | رابط مشروع Supabase الخاص بك. يستخدمه الـ Frontend والـ Backend. | `https://xyz.supabase.co` | تجده في Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام (Public Key) لمشروع Supabase. يستخدمه الـ Frontend. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | تجده في Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | المفتاح السري (Secret Key) لمشروع Supabase. يستخدمه الـ Backend فقط للعمليات الحساسة (تجاوز RLS إذا لزم الأمر). | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **هام جداً:** لا تشارك هذا المفتاح أبداً ولا تضعه في كود الـ Frontend. |

#### شرح تفصيلي:

*   **`VITE_SUPABASE_URL`**: هو العنوان الذي يوجه إليه التطبيق طلبات قاعدة البيانات.
*   **`VITE_SUPABASE_ANON_KEY`**: يسمح للمستخدمين "المجهولين" (غير المسجلين دخولهم) بالتفاعل مع قاعدة البيانات وفقاً لسياسات الأمان (RLS) التي حددتها.
*   **`SUPABASE_SERVICE_ROLE_KEY`**: يمنح صلاحيات كاملة على قاعدة البيانات. في هذا التطبيق، نستخدمه في السيرفر لضمان تنفيذ العمليات (مثل إنشاء الطلبات) بغض النظر عن سياسات المستخدم، رغم أننا يمكننا الاكتفاء بـ Anon Key إذا كانت السياسات مضبوطة بشكل صحيح، لكن وجوده يمنح مرونة أكبر للسيرفر.

### 2. إعدادات المشروع (Project Settings)

عند إنشاء المشروع على Vercel، تأكد من الإعدادات التالية:

*   **Framework Preset**: اختر `Vite`.
*   **Root Directory**: `./` (المجلد الرئيسي).
*   **Build Command**: `npm run build` (أو `vite build`).
*   **Output Directory**: `dist`.
*   **Install Command**: `npm install`.

### 3. ملف `vercel.json`

تم إنشاء ملف `vercel.json` في المشروع لضمان التوجيه الصحيح:

*   أي طلب يبدأ بـ `/api/` يتم توجيهه إلى `api/index.ts` (الذي يشغل سيرفر Express).
*   أي طلب آخر يتم توجيهه إلى `index.html` (ليتم التعامل معه بواسطة React Router في الـ Frontend).

### 4. ملاحظات هامة للنشر

*   **قاعدة البيانات**: تأكد من أنك قمت بتنفيذ كود SQL الموجود في `COMBINED_SCHEMA.sql` داخل Supabase قبل نشر التطبيق، وإلا لن تعمل قاعدة البيانات.
*   **البيانات**: التطبيق سيبدأ بقاعدة بيانات فارغة (باستثناء البيانات الأولية التي أضفتها عبر SQL).
*   **الأمان**: تأكد من تفعيل Row Level Security (RLS) في Supabase لاحقاً لتقييد الوصول إذا تطور التطبيق ليسمح بتسجيل دخول المستخدمين.

---

## 8. حل المشاكل (Troubleshooting)

### The Fix: Enable Public Read Access

We have updated the application to fetch data directly from Supabase (instead of using the API server) to make it faster and more reliable. You must enable public read access in your database.

1.  Go to your **Supabase Dashboard**.
2.  Open the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the content of the file `COMBINED_SCHEMA.sql` (specifically the policies section).
5.  Paste it into the editor and click **Run**.

This will allow the website to read the list of games and packages.

### Check Environment Variables

Ensure these variables are set in Vercel:

*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`

**Important:** After adding variables, you must **Redeploy** your application.

### Verify Database Content

If the site loads but shows "No games found", your database might be empty.
Run the content of `COMBINED_SCHEMA.sql` in the SQL Editor to add initial data.

### Enable Filtering & Sorting

To use the new "Filter by Genre" and "Sort by Popularity" features, you must update your database schema.
1.  Open the **SQL Editor** in Supabase.
2.  Run the content of `COMBINED_SCHEMA.sql`.
3.  This will add `genre`, `popularity`, and `min_price` columns to your games table.

---

## 9. حل مشكلة المفاتيح المفقودة (Missing Keys Fix)

The application crashed because the Supabase URL and Anon Key were missing from the environment variables.

I have updated the code to use your project ID (`zcyyrvyltnpmdflupftn`) as a fallback for the URL, so the app should load now.

**However, authentication and database access will fail until you provide the Anon Key.**

### How to Fix completely:

1.  Go to your **Supabase Dashboard** > **Settings** > **API**.
2.  Copy the **Project URL** and **anon public key**.
3.  Create a file named `.env` in the root of your project (if it doesn't exist).
4.  Add the following lines to `.env`:

```env
VITE_SUPABASE_URL=https://zcyyrvyltnpmdflupftn.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_anon_key_here` with the actual key you copied.

---
