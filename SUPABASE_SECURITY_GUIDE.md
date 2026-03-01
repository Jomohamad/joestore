# تفعيل حماية كلمات المرور المسربة (Leaked Password Protection)

هذه الرسالة تظهر لأنك لم تفعل خاصية التحقق من كلمات المرور المسربة في Supabase. لتفعيلها وحل المشكلة، اتبع الخطوات التالية:

1.  اذهب إلى لوحة تحكم **Supabase** (Dashboard).
2.  اختر مشروعك.
3.  من القائمة الجانبية، اختر **Authentication**.
4.  اضغط على **Providers**.
5.  اختر **Email**.
6.  انزل إلى قسم **Password Policy** (سياسة كلمة المرور).
7.  قم بتفعيل الخيار **"Prevent passwords found in data breaches"** (أو "Enable Leaked Password Protection").
8.  اضغط **Save**.

هذا سيجعل Supabase يتحقق من أن كلمة المرور التي يختارها المستخدم ليست موجودة في قواعد بيانات الاختراقات المعروفة (HaveIBeenPwned)، مما يزيد من أمان تطبيقك.
