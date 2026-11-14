# تهيئة بوابة الأسئلة في نور الإسلام

## 1) مفتاح الاتصال العام
- افتح مشروع Supabase الخاص بنور الإسلام.
- من Project Settings ثم API انسخ anon / publishable key فقط.
- ضعه في supabase-config.js مكان القيمة الفارغة في anonKey.
- لا تضع service_role أو أي مفتاح سري في ملفات GitHub أو المتصفح.

## 2) إنشاء الجداول والحماية
- افتح SQL Editor في Supabase.
- شغّل كامل ملف supabase-noor-community.sql.
- الملف ينشئ ملفات الزوار والأسئلة والردود وسياسات RLS. لا يمنح أي مستخدم صلاحية شيخ أو مدير تلقائيًا.

## 3) حسابا الإدارة والشيخ
- أنشئ حسابين من صفحة «اسأل الشيخ» بالبريد وكلمة المرور التي يختارها كل صاحب حساب.
- بعد تأكيد البريد، نفّذ في SQL Editor هذا الأمر مع استبدال البريدين:
```sql
update public.noor_profiles set role = 'admin' where id = (select id from auth.users where email = 'ADMIN_EMAIL');
update public.noor_profiles set role = 'sheikh' where id = (select id from auth.users where email = 'SHEIKH_EMAIL');
```
- لا تشارك كلمات المرور مع أحد. تعيين الدور يتم من مالك مشروع Supabase فقط.
- إذا أردت Google للزوار، فعّل Google Provider في Authentication > Sign In / Providers وأضف بيانات OAuth وعنوان الموقع ضمن Redirect URLs.

## 4) ما الذي تفعله البوابة؟
- الزائر يستطيع إرسال سؤال دون حساب، مع إخفاء الاسم.
- يستطيع إنشاء حساب بالبريد وكلمة مرور أو المتابعة بحساب Google.
- الزائر المسجل يرى أسئلته والردود الخاصة بها.
- الشيخ والمدير المعتمدان فقط يريان صندوق الأسئلة الواردة ويستطيعان الرد.
- لا يظهر السؤال للعامة إلا إذا اختار الشيخ نشر الإجابة.