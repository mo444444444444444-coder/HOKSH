# إعداد قاعدة بيانات حوكش السحابية وإدارة المنصة

## 1) إعداد Supabase
1. افتح مشروع Supabase: https://supabase.com/dashboard/project/nifscfbdwolwttleiopr
2. افتح SQL Editor، والصق محتوى `supabase-schema.sql` ثم اضغط Run.
3. من Project Settings → API انسخ **Project URL** و **anon/public key** فقط.
4. ضع المفتاح العام في `supabase-config.js` مكان النص الفارغ. لا تضع `service_role` أو أي secret key في ملفات الموقع.

## 2) إنشاء حسابك كمدير المنصة الرئيسي
1. سجّل حسابك في حوكش بالبريد الإلكتروني الذي تريد تخصيصه للإدارة.
2. من Supabase → SQL Editor شغّل الاستعلام التالي بعد استبدال البريد ببريدك الحقيقي:

```sql
insert into public.hoksh_platform_admins(user_id)
select id from auth.users
where lower(email) = lower('YOUR-ADMIN-EMAIL@example.com')
on conflict (user_id) do nothing;
```

3. سجّل الخروج ثم ادخل مرة أخرى. سيظهر لك قسم **إدارة حوكش**.

**مهم:** لا تضف بريد أي مستخدم آخر إلى جدول `hoksh_platform_admins`. التسجيل العادي لا يمنح صلاحية إدارة المنصة، ولا يستطيع المستخدم إضافة نفسه مديرًا.

## 3) إعداد تسجيل Google (اختياري)
1. من Authentication → Providers فعّل Google وأدخل OAuth Client ID وClient Secret اللذين تنشئهما من Google Cloud.
2. من Authentication → URL Configuration أضف رابط الموقع المنشور إلى قائمة Redirect URLs:
   `https://mo444444444444444-coder.github.io/HOKSH/`
3. احفظ الإعدادات. يمكن للمستخدمين أيضًا إنشاء حساب بالبريد وكلمة المرور.

## 4) لوحة إدارة حوكش
بعد منح حسابك صلاحية مدير المنصة، سيظهر قسم خاص يعرض كل الحسابات المسجلة، الاسم والبريد وتاريخ التسجيل وحالة الحساب، مع إمكانية إيقاف حساب أو إعادة تفعيله. الإيقاف يمنع الوصول إلى بيانات النشاط على مستوى قاعدة البيانات، وليس مجرد إخفاء الواجهة.

## 5) عزل البيانات
لكل حساب سجل مستقل في `hoksh_business_data`. سياسات RLS تمنع أي مستخدم من قراءة أو تعديل بيانات حساب آخر. جدول `hoksh_platform_admins` لا يمكن تعديله من واجهة الموقع؛ تعيين مدير المنصة يتم من SQL Editor بصلاحية مالك مشروع Supabase.

## 6) نقل بيانات النسخة المحلية
عند تسجيل أول دخول بحساب سحابي جديد، إذا وُجدت بيانات قديمة على هذا المتصفح، سيظهر سؤال لتأكيد نقلها إلى الحساب الحالي. إذا رفضت، يبدأ الحساب ببيانات فارغة وتبقى النسخة المحلية دون حذف.
