# دليل إعداد تخزين الصور في Supabase (Storage)

لجعل التطبيق يستخدم الصور من Supabase Storage، اتبع الخطوات التالية:

## 1. إنشاء Bucket للصور
1.  اذهب إلى لوحة تحكم **Supabase**.
2.  انتقل إلى **Storage** من القائمة الجانبية.
3.  اضغط على **New Bucket**.
4.  سمّه `images`.
5.  تأكد من تفعيل خيار **Public bucket** (هذا مهم جداً لتظهر الصور للجميع).
6.  اضغط **Save**.

## 2. رفع الصور
1.  ادخل إلى الـ Bucket الذي أنشأته (`images`).
2.  ارفع صور التطبيقات الجديدة بالأسماء التالية (تأكد من الامتداد jpg أو png):
    *   `tiktok.jpg`
    *   `steam.jpg`
    *   `xbox.jpg`
3.  يمكنك أيضاً رفع صور الألعاب الحالية (مثل `pubg.jpg`, `freefire.jpg`) وتحديث قاعدة البيانات لتشير إليها.

## 3. تحديث قاعدة البيانات
1.  افتح ملف `UPDATE_DB_AND_DATA.sql`.
2.  استبدل `YOUR_PROJECT_ID` بمعرف مشروعك الحقيقي.
    *   يمكنك إيجاده في رابط لوحة التحكم: `https://supabase.com/dashboard/project/<project_id>`
    *   أو في إعدادات المشروع > General > Reference ID.
3.  شغل الملف في **SQL Editor** في Supabase.

## 4. (اختياري) تحديث الألعاب القديمة
إذا أردت تحديث صور الألعاب القديمة (PUBG, Free Fire, etc.) لتستخدم Storage أيضاً:
1.  ارفع صورها إلى الـ Bucket.
2.  شغل أمر SQL لتحديثها:
    ```sql
    UPDATE games SET image_url = 'https://<YOUR_PROJECT_ID>.supabase.co/storage/v1/object/public/images/pubg.jpg' WHERE id = 'pubg-mobile';
    -- كرر الأمر لباقي الألعاب
    ```
