# خطة العمل (Project Plan)

1. **تحديث قاعدة البيانات (Database Update):**
   - إزالة تطبيقات (Chamet, SUGO, Bigo Live, MeYo) من ملف `server/db.ts`.
   - إضافة تصنيف (Category) لقاعدة البيانات للتفريق بين "الألعاب" و "التطبيقات".

2. **تطبيق الثيم الجديد (Creovibe Theme):**
   - تحديث الألوان في `tailwind.config.js` لتتطابق مع الثيم (خلفيات داكنة #0a0a0a، لون مميز أصفر نيون #f0ff00).
   - تحديث الخطوط (Manrope و ClashDisplay) في `index.css`.
   - تطبيق الألوان والخطوط الجديدة على جميع مكونات الموقع (Header, Footer, Home, Cards).

3. **تعديلات الـ Header والـ Footer:**
   - إزالة "Track Order" و "Cookie Settings" من الفوتر.
   - إضافة زر تغيير اللغة (EN/AR) في الهيدر.

4. **تقسيم المتجر (Games vs Apps):**
   - تحديث الصفحة الرئيسية وصفحة التصفح لعرض قسمين منفصلين: قسم للألعاب وقسم للتطبيقات.

5. **إنشاء الصفحات الجديدة (New Pages):**
   - إنشاء صفحات: Contact Us, FAQ, Payment Methods, Terms of Service, Privacy Policy, Refund Policy.
   - ربط هذه الصفحات بالروابط الموجودة في الفوتر.
