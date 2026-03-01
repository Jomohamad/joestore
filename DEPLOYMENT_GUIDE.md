# دليل نشر التطبيق (Deployment Guide)

بما أنك تريد أن يعمل الموقع بشكل دائم ومتاح للجميع حتى بعد إغلاق AI Studio، يجب عليك "نشر" (Deploy) التطبيق على خدمة استضافة.

أفضل وأسهل خيار لتطبيقات React هو **Vercel** أو **Netlify**. إليك الخطوات بالتفصيل:

## الخطوة 1: رفع الكود إلى GitHub
1.  قم بإنشاء مستودع جديد (Repository) على [GitHub](https://github.com/).
2.  ارفع ملفات المشروع الحالية إلى هذا المستودع.

## الخطوة 2: النشر على Vercel (موصى به)
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

## الخطوة 3: تحديث إعدادات Supabase (مهم جداً)
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

## الخطوة 4: مبروك!
الآن موقعك يعمل بشكل دائم على الرابط الجديد، ويمكن لأي شخص في العالم الدخول إليه وتسجيل الدخول وشراء العملات.
