// extractor.js - QU Schedule v22 (Extended Data)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v22 Initialized...");

    const SELECTORS = {
        desktop: {
            courseRow: 'tr[class^="ROW"]',
            code: 'td[data-th="رمز المقرر"]',
            name: 'td[data-th="اسم المقرر"]',
            section: 'td[data-th^="الشعبة"]',
            hours: 'td[data-th^="الساعات"]',
            type: 'td[data-th^="النشاط"]',
            status: 'td[data-th="الحالة"]', // **إضافة جديدة**
            campus: 'td[data-th="المقر"]',  // **إضافة جديدة**
            instructor: 'input[type="hidden"][id$=":instructor"]',
            details: 'input[type="hidden"][id$=":section"]',
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
        },
        mobile: {
            courseCard: 'div.row-xs',
            code: 'div[data-th="رمز المقرر"] span.value',
            name: 'div[data-th="اسم المقرر"] span.value',
            section: 'div[data-th^="الشعبة"] span.value',
            hours: 'div[data-th^="الساعات"] span.value',
            type: 'div[data-th^="النشاط"] span.value',
            status: 'div[data-th="الحالة"] span.value', // **إضافة جديدة**
            campus: 'div[data-th="المقر"] span.value',  // **إضافة جديدة**
            instructor: 'input[type="hidden"][id$=":instructor"]',
            details: 'input[type="hidden"][id$=":section"]',
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
        }
    };
    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";
    const TEMP_STORAGE_KEY = 'temp_qu_schedule_data';

    function parseTimeDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') return { timeText: 'غير محدد', location: 'غير محدد' };
        let location = 'غير محدد';
        if (detailsRaw.includes('@r')) {
            const locationPart = detailsRaw.match(/@r(.*?)@/);
            if (locationPart && locationPart[1]) {
                location = locationPart[1].trim();
            }
        }

        if (detailsRaw.includes('@t')) {
            const dayMapping = {'1':'الأحد','2':'الاثنين','3':'الثلاثاء','4':'الأربعاء','5':'الخميس','6':'الجمعة','7':'السبت'};
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const subParts = part.split('@t');
                if (subParts.length < 2) return null;
                const translatedDays = subParts[0].trim().split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                // إزالة القاعة من سلسلة الوقت الرئيسية
                return `${translatedDays}: ${subParts[1].replace(/@r.*$/, '').trim()}`;
            }).filter(Boolean);
            const timeText = timeParts.length > 0 ? timeParts.join('<br>') : 'غير محدد';
            return { timeText, location };
        }
        return { timeText: detailsRaw.trim(), location };
    }

    function extractCourses(s, rows) {
        const coursesData = [];
        let lastTheoreticalCourse = null;
        rows.forEach(row => {
            const code = row.querySelector(s.code)?.textContent.trim();
            const name = row.querySelector(s.name)?.textContent.trim();
            const section = row.querySelector(s.section)?.textContent.trim();
            const instructor = row.querySelector(s.instructor)?.value.trim();
            const detailsRaw = row.querySelector(s.details)?.value.trim();
            let hours = row.querySelector(s.hours)?.textContent.trim();
            let type = row.querySelector(s.type)?.textContent.trim();
            let examPeriod = row.querySelector(s.examPeriod)?.value.trim();
            const status = row.querySelector(s.status)?.textContent.trim(); // **إضافة جديدة**
            const campus = row.querySelector(s.campus)?.textContent.trim(); // **إضافة جديدة**

            if (name && code && section) {
                const isPractical = type && (type.includes('عملي') || type.includes('تدريب') || type.includes('تمارين'));
                if (isPractical && (!hours || hours === '') && lastTheoreticalCourse && lastTheoreticalCourse.code === code) {
                    hours = lastTheoreticalCourse.hours;
                    examPeriod = lastTheoreticalCourse.examPeriod;
                }
                const timeDetails = parseTimeDetails(detailsRaw);
                const courseInfo = { 
                    code, name, section, 
                    time: timeDetails.timeText, 
                    location: timeDetails.location, // **إضافة جديدة**
                    instructor: instructor || 'غير محدد', 
                    examPeriod: examPeriod || null,
                    hours: hours || '0',
                    type: type || 'نظري',
                    status: status || 'غير معروف', // **إضافة جديدة**
                    campus: campus || 'غير معروف'  // **إضافة جديدة**
                };
                coursesData.push(courseInfo);
                if (!isPractical) {
                    lastTheoreticalCourse = courseInfo;
                }
            }
        });
        return coursesData;
    }

    // --- Main Execution (لا تغيير هنا) ---
    setTimeout(() => {
        // ... نفس كود التنفيذ السابق
    }, 1000);
})();
