// extractor.js - QU Schedule v19 (Optimized & Refactored)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v19 Initialized...");

    // --- Configuration ---
    const SELECTORS = {
        desktop: {
            courseRow: 'tr[class^="ROW"]',
            code: 'td[data-th="رمز المقرر"]',
            name: 'td[data-th="اسم المقرر"]',
            section: 'td[data-th^="الشعبة"]',
            hours: 'td[data-th^="الساعات"]',
            type: 'td[data-th^="النشاط"]',
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
            instructor: 'input[type="hidden"][id$=":instructor"]',
            details: 'input[type="hidden"][id$=":section"]',
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
        }
    };
    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";

    // --- Helper Functions ---
    function parseTimeDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') return 'غير محدد';
        if (detailsRaw.includes('@t')) {
            const dayMapping = {'1':'الأحد','2':'الاثنين','3':'الثلاثاء','4':'الأربعاء','5':'الخميس','6':'الجمعة','7':'السبت'};
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const subParts = part.split('@t');
                if (subParts.length < 2) return null;
                const translatedDays = subParts[0].trim().split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                return `${translatedDays}: ${subParts[1].replace(/@r.*$/, '').trim()}`;
            }).filter(Boolean);
            return timeParts.length > 0 ? timeParts.join('<br>') : 'غير محدد';
        }
        return detailsRaw.trim();
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
            if (name && code && section) {
                const isPractical = type && (type.includes('عملي') || type.includes('تدريب') || type.includes('تمارين'));
                if (isPractical && (!hours || hours === '') && lastTheoreticalCourse && lastTheoreticalCourse.code === code) {
                    hours = lastTheoreticalCourse.hours;
                    examPeriod = lastTheoreticalCourse.examPeriod;
                }
                const courseInfo = { 
                    code, name, section, 
                    time: parseTimeDetails(detailsRaw), 
                    instructor: instructor || 'غير محدد', 
                    examPeriod: examPeriod || null,
                    hours: hours || '0',
                    type: type || 'نظري'
                };
                coursesData.push(courseInfo);
                if (!isPractical) {
                    lastTheoreticalCourse = courseInfo;
                }
            }
        });
        return coursesData;
    }

    function openViewerWithData(courses) {
        if (typeof LZString === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js";
            script.onload = () => compressAndOpen(courses);
            document.head.appendChild(script);
        } else {
            compressAndOpen(courses);
        }
    }

    function compressAndOpen(courses) {
        console.log("Compressing data...");
        const jsonString = JSON.stringify(courses);
        const compressedData = LZString.compressToEncodedURIComponent(jsonString);
        const url = `${VIEWER_URL}?data=${compressedData}`;
        console.log(`Opening viewer with compressed data. URL length: ${url.length}`);
        window.open(url, 'QU_Schedule_Viewer');
    }

    // --- Main Execution ---
    setTimeout(() => {
        let courses = [];
        const desktopRows = document.querySelectorAll(SELECTORS.desktop.courseRow);
        const mobileRows = document.querySelectorAll(SELECTORS.mobile.courseCard);
        if (desktopRows.length > 0 && desktopRows[0].offsetParent !== null) {
            console.log("🖥️ Desktop view detected. Extracting...");
            courses = extractCourses(SELECTORS.desktop, desktopRows);
        } else if (mobileRows.length > 0 && mobileRows[0].offsetParent !== null) {
            console.log("📱 Mobile view detected. Extracting...");
            courses = extractCourses(SELECTORS.mobile, mobileRows);
        } else {
            console.log("🕵️ Could not find any visible course data rows/cards.");
        }
        if (courses.length > 0) {
            console.log(`🎉 Success! Extracted ${courses.length} sections.`);
            openViewerWithData(courses);
        } else {
            alert("فشل استخراج البيانات. لم يتم العثور على مقررات. تأكد من أن صفحة المقررات المطروحة ظاهرة ومحملة بالكامل.");
        }
    }, 1000);
})();
