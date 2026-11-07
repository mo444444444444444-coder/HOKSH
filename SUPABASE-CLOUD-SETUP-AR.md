# إعداد قاعدة بيانات حوكش السحابية

## 1) إعداد Supabase
1. افتح مشروع Supabase: https://supabase.com/dashboard/project/nifscfbdwolwttleiopr
2. افتح SQL Editor، والصق محتوى `supabase-schema.sql` ثم اضغط Run.
3. من Project Settings → API انسخ **Project URL** و **anon/public key** فقط.
4. ضع المفتاح العام في `supabase-config.js` مكان النص الفارغ. لا تضع `service_role` أو أي secret key في ملفات الموقع.

## 2) إعداد تسجيل Google (اختياري)
1. من Authentication → Providers فعّل Google وأدخل OAuth Client ID وClient Secret اللذين تنشئهما من Google Cloud.
2. من Authentication → URL Configuration أضف رابط الموقع المنشور إلى قائمة Redirect URLs:
   `https://mo444444444444444-coder.github.io/HOKSH/`
3. احفظ الإعدادات. يمكن للمستخدمين أيضًا إنشاء حساب بالبريد وكلمة المرور.

## 3) نشر الإعداد
بعد وضع anon/public key في `supabase-config.js`، ارفع الملف إلى فرع main. لا ترسل مفاتيح سرية في المحادثات أو إلى GitHub.

## عزل الحسابات
جدول `hoksh_business_data` يحتوي سجلًا واحدًا لكل مستخدم. سياسات RLS تقيد القراءة والكتابة والحذف بحيث يطابق `user_id` قيمة `auth.uid()`. لا تعتمد على إخفاء الواجهة؛ العزل مفروض من قاعدة البيانات.

## نقل بيانات النسخة المحلية
عند تسجيل أول دخول بحساب سحابي جديد، إذا وُجدت بيانات قديمة على هذا المتصفح، سيظهر سؤال لتأكيد نقلها إلى الحساب الحالي. إذا رفضت، يبدأ الحساب ببيانات فارغة وتبقى النسخة المحلية دون حذف.
