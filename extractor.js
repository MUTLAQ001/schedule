javascript:(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v37 (Frame-Searching Version) Initialized...");

    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";
    const TEMP_STORAGE_KEY = 'temp_qu_schedule_data';

    // ---- No changes needed in these helper functions ----
    function parseTimeDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') return { timeText: 'غير محدد', location: 'غير محدد' };
        let loc = 'غير محدد';
        if (detailsRaw.includes('@r')) {
            const locMatch = detailsRaw.match(/@r(.*?)(?:@n|@t|$)/);
            if (locMatch && locMatch[1] && locMatch[1].trim() !== '') loc = locMatch[1].trim();
        }
        if (detailsRaw.includes('@t')) {
            const dayMap = { '1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس', '6': 'الجمعة', '7': 'السبت' };
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const segments = part.split('@t');
                if (segments.length < 2) return null;
                const days = segments[0].trim().split(/\s+/).map(d => dayMap[d] || d).join(' ');
                const timeStr = segments[1].replace(/@r.*$/, '').trim();
                return `${days}: ${timeStr}`;
            }).filter(Boolean);
            const timeText = timeParts.length > 0 ? timeParts.join('<br>') : 'غير محدد';
            return { timeText, location: loc };
        }
        return { timeText: 'غير محدد', location: loc };
    }

    function extractCourses(rows) {
        const coursesData = [];
        let lastTheoreticalCourse = null;
        const getVal = (row, th) => {
            let cell = row.querySelector(`td[data-th=" ${th} "]`) || row.querySelector(`td[data-th="${th}"]`) || row.querySelector(`td[data-th*="${th}"]`);
            return cell ? cell.textContent.trim() : '';
        };
        rows.forEach(row => {
            const code = getVal(row, 'رمز المقرر');
            const name = getVal(row, 'اسم المقرر');
            const section = getVal(row, 'الشعبة');
            if (name && code && section) {
                if (lastTheoreticalCourse && code !== lastTheoreticalCourse.code) { lastTheoreticalCourse = null; }
                let hours = getVal(row, 'الساعات');
                let type = getVal(row, 'النشاط');
                const status = getVal(row, 'الحالة');
                const campus = getVal(row, 'المقر');
                const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
                const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();
                let examPeriodId = row.querySelector('input[type="hidden"][id$=":examPeriod"]')?.value.trim();
                const isPractical = type && (type.includes('عملي') || type.includes('تدريب') || type.includes('تمارين'));
                if (isPractical && (!hours || hours.trim() === '0' || hours.trim() === '') && lastTheoreticalCourse && lastTheoreticalCourse.code === code) {
                    hours = lastTheoreticalCourse.hours;
                    examPeriodId = lastTheoreticalCourse.examPeriodId;
                }
                const timeDetails = parseTimeDetails(detailsRaw);
                coursesData.push({ code, name, section, time: timeDetails.timeText, location: timeDetails.location, instructor: instructor || 'غير محدد', examPeriodId: examPeriodId || null, hours: hours || '0', type: type || 'نظري', status: status || 'غير معروف', campus: campus || 'غير معروف' });
                if (!isPractical) { lastTheoreticalCourse = { code: code, hours: hours, examPeriodId: examPeriodId }; }
            }
        });
        return coursesData;
    }
    // ---- End of helper functions ----

    // ---- NEW: Main logic to find the correct document (page or frame) ----
    function findCourseDocument() {
        console.log("Searching for course table in the main document...");
        if (document.querySelectorAll('tr.ROW1, tr.ROW2').length > 0) {
            console.log("Found table in the main document.");
            return document;
        }

        console.log("Table not in main document. Searching in frames...");
        const frames = document.querySelectorAll('iframe, frame');
        for (let i = 0; i < frames.length; i++) {
            try {
                const frameDoc = frames[i].contentDocument || frames[i].contentWindow.document;
                if (frameDoc.querySelectorAll('tr.ROW1, tr.ROW2').length > 0) {
                    console.log(`Found table in frame #${i}.`);
                    return frameDoc;
                }
            } catch (e) {
                console.warn(`Could not access frame #${i} due to security policy. This is usually normal.`);
            }
        }
        
        console.log("Could not find table in any frame. Defaulting to main document.");
        return document; // Fallback
    }

    setTimeout(() => {
        const doc = findCourseDocument(); // Get the correct document
        const courseRows = doc.querySelectorAll('tr.ROW1, tr.ROW2');
        
        if (courseRows.length === 0) {
            alert("فشل استخراج البيانات بشكل كامل.\n\nلم يتم العثور على جدول المقررات. تأكد من أنك في الصفحة الصحيحة وأن الجدول معروض أمامك.");
            return;
        }
        
        console.log(`Analyzing ${courseRows.length} rows found in the correct document...`);
        const courses = extractCourses(courseRows);

        if (courses.length > 0) {
            const uniqueCourses = new Set(courses.map(c => c.code)).size;
            const alertMessage = `🎉 نجح الاستخلاص!\n\nتم العثور على ${courses.length} شعبة لـ ${uniqueCourses} مقرر.\n\nسيتم الآن فتح نافذة العرض.`;
            alert(alertMessage);
            
            sessionStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(courses));
            const viewerWindow = window.open(VIEWER_URL, 'QU_Schedule_Viewer');

            if (!viewerWindow || viewerWindow.closed || typeof viewerWindow.closed === 'undefined') {
                alert("فشل فتح نافذة العارض.\n\nالرجاء السماح بالنوافذ المنبثقة (Pop-ups) لهذا الموقع والمحاولة مرة أخرى.");
                sessionStorage.removeItem(TEMP_STORAGE_KEY);
                return;
            }

            const messageHandler = (event) => {
                if (event.source === viewerWindow && event.data === 'request_schedule_data') {
                    const storedData = sessionStorage.getItem(TEMP_STORAGE_KEY);
                    if (storedData) {
                        viewerWindow.postMessage({ type: 'universityCoursesData', data: JSON.parse(storedData) }, new URL(VIEWER_URL).origin);
                        sessionStorage.removeItem(TEMP_STORAGE_KEY);
                        window.removeEventListener('message', messageHandler);
                    }
                }
            };
            window.addEventListener('message', messageHandler, false);
        } else {
            alert("تم العثور على الجدول، ولكن لم يتم استخلاص أي بيانات. قد تكون هناك مشكلة في تنسيق الصفحة.");
        }
    }, 1500); // Increased delay slightly to ensure frames load
})();
