// extractor.js - QU Schedule v25 (Integrated Exams & Secure)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v25 (Integrated) Initialized...");

    // 1. بيانات الاختبارات النهائية مدمجة مباشرة في السكربت
    const EXAMS_DATA = {
      "1": { "day": "الأحد", "hijriDate": "1447/06/23", "startTime": "08:00:00", "endTime": "10:00:00" },
      "2": { "day": "الأحد", "hijriDate": "1447/06/23", "startTime": "10:30:00", "endTime": "12:30:00" },
      "3": { "day": "الأحد", "hijriDate": "1447/06/23", "startTime": "13:00:00", "endTime": "15:00:00" },
      "4": { "day": "الاثنين", "hijriDate": "1447/06/24", "startTime": "08:00:00", "endTime": "10:00:00" },
      "5": { "day": "الاثنين", "hijriDate": "1447/06/24", "startTime": "10:30:00", "endTime": "12:30:00" },
      "6": { "day": "الاثنين", "hijriDate": "1447/06/24", "startTime": "13:00:00", "endTime": "15:00:00" },
      "7": { "day": "الثلاثاء", "hijriDate": "1447/06/25", "startTime": "08:00:00", "endTime": "10:00:00" },
      "8": { "day": "الثلاثاء", "hijriDate": "1447/06/25", "startTime": "10:30:00", "endTime": "12:30:00" },
      "9": { "day": "الثلاثاء", "hijriDate": "1447/06/25", "startTime": "13:00:00", "endTime": "15:00:00" },
      "10": { "day": "الأربعاء", "hijriDate": "1447/06/26", "startTime": "08:00:00", "endTime": "10:00:00" },
      "11": { "day": "الأربعاء", "hijriDate": "1447/06/26", "startTime": "10:30:00", "endTime": "12:30:00" },
      "12": { "day": "الأربعاء", "hijriDate": "1447/06/26", "startTime": "13:00:00", "endTime": "15:00:00" },
      "13": { "day": "الخميس", "hijriDate": "1447/06/27", "startTime": "08:00:00", "endTime": "10:00:00" },
      "14": { "day": "الخميس", "hijriDate": "1447/06/27", "startTime": "10:30:00", "endTime": "12:30:00" },
      "15": { "day": "الخميس", "hijriDate": "1447/06/27", "startTime": "13:00:00", "endTime": "15:00:00" },
      "16": { "day": "الأحد", "hijriDate": "1447/07/01", "startTime": "08:00:00", "endTime": "10:00:00" },
      "17": { "day": "الأحد", "hijriDate": "1447/07/01", "startTime": "10:30:00", "endTime": "12:30:00" },
      "18": { "day": "الأحد", "hijriDate": "1447/07/01", "startTime": "13:00:00", "endTime": "15:00:00" },
      "19": { "day": "الاثنين", "hijriDate": "1447/07/02", "startTime": "08:00:00", "endTime": "10:00:00" },
      "20": { "day": "الاثنين", "hijriDate": "1447/07/02", "startTime": "10:30:00", "endTime": "12:30:00" },
      "21": { "day": "الاثنين", "hijriDate": "1447/07/02", "startTime": "13:00:00", "endTime": "15:00:00" },
      "22": { "day": "الثلاثاء", "hijriDate": "1447/07/03", "startTime": "08:00:00", "endTime": "10:00:00" },
      "23": { "day": "الثلاثاء", "hijriDate": "1447/07/03", "startTime": "10:30:00", "endTime": "12:30:00" },
      "24": { "day": "الثلاثاء", "hijriDate": "1447/07/03", "startTime": "13:00:00", "endTime": "15:00:00" },
      "25": { "day": "الأربعاء", "hijriDate": "1447/07/04", "startTime": "08:00:00", "endTime": "10:00:00" },
      "26": { "day": "الأربعاء", "hijriDate": "1447/07/04", "startTime": "10:30:00", "endTime": "12:30:00" },
      "27": { "day": "الأربعاء", "hijriDate": "1447/07/04", "startTime": "13:00:00", "endTime": "15:00:00" },
      "28": { "day": "الخميس", "hijriDate": "1447/07/05", "startTime": "08:00:00", "endTime": "10:00:00" },
      "29": { "day": "الخميس", "hijriDate": "1447/07/05", "startTime": "10:30:00", "endTime": "12:30:00" },
      "30": { "day": "الخميس", "hijriDate": "1447/07/05", "startTime": "13:00:00", "endTime": "15:00:00" },
      "31": { "day": "الأحد", "hijriDate": "1447/07/08", "startTime": "08:00:00", "endTime": "10:00:00" },
      "32": { "day": "الأحد", "hijriDate": "1447/07/08", "startTime": "10:30:00", "endTime": "12:30:00" },
      "33": { "day": "الأحد", "hijriDate": "1447/07/08", "startTime": "13:00:00", "endTime": "15:00:00" },
      "34": { "day": "الاثنين", "hijriDate": "1447/07/09", "startTime": "08:00:00", "endTime": "10:00:00" },
      "35": { "day": "الاثنين", "hijriDate": "1447/07/09", "startTime": "10:30:00", "endTime": "12:30:00" },
      "36": { "day": "الاثنين", "hijriDate": "1447/07/09", "startTime": "13:00:00", "endTime": "15:00:00" },
      "37": { "day": "الثلاثاء", "hijriDate": "1447/07/10", "startTime": "08:00:00", "endTime": "10:00:00" },
      "38": { "day": "الثلاثاء", "hijriDate": "1447/07/10", "startTime": "10:30:00", "endTime": "12:30:00" },
      "39": { "day": "الثلاثاء", "hijriDate": "1447/07/10", "startTime": "13:00:00", "endTime": "15:00:00" },
      "40": { "day": "الأربعاء", "hijriDate": "1447/07/11", "startTime": "08:00:00", "endTime": "10:00:00" },
      "41": { "day": "الأربعاء", "hijriDate": "1447/07/11", "startTime": "10:30:00", "endTime": "12:30:00" },
      "42": { "day": "الأربعاء", "hijriDate": "1447/07/11", "startTime": "13:00:00", "endTime": "15:00:00" },
      "43": { "day": "الخميس", "hijriDate": "1447/07/12", "startTime": "08:00:00", "endTime": "10:00:00" },
      "44": { "day": "الخميس", "hijriDate": "1447/07/12", "startTime": "10:30:00", "endTime": "12:30:00" },
      "45": { "day": "الخميس", "hijriDate": "1447/07/12", "startTime": "13:00:00", "endTime": "15:00:00" },
      "46": { "day": "الأحد", "hijriDate": "1447/07/15", "startTime": "08:00:00", "endTime": "10:00:00" },
      "47": { "day": "الأحد", "hijriDate": "1447/07/15", "startTime": "10:30:00", "endTime": "12:30:00" },
      "48": { "day": "الأحد", "hijriDate": "1447/07/15", "startTime": "13:00:00", "endTime": "15:00:00" },
      "49": { "day": "الاثنين", "hijriDate": "1447/07/16", "startTime": "08:00:00", "endTime": "10:00:00" },
      "50": { "day": "الاثنين", "hijriDate": "1447/07/16", "startTime": "10:30:00", "endTime": "12:30:00" },
      "51": { "day": "الاثنين", "hijriDate": "1447/07/16", "startTime": "13:00:00", "endTime": "15:00:00" },
      "52": { "day": "الثلاثاء", "hijriDate": "1447/07/17", "startTime": "08:00:00", "endTime": "10:00:00" },
      "53": { "day": "الثلاثاء", "hijriDate": "1447/07/17", "startTime": "10:30:00", "endTime": "12:30:00" },
      "54": { "day": "الثلاثاء", "hijriDate": "1447/07/17", "startTime": "13:00:00", "endTime": "15:00:00" },
      "55": { "day": "الأربعاء", "hijriDate": "1447/07/18", "startTime": "08:00:00", "endTime": "10:00:00" },
      "56": { "day": "الأربعاء", "hijriDate": "1447/07/18", "startTime": "10:30:00", "endTime": "12:30:00" },
      "57": { "day": "الأربعاء", "hijriDate": "1447/07/18", "startTime": "13:00:00", "endTime": "15:00:00" },
      "58": { "day": "الخميس", "hijriDate": "1447/07/19", "startTime": "08:00:00", "endTime": "10:00:00" },
      "59": { "day": "الخميس", "hijriDate": "1447/07/19", "startTime": "10:30:00", "endTime": "12:30:00" },
      "60": { "day": "الخميس", "hijriDate": "1447/07/19", "startTime": "13:00:00", "endTime": "15:00:00" },
      "61": { "day": "الأحد", "hijriDate": "1447/07/22", "startTime": "08:00:00", "endTime": "10:00:00" },
      "62": { "day": "الأحد", "hijriDate": "1447/07/22", "startTime": "10:30:00", "endTime": "12:30:00" },
      "63": { "day": "الأحد", "hijriDate": "1447/07/22", "startTime": "13:00:00", "endTime": "15:00:00" },
      "64": { "day": "الاثنين", "hijriDate": "1447/07/23", "startTime": "08:00:00", "endTime": "10:00:00" },
      "65": { "day": "الاثنين", "hijriDate": "1447/07/23", "startTime": "10:30:00", "endTime": "12:30:00" },
      "66": { "day": "الاثنين", "hijriDate": "1447/07/23", "startTime": "13:00:00", "endTime": "15:00:00" },
      "67": { "day": "الثلاثاء", "hijriDate": "1447/07/24", "startTime": "08:00:00", "endTime": "10:00:00" },
      "68": { "day": "الثلاثاء", "hijriDate": "1447/07/24", "startTime": "10:30:00", "endTime": "12:30:00" },
      "69": { "day": "الثلاثاء", "hijriDate": "1447/07/24", "startTime": "13:00:00", "endTime": "15:00:00" },
      "70": { "day": "الأربعاء", "hijriDate": "1447/07/25", "startTime": "08:00:00", "endTime": "10:00:00" },
      "71": { "day": "الأربعاء", "hijriDate": "1447/07/25", "startTime": "10:30:00", "endTime": "12:30:00" },
      "72": { "day": "الأربعاء", "hijriDate": "1447/07/25", "startTime": "13:00:00", "endTime": "15:00:00" },
      "73": { "day": "الخميس", "hijriDate": "1447/07/26", "startTime": "08:00:00", "endTime": "10:00:00" },
      "74": { "day": "الخميس", "hijriDate": "1447/07/26", "startTime": "10:30:00", "endTime": "12:30:00" },
      "75": { "day": "الخميس", "hijriDate": "1447/07/26", "startTime": "13:00:00", "endTime": "15:00:00" },
      "76": { "day": "الأحد", "hijriDate": "1447/07/29", "startTime": "08:00:00", "endTime": "10:00:00" },
      "77": { "day": "الأحد", "hijriDate": "1447/07/29", "startTime": "10:30:00", "endTime": "12:30:00" },
      "78": { "day": "الأحد", "hijriDate": "1447/07/29", "startTime": "13:00:00", "endTime": "15:00:00" },
      "79": { "day": "الاثنين", "hijriDate": "1447/07/30", "startTime": "08:00:00", "endTime": "10:00:00" },
      "80": { "day": "الاثنين", "hijriDate": "1447/07/30", "startTime": "10:30:00", "endTime": "12:30:00" },
      "81": { "day": "الاثنين", "hijriDate": "1447/07/30", "startTime": "13:00:00", "endTime": "15:00:00" },
      "82": { "day": "الثلاثاء", "hijriDate": "1447/08/01", "startTime": "08:00:00", "endTime": "10:00:00" },
      "83": { "day": "الثلاثاء", "hijriDate": "1447/08/01", "startTime": "10:30:00", "endTime": "12:30:00" },
      "84": { "day": "الثلاثاء", "hijriDate": "1447/08/01", "startTime": "13:00:00", "endTime": "15:00:00" },
      "85": { "day": "الأربعاء", "hijriDate": "1447/08/02", "startTime": "08:00:00", "endTime": "10:00:00" },
      "86": { "day": "الأربعاء", "hijriDate": "1447/08/02", "startTime": "10:30:00", "endTime": "12:30:00" },
      "87": { "day": "الأربعاء", "hijriDate": "1447/08/02", "startTime": "13:00:00", "endTime": "15:00:00" },
      "88": { "day": "الخميس", "hijriDate": "1447/08/03", "startTime": "08:00:00", "endTime": "10:00:00" },
      "89": { "day": "الخميس", "hijriDate": "1447/08/03", "startTime": "10:30:00", "endTime": "12:30:00" },
      "90": { "day": "الخميس", "hijriDate": "1447/08/03", "startTime": "13:00:00", "endTime": "15:00:00" },
      "91": { "day": "الأحد", "hijriDate": "1447/08/06", "startTime": "08:00:00", "endTime": "10:00:00" },
      "92": { "day": "الأحد", "hijriDate": "1447/08/06", "startTime": "10:30:00", "endTime": "12:30:00" },
      "93": { "day": "الأحد", "hijriDate": "1447/08/06", "startTime": "13:00:00", "endTime": "15:00:00" },
      "94": { "day": "الاثنين", "hijriDate": "1447/08/07", "startTime": "08:00:00", "endTime": "10:00:00" },
      "95": { "day": "الاثنين", "hijriDate": "1447/08/07", "startTime": "10:30:00", "endTime": "12:30:00" },
      "96": { "day": "الاثنين", "hijriDate": "1447/08/07", "startTime": "13:00:00", "endTime": "15:00:00" },
      "97": { "day": "الثلاثاء", "hijriDate": "1447/08/08", "startTime": "08:00:00", "endTime": "10:00:00" },
      "98": { "day": "الثلاثاء", "hijriDate": "1447/08/08", "startTime": "10:30:00", "endTime": "12:30:00" },
      "99": { "day": "الثلاثاء", "hijriDate": "1447/08/08", "startTime": "13:00:00", "endTime": "15:00:00" },
      "100": { "day": "الأربعاء", "hijriDate": "1447/08/09", "startTime": "08:00:00", "endTime": "10:00:00" },
      "101": { "day": "الأربعاء", "hijriDate": "1447/08/09", "startTime": "10:30:00", "endTime": "12:30:00" },
      "102": { "day": "الأربعاء", "hijriDate": "1447/08/09", "startTime": "13:00:00", "endTime": "15:00:00" }
    };

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
    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";
    const TEMP_STORAGE_KEY = 'temp_qu_schedule_data';

    // 2. دالة جديدة لتنسيق تفاصيل الاختبار بناءً على الرقم
    function getExamDetails(examId) {
        if (!examId || !EXAMS_DATA[examId]) {
            return 'غير محدد';
        }
        const exam = EXAMS_DATA[examId];
        const startTime = exam.startTime.substring(0, 5); // e.g., "08:00"
        const endTime = exam.endTime.substring(0, 5); // e.g., "10:00"
        return `${exam.day} ${exam.hijriDate}, من ${startTime} إلى ${endTime}`;
    }

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
            const status = row.querySelector(s.status)?.textContent.trim();
            const campus = row.querySelector(s.campus)?.textContent.trim();
            
            let hours = row.querySelector(s.hours)?.textContent.trim();
            let type = row.querySelector(s.type)?.textContent.trim();
            let examPeriodId = row.querySelector(s.examPeriod)?.value.trim();

            if (name && code && section) {
                const isPractical = type && (type.includes('عملي') || type.includes('تدريب') || type.includes('تمارين'));
                if (isPractical && (!hours || hours === '') && lastTheoreticalCourse && lastTheoreticalCourse.code === code) {
                    hours = lastTheoreticalCourse.hours;
                    examPeriodId = lastTheoreticalCourse.examPeriodId;
                }
                const timeDetails = parseTimeDetails(detailsRaw);
                const examDetailsText = getExamDetails(examPeriodId); // 3. استخدام الدالة الجديدة

                const courseInfo = { 
                    code, name, section, 
                    time: timeDetails.timeText, 
                    location: timeDetails.location,
                    instructor: instructor || 'غير محدد', 
                    examPeriod: examDetailsText, // 4. إضافة تفاصيل الاختبار المنسقة
                    hours: hours || '0',
                    type: type || 'نظري',
                    status: status || 'غير معروف',
                    campus: campus || 'غير معروف'
                };
                coursesData.push(courseInfo);
                if (!isPractical) {
                    // نخزن المعلومات الهامة للمادة النظرية للوراثة
                    lastTheoreticalCourse = { 
                        code: courseInfo.code, 
                        hours: courseInfo.hours, 
                        examPeriodId: examPeriodId // نخزن الرقم وليس النص
                    };
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
            console.log("🖥️ عرض سطح المكتب. جاري الاستخراج...");
            courses = extractCourses(SELECTORS.desktop, desktopRows);
        } else if (mobileRows.length > 0 && mobileRows[0].offsetParent !== null) {
            console.log("📱 عرض الجوال. جاري الاستخراج...");
            courses = extractCourses(SELECTORS.mobile, mobileRows);
        }

        if (courses.length > 0) {
            console.log(`🎉 نجح الاستخراج! تم العثور على ${courses.length} شعبة.`);
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
            alert("فشل استخراج البيانات. لم يتم العثور على أي مقررات. تأكد من أنك في صفحة 'المقررات المطروحة' وأنها محملة بالكامل، ثم حاول تحديث الصفحة وتشغيل الأداة مرة أخرى.");
        }
    }, 1000);
})();
