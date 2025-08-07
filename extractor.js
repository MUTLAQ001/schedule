(function() {
    'use strict';
    console.clear();
    console.log("🚀 أداة الاستخراج v6 (الحل النهائي) بدأت...");

    setTimeout(function() {
        const courseRowSelector = 'tr[class^="ROW"]';
        const courseRows = document.querySelectorAll(courseRowSelector);
        
        if (courseRows.length === 0) {
            alert("لم يتم العثور على أي صفوف للمقررات.");
            return;
        }

        const coursesData = [];
        courseRows.forEach(row => {
            if (row.style.display === 'none') return;
            
            const code = row.querySelector('td[data-th="رمز المقرر"]')?.textContent.trim();
            const name = row.querySelector('td[data-th="اسم المقرر"]')?.textContent.trim();
            const section = row.querySelector('td[data-th^="الشعبة"]')?.textContent.trim();
            const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
            const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();

            if (name && code && section) {
                let time = 'غير محدد';
                if (detailsRaw && detailsRaw.includes('@t')) {
                    const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                        const subParts = part.split('@t');
                        if (subParts.length > 1) {
                            let dayPart = subParts[0].trim();
                            let timePart = subParts[1].replace('@r', '').trim();
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
                coursesData.push({ code, name, section, time, instructor: instructor || 'غير محدد' });
            }
        });
        
        if (coursesData.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${coursesData.length} مقررًا.`);
            
            // --- ✨ الخدعة الذكية ---
            // 1. افتح نافذة جديدة لموقعك
            const viewerWindow = window.open('https://mutlaq001.github.io/schedule/', '_blank');
            
            // 2. انتظر قليلاً حتى تفتح النافذة
            setTimeout(() => {
                // 3. أرسل رسالة تحتوي على البيانات إلى النافذة الجديدة
                viewerWindow.postMessage({
                    type: 'universityCoursesData',
                    data: coursesData
                }, 'https://mutlaq001.github.io');
                console.log("📨 تم إرسال البيانات إلى صفحة العرض بنجاح.");
            }, 1000); // انتظر ثانية واحدة لضمان فتح النافذة
            
        } else {
            alert("تم العثور على الصفوف، لكن لم يتم استخراج البيانات بنجاح.");
        }

    }, 2000);
})();
