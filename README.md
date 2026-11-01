# مساعدي المهني

موقع Next.js بالعربية (RTL): حسابات مستخدمين، تشخيص مهني، سيرة ذاتية، تحليل عروض، رسائل ترشح، محاكاة مقابلة، لوحة قيادة لتتبع الترشيحات.

## 1) إعداد Supabase (مجاني)
1. أنشئ مشروعاً في https://supabase.com
2. افتح **SQL Editor → New query**، الصق محتوى `supabase/schema.sql` ثم **Run**، ثم كرّر مع `supabase/schema_jobs.sql` (الوظائف والإدارة).
3. من **Project Settings → API** انسخ `Project URL` و `anon public key`.
4. (اختياري للتجربة) في **Authentication → Providers → Email** عطّل "Confirm email" ليدخل المستخدم مباشرة بعد التسجيل.

## 2) المتغيرات
```bash
cp .env.example .env.local
```
| المتغير | من أين |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API |
| `JOOBLE_API_KEY` | اختياري، انظر قسم الوظائف |

## 3) التشغيل محلياً
```bash
npm install
npm run dev
```

## 4) النشر على Vercel
1. ارفع المجلد إلى GitHub.
2. في Vercel: **Add New → Project** واختر المستودع.
3. أضف المتغيرات الثلاثة في **Environment Variables**.
4. **Deploy**.

## ملاحظات
- كل مستخدم يرى بياناته فقط (Row Level Security مفعّل).
- واجهة الدردشة تتطلب تسجيل الدخول، لحماية مفتاح Gemini من الاستعمال العشوائي.
- تعليمات كل وحدة في `lib/prompts.js`، وحقول الملف في `lib/profileFields.js`.

## الوظائف
- **وظائف المنصة**: تنشرها أنت من تبويب «الإدارة». لتصبح مشرفاً: أنشئ حسابك في الموقع، ثم شغّل في SQL Editor الاستعلام المعلّق في آخر `schema_jobs.sql` ببريدك.
- **وظائف الإنترنت**: عبر واجهة Jooble. سجّل للحصول على مفتاح من صفحة API في موقع Jooble الخاص ببلدك (لكل بلد مفتاح مستقل، والمفتاح المجاني يسمح بحوالي 500 طلب في المجموع). النتائج تُخزَّن 12 ساعة لتوفير الحصة.
- **التقديم السريع** و**التنبيهات** تعمل على وظائف المنصة فقط. وظائف الإنترنت تُفتح في موقعها الأصلي.
- لا يوجد زحف (scraping) لمواقع مثل Indeed أو LinkedIn، لأن شروط استعمالها تمنعه.
