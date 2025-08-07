(function() {
    'use strict';
    console.clear();
    console.log('🚀 أداة الاستخراج v2.3 (نسخة محسنة) بدأت...');

    // محاولة الحصول على نافذة موجودة أو فتح نافذة فارغة بشكل آمن
    let viewerWindow = window.open('', 'scheduleViewer'); 

    setTimeout(function() {
        const rowNodeList = document.querySelectorAll('tr[class^="ROW"]');
        
        if (rowNodeList.length === 0) {
            alert("لم يتم العثور على أي مقررات. تأكد من أن الجدول محمل بالكامل قبل تشغيل الأداة.");
            if (viewerWindow) viewerWindow.close(); // إغلاق النافذة الفارغة إذا لم يتم العثور على بيانات
            return;
        }

        console.log(`🔍 تم العثور على ${rowNodeList.length} صفًا. جارِ استخراج البيانات...`);
        const coursesData = [];
        
        // استخدام اسم متغير واضح (rowElement) لتجنب التعارض
        rowNodeList.forEach(rowElement => {
            const code = rowElement.querySelector('td[data-th="رمز المقرر"]')?.textContent.trim();
            const name = rowElement.querySelector('td[data-th="اسم المقرر"]')?.textContent.trim();
            const section = rowElement.querySelector('td[data-th^="الشعبة"]')?.textContent.trim();
            const instructor = rowElement.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
            const detailsRaw = rowElement.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();
            
            // استخراج الحالة (مفتوحة/مغلقة)
            const status = rowElement.querySelector('td[data-th*="الحالة"]')?.textContent.trim() || '';

            // استخراج الاختبار النهائي بأمان
            const finalExam = rowElement.querySelector('td[data-th="الاختبار النهائي"]')?.textContent.trim() || 'غير محدد';

            if (name && code && section) {
                let time = 'غير محدد';
                if (detailsRaw && detailsRaw.includes('@t')) {
                    const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                        const subParts = part.split('@t');
                        if (subParts.length > 1) {
                            let dayPart = subParts[0].trim();
                            let timePart = subParts[1].replace(/@r.*/, '').trim();
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
                    status, // إضافة الحالة
                    instructor: instructor || 'غير محدد',
                    finalExam 
                });
            }
        });
        
        if (coursesData.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${coursesData.length} مقررًا.`);
            
            if (viewerWindow) {
                viewerWindow.location.href = 'https://mutlaq001.github.io/schedule/';

                viewerWindow.onload = function() {
                    setTimeout(() => {
                        viewerWindow.postMessage({
                            type: 'universityCoursesData_v3', // تم تحديث الإصدار
                            data: coursesData
                        }, 'https://mutlaq001.github.io');
                        console.log("📨 تم إرسال البيانات إلى صفحة العرض بنجاح.");
                    }, 500);
                };
            } else {
                 alert("فشل فتح نافذة العرض. يرجى التأكد من أن المتصفح لا يمنع النوافذ المنبثقة.");
            }
            
        } else {
            alert("تم العثور على الصفوف، لكن لم يتم استخراج البيانات بنجاح. حاول تحديث الصفحة وإعادة المحاولة.");
            if (viewerWindow) viewerWindow.close();
        }

    }, 1500);
})();
