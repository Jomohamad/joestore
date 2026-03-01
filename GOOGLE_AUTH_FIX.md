# حل مشكلة خطأ 400: redirect_uri_mismatch

هذا الخطأ يعني أن الرابط الذي يستخدمه Supabase للعودة من Google غير مضاف في قائمة الروابط المسموح بها في Google Cloud Console.

لحل المشكلة، اتبع الخطوات التالية بدقة:

## 1. احصل على رابط الـ Callback من Supabase
1.  اذهب إلى لوحة تحكم **Supabase**.
2.  انتقل إلى **Authentication** > **Providers**.
3.  اضغط على **Google** (تأكد أنه مفعل Enabled).
4.  ابحث عن **Callback URL (for OAuth)**.
5.  انسخ هذا الرابط كاملاً. (سيكون مثل: `https://xxxxxxxxxxxx.supabase.co/auth/v1/callback`)

## 2. أضف الرابط في Google Cloud Console
1.  اذهب إلى [Google Cloud Console](https://console.cloud.google.com/).
2.  تأكد أنك اخترت المشروع الصحيح من القائمة العلوية.
3.  من القائمة الجانبية، اذهب إلى **APIs & Services** > **Credentials**.
4.  في قسم **OAuth 2.0 Client IDs**، اضغط على اسم العميل الذي أنشأته (عادة Web client 1).
5.  انزل إلى قسم **Authorized redirect URIs**.
6.  اضغط على **ADD URI**.
7.  الصق الرابط الذي نسخته من Supabase في الخطوة السابقة.
8.  اضغط **SAVE**.

## 3. جرب مرة أخرى
انتظر بضع دقائق (أحياناً يأخذ Google وقتاً لتحديث الإعدادات)، ثم حاول تسجيل الدخول مرة أخرى في تطبيقك.
