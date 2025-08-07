(function() {
    'use strict';
    // --- النسخة v2.1 (أكثر استقرارًا وأمانًا) ---
    console.clear();
    console.log("🚀 أداة الاستخراج v2.1 (نسخة مستقرة) بدأت...");

    let viewerWindow = window.open('', 'scheduleViewer'); // محاولة الحصول على نافذة موجودة أو فتح نافذة فارغة

    setTimeout(function() {
        const courseRowSelector = 'tr[class^="ROW"]';
        const courseRows = document.querySelectorAll(courseRowSelector);
        
        if (courseRows.length === 0) {
            alert("لم يتم العثور على أي مقررات. تأكد من أن الجدول محمل بالكامل قبل تشغيل الأداة.");
            if (viewerWindow) viewerWindow.close(); // إغلاق النافذة الفارغة إذا لم يتم العثور على بيانات
            return;
        }

        console.log(`🔍 تم العثور على ${courseRows.length} صفًا. جارِ استخراج البيانات...`);
        const coursesData = [];
        
        courseRows.forEach(row => {
            const code = row.querySelector('td[data-th="رمز المقرر"]')?.textContent.trim();
            const name = row.querySelector('td[data-th="اسم المقرر"]')?.textContent.trim();
            const section = row.querySelector('td[data-th^="الشعبة"]')?.textContent.trim();
            const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
            const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();
            
            // التعامل مع الاختبار النهائي بأمان (قد لا يكون موجودًا)
            const finalExam = row.querySelector('td[data-th="الاختبار النهائي"]')?.textContent.trim();

            if (name && code && section) {
                let time = 'غير محدد';
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
                
                coursesData.push({ 
                    code, 
                    name, 
                    section, 
                    time, 
                    instructor: instructor || 'غير محدد',
                    finalExam: finalExam || 'غير محدد'
                });
            }
        });
        
        if (coursesData.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${coursesData.length} مقررًا.`);
            
            // الآن فقط نقوم بتوجيه النافذة إلى الرابط الصحيح
            if (viewerWindow) {
                viewerWindow.location.href = 'https://mutlaq001.github.io/schedule/';

                // الانتظار حتى يتم تحميل الصفحة الجديدة بالكامل قبل إرسال البيانات
                viewerWindow.onload = function() {
                    setTimeout(() => {
                        viewerWindow.postMessage({
                            type: 'universityCoursesData_v2',
                            data: coursesData
                        }, 'https://mutlaq001.github.io');
                        console.log("📨 تم إرسال البيانات إلى صفحة العرض بنجاح.");
                    }, 500); // وقت انتظار قصير بعد تحميل الصفحة
                };
            } else {
                 alert("فشل فتح نافذة العرض. يرجى التأكد من أن المتصفح لا يمنع النوافذ المنبثقة.");
            }
            
        } else {
            alert("تم العثور على الصفوف، لكن لم يتم استخراج البيانات بنجاح. حاول تحديث الصفحة وإعادة المحاولة.");
            if (viewerWindow) viewerWindow.close();
        }

    }, 1500); // تقليل وقت الانتظار الأولي قليلاً
})();
