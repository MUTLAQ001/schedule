// extractor.js - QU Schedule v23 (Flexible Selectors & Secure)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v23 Initialized...");

    const SELECTORS = {
        desktop: {
            courseRow: 'tr[class^="ROW"]',
            code: 'td[data-th*="رمز المقرر"]',
            name: 'td[data-th*="اسم المقرر"]',
            section: 'td[data-th*="الشعبة"]',
            hours: 'td[data-th*="الساعات"]',
            type: 'td[data-th*="النشاط"]',
            status: 'td[data-th*="الحالة"]',
            campus: 'td[data-th*="المقر"]',
            instructor: 'input[type="hidden"][id$=":instructor"]',
            details: 'input[type="hidden"][id$=":section"]',
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
        },
        mobile: {
            courseCard: 'div.row-xs',
            code: 'div[data-th*="رمز المقرر"] span.value',
            name: 'div[data-th*="اسم المقرر"] span.value',
            section: 'div[data-th*="الشعبة"] span.value',
            hours: 'div[data-th*="الساعات"] span.value',
            type: 'div[data-th*="النشاط"] span.value',
            status: 'div[data-th*="الحالة"] span.value',
            campus: 'div[data-th*="المقر"] span.value',
            instructor: 'input[type="hidden"][id$=":instructor"]',
            details: 'input[type="hidden"][id$=":section"]',
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
        }
    };
    const VIEWER_URL = "https://mutlaq001.github.io/schedule/"; // تأكد من أن هذا هو رابط العارض الصحيح
    const TEMP_STORAGE_KEY = 'temp_qu_schedule_data';

    function parseTimeDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') return { timeText: 'غير محدد', location: 'غير محدد' };
        
        let location = 'غير محدد';
        if (detailsRaw.includes('@r')) {
            const locationPart = detailsRaw.match(/@r(.*?)(?:@n|@t|$)/);
            if (locationPart && locationPart[1] && locationPart[1].trim() !== '') {
                location = locationPart[1].trim();
            }
        }

        if (detailsRaw.includes('@t')) {
            const dayMapping = {'1':'الأحد','2':'الاثنين','3':'الثلاثاء','4':'الأربعاء','5':'الخميس','6':'الجمعة','7':'السبت'};
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const subParts = part.split('@t');
                if (subParts.length < 2) return null;
                const translatedDays = subParts[0].trim().split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                return `${translatedDays}: ${subParts[1].replace(/@r.*$/, '').trim()}`;
            }).filter(Boolean);
            const timeText = timeParts.length > 0 ? timeParts.join('<br>') : 'غير محدد';
            return { timeText, location };
        }
        return { timeText: 'غير محدد', location };
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
            const status = row.querySelector(s.status)?.textContent.trim();
            const campus = row.querySelector(s.campus)?.textContent.trim();

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
                    location: timeDetails.location,
                    instructor: instructor || 'غير محدد', 
                    examPeriod: examPeriod || null,
                    hours: hours || '0',
                    type: type || 'نظري',
                    status: status || 'غير معروف',
                    campus: campus || 'غير معروف'
                };
                coursesData.push(courseInfo);
                if (!isPractical) {
                    lastTheoreticalCourse = courseInfo;
                }
            }
        });
        return coursesData;
    }

    setTimeout(() => {
        let courses = [];
        const desktopRows = document.querySelectorAll(SELECTORS.desktop.courseRow);
        const mobileRows = document.querySelectorAll(SELECTORS.mobile.courseCard);

        if (desktopRows.length > 0 && desktopRows[0].offsetParent !== null) {
            courses = extractCourses(SELECTORS.desktop, desktopRows);
        } else if (mobileRows.length > 0 && mobileRows[0].offsetParent !== null) {
            courses = extractCourses(SELECTORS.mobile, mobileRows);
        }

        if (courses.length > 0) {
            console.log(`🎉 Success! Extracted ${courses.length} sections.`);
            localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(courses));
            const viewerWindow = window.open(VIEWER_URL, 'QU_Schedule_Viewer');
            
            if (!viewerWindow || viewerWindow.closed || typeof viewerWindow.closed == 'undefined') {
                alert("فشل فتح نافذة العارض. الرجاء السماح بالنوافذ المنبثقة (Pop-ups) لهذا الموقع والمحاولة مرة أخرى.");
                localStorage.removeItem(TEMP_STORAGE_KEY);
                return;
            }

            const messageHandler = (event) => {
                if (event.origin !== new URL(VIEWER_URL).origin) return;
                
                if (event.source === viewerWindow && event.data === 'request_schedule_data') {
                    const storedData = localStorage.getItem(TEMP_STORAGE_KEY);
                    if (storedData) {
                        viewerWindow.postMessage({
                            type: 'universityCoursesData',
                            data: JSON.parse(storedData)
                        }, new URL(VIEWER_URL).origin);
                        localStorage.removeItem(TEMP_STORAGE_KEY);
                        window.removeEventListener('message', messageHandler);
                    }
                }
            };
            window.addEventListener('message', messageHandler);
        } else {
            alert("فشل استخراج البيانات. لم يتم العثور على مقررات. تأكد من أن صفحة المقررات المطروحة ظاهرة ومحملة بالكامل، وحاول تحديث الصفحة.");
        }
    }, 1000);
})();
