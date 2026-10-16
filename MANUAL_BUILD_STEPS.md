# خطوات البناء اليدوي - MediaHive ERP v10.0.0

## 📋 الخطوات التفصيلية

### المرحلة 1: بناء النسخة النظيفة (Clean Version)

#### الخطوة 1: افتح Command Prompt
اضغط `Win + R` واكتب `cmd` ثم اضغط Enter

#### الخطوة 2: انتقل إلى مجلد المشروع
```cmd
cd d:\mediahive001
```

#### الخطوة 3: نسخ احتياطي لـ package.json الأصلي
```cmd
copy package.json package-original.json.bak
```

#### الخطوة 4: استخدام package.json للنسخة النظيفة
```cmd
copy package-clean.json package.json
```

#### الخطوة 5: نسخ تكوين السيرفر للنسخة النظيفة
```cmd
copy server\server-clean.js server\server.js
```

#### الخطوة 6: بناء الواجهة الأمامية
```cmd
npm run build
```
⏱️ **سيستغرق هذا 3-5 دقائق**

#### الخطوة 7: تعبئة التطبيق (Packaging)
```cmd
npm run package
```
⏱️ **سيستغرق هذا 5-10 دقائق**

#### الخطوة 8: استعادة package.json الأصلي
```cmd
copy package-original.json.bak package.json
```

#### الخطوة 9: استعادة server.js الأصلي
```cmd
copy server\server.js.bak server\server.js
```
*(إذا لم يكن موجوداً، لا تقلق - سنستعيده في المرحلة التالية)*

✅ **النسخة النظيفة جاهزة في:** `dist-electron-v10-clean`

---

### المرحلة 2: بناء النسخة مع البيانات (Data Version)

#### الخطوة 1: استخدام package.json للنسخة مع البيانات
```cmd
copy package-data.json package.json
```

#### الخطوة 2: نسخ تكوين السيرفر للنسخة مع البيانات
```cmd
copy server\server-data.js server\server.js
```

#### الخطوة 3: بناء الواجهة الأمامية
```cmd
npm run build
```
⏱️ **سيستغرق هذا 3-5 دقائق**

#### الخطوة 4: تعبئة التطبيق (Packaging)
```cmd
npm run package
```
⏱️ **سيستغرق هذا 5-10 دقائق**

#### الخطوة 5: استعادة package.json الأصلي
```cmd
copy package-original.json.bak package.json
```

#### الخطوة 6: استعادة server.js الأصلي
```cmd
copy server\server.js.bak server\server.js
```
*(إذا لم يكن موجوداً، استخدم النسخة الأصلية)*

✅ **النسخة مع البيانات جاهزة في:** `dist-electron-v10-data`

---

## 🎯 الطريقة السريعة (استخدام السكريبتات الجاهزة)

### لبناء النسخة النظيفة فقط:
```cmd
cd d:\mediahive001
build-clean.bat
```
اضغط أي زر عندما يُطلب منك ذلك

### لبناء النسخة مع البيانات فقط:
```cmd
cd d:\mediahive001
build-data.bat
```
اضغط أي زر عندما يُطلب منك ذلك

### لبناء النسختين معاً:
```cmd
cd d:\mediahive001
build-all-versions.bat
```
اضغط أي زر عندما يُطلب منك ذلك

---

## ✅ التحقق من النجاح

بعد اكتمال البناء، تحقق من:

### النسخة النظيفة:
1. افتح مجلد `d:\mediahive001\dist-electron-v10-clean`
2. يجب أن تجد مجلد `win-unpacked` وملف التثبيت
3. حجم المجلد يجب أن يكون ~150-200 MB

### النسخة مع البيانات:
1. افتح مجلد `d:\mediahive001\dist-electron-v10-data`
2. يجب أن تجد مجلد `win-unpacked` وملف التثبيت
3. حجم المجلد يجب أن يكون ~150-250 MB

---

## 🧪 اختبار النسخ

### اختبار النسخة النظيفة:
1. افتح `dist-electron-v10-clean\win-unpacked`
2. شغّل `MediaHive ERP - Clean Install.exe`
3. يجب أن يفتح التطبيق بدون أي بيانات
4. تحقق من رقم الإصدار في الواجهة

### اختبار النسخة مع البيانات:
1. افتح `dist-electron-v10-data\win-unpacked`
2. شغّل `MediaHive ERP - With Data.exe`
3. يجب أن يفتح التطبيق مع جميع البيانات الحالية
4. تحقق من وجود العملاء، الموردين، الفواتير، إلخ

---

## ⚠️ في حالة حدوث أخطاء

### خطأ: "npm: command not found"
**الحل:** تأكد من تثبيت Node.js وإضافته إلى PATH

### خطأ: "Cannot find module"
**الحل:** قم بتثبيت الحزم:
```cmd
npm install
```

### خطأ: "Build failed"
**الحل:** 
1. احذف مجلد `node_modules`
2. احذف ملف `package-lock.json`
3. شغّل `npm install` من جديد
4. حاول البناء مرة أخرى

### خطأ: "EPERM: operation not permitted"
**الحل:** 
1. أغلق أي نسخة قيد التشغيل من التطبيق
2. شغّل Command Prompt كـ Administrator
3. حاول مرة أخرى

---

## 📊 الوقت المتوقع

- **بناء نسخة واحدة:** 8-15 دقيقة
- **بناء النسختين معاً:** 15-25 دقيقة

---

## 📞 بعد الانتهاء

بعد اكتمال البناء بنجاح:

1. ✅ ستجد النسخة النظيفة في `dist-electron-v10-clean`
2. ✅ ستجد النسخة مع البيانات في `dist-electron-v10-data`
3. ✅ يمكنك توزيع ملفات التثبيت أو نسخ مجلدات `win-unpacked`
4. ✅ راجع `RELEASE_NOTES_v10.md` للتفاصيل الكاملة

---

**تاريخ الإنشاء:** 24 يناير 2026  
**الإصدار:** 10.0.0  
**المطور:** Mahmoud Fathi
