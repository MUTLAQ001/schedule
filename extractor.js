(function() {
    'use strict';

    // --- 🔴 منطقة التعديل (قد نحتاجها لاحقًا) ---
    // هذا هو المحدد لزر "التالي". إذا لم تعمل الأداة، فسنحتاج إلى تغييره.
    const nextButtonSelector = '.ui-paginator-next'; 
    // ---------------------------------------------

    let allCoursesData = [];
    let currentPage = 1;
    let overlay;

    function createProgressOverlay() {
        overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); z-index: 10000; display: flex;
            justify-content: center; align-items: center; color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            direction: rtl;
        `;
        document.body.appendChild(overlay);
        updateProgress(0); // ابدأ برسالة أولية
    }

    function updateProgress(count) {
        if (!overlay) return;
        overlay.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <h2 style="margin-bottom: 15px;">🚀 جاري تجميع المقررات...</h2>
                <p style="font-size: 18px;">الرجاء عدم إغلاق الصفحة أو التفاعل معها.</p>
                <div style="margin-top: 20px; font-size: 22px; background: #667eea; padding: 10px 20px; border-radius: 8px;">
                    الصفحة الحالية: ${currentPage} | المجموع: ${count} مقرر
                </div>
            </div>
        `;
    }

    function finishAndSendData() {
        if (!overlay) return;
        overlay.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <h2 style="color: #4CAF50;">✅ اكتمل التجميع بنجاح!</h2>
                <p style="font-size: 18px;">تم العثور على ${allCoursesData.length} مقرر في المجموع.</p>
                <p>جاري الآن فتح صفحة العرض...</p>
            </div>
        `;
        
        // إرسال البيانات النهائية
        const viewerWindow = window.open('https://mutlaq001.github.io/schedule/', '_blank');
        setTimeout(() => {
            viewerWindow.postMessage({
                type: 'universityCoursesData',
                data: allCoursesData
            }, 'https://mutlaq001.github.io');
            console.log("📨 تم إرسال كل البيانات إلى صفحة العرض بنجاح.");
            setTimeout(() => document.body.removeChild(overlay), 2000); // إزالة النافذة بعد ثانيتين
        }, 1500);
    }

    function scrapeCurrentPage() {
        const courseRowSelector = 'tr[class^="ROW"]';
        const courseRows = document.querySelectorAll(courseRowSelector);
        const pageCourses = [];

        courseRows.forEach(row => {
            // هذه المرة سنقوم بتضمين الصفوف المخفية كما طلبت
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
                pageCourses.push({ code, name, section, time, instructor: instructor || 'غير محدد' });
            }
        });
        return pageCourses;
    }

    function processPages() {
        const newCourses = scrapeCurrentPage();
        allCoursesData.push(...newCourses);
        console.log(`الصفحة ${currentPage}: تم استخراج ${newCourses.length} مقرر. المجموع حتى الآن: ${allCoursesData.length}`);
        updateProgress(allCoursesData.length);

        const nextButton = document.querySelector(nextButtonSelector);

        // التحقق إذا كان زر التالي موجودًا وغير قابل للضغط (وصلنا للنهاية)
        if (!nextButton || nextButton.classList.contains('ui-state-disabled')) {
            console.log("وصلنا إلى آخر صفحة. إنهاء العملية.");
            finishAndSendData();
            return;
        }

        // الانتقال للصفحة التالية
        currentPage++;
        nextButton.click();
        
        // انتظر 4 ثوانٍ لتحميل الصفحة التالية ثم كرر العملية
        setTimeout(processPages, 4000); 
    }

    // --- بداية التشغيل ---
    createProgressOverlay();
    setTimeout(processPages, 1000); // ابدأ بعد ثانية واحدة

})();
