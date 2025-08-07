(function() {
    'use strict';
    // --- النسخة v2 مع استخراج بيانات الاختبار النهائي ---
    console.clear();
    console.log("🚀 أداة الاستخراج v2 (مع دعم الاختبارات النهائية) بدأت...");

    setTimeout(function() {
        const courseRowSelector = 'tr[class^="ROW"]';
        const courseRows = document.querySelectorAll(courseRowSelector);
        
        if (courseRows.length === 0) {
            alert("لم يتم العثور على أي مقررات. تأكد من أن الجدول محمل بالكامل قبل تشغيل الأداة.");
            return;
        }

        console.log(`🔍 تم العثور على ${courseRows.length} صفًا. جارِ استخراج البيانات...`);
        const coursesData = [];
        
        courseRows.forEach(row => {
            // استخراج البيانات الأساسية (نفس الكود السابق)
            const code = row.querySelector('td[data-th="رمز المقرر"]')?.textContent.trim();
            const name = row.querySelector('td[data-th="اسم المقرر"]')?.textContent.trim();
            const section = row.querySelector('td[data-th^="الشعبة"]')?.textContent.trim();
            const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
            const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();

            // --- ✨ الإضافة الجديدة: استخراج بيانات الاختبار النهائي ---
            const finalExam = row.querySelector('td[data-th="الاختبار النهائي"]')?.textContent.trim();

            if (name && code && section) {
                let time = 'غير محدد';
                // نفس منطق تحليل الوقت السابق
                if (detailsRaw && detailsRaw.includes('@t')) {
                    const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                        const subParts = part.split('@t');
                        if (subParts.length > 1) {
                            let dayPart = subParts[0].trim();
                            let timePart = subParts[1].replace(/@r.*$/, '').trim();
                            const dayMapping = {'1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس'};
                            const translatedDays = dayPart.split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                            return `${translatedDays}: ${timePart}`;
                        }
                        return null;
                    }).filter(Boolean);
                    if (timeParts.length > 0) time = timeParts.join('<br>');
                } else if (detailsRaw && detailsRaw.trim() !== '') {
                    time = detailsRaw;
                }
                
                // إضافة البيانات الجديدة إلى الكائن
                coursesData.push({ 
                    code, 
                    name, 
                    section, 
                    time, 
                    instructor: instructor || 'غير محدد',
                    finalExam: finalExam || 'غير محدد' // إضافة الاختبار النهائي هنا
                });
            }
        });
        
        if (coursesData.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${coursesData.length} مقررًا (بما في ذلك مواعيد الاختبارات).`);
            
            // استخدم نفس رابط العرض الذي يدعم الميزة الجديدة
            const viewerWindow = window.open('https://mutlaq001.github.io/schedule/', '_blank');
            
            // الانتظار للتأكد من أن الصفحة الجديدة جاهزة
            setTimeout(() => {
                // إرسال البيانات بالنوع الجديد v2
                viewerWindow.postMessage({
                    type: 'universityCoursesData_v2', // مهم جداً: النوع المحدث
                    data: coursesData
                }, 'https://mutlaq001.github.io');
                console.log("📨 تم إرسال البيانات (مع معلومات الاختبار) إلى صفحة العرض بنجاح.");
            }, 2000);
            
        } else {
            alert("تم العثور على الصفوف، لكن لم يتم استخراج البيانات بنجاح. حاول تحديث الصفحة وإعادة المحاولة.");
        }

    }, 2000);
})();
