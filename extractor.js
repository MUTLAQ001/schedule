javascript:(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v30 (Final & Corrected) Initialized...");

    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";
    const TEMP_STORAGE_KEY = 'temp_qu_schedule_data';

    /**
     * Parses all details (time, location, exam period) from the raw section string.
     * @param {string} detailsRaw - The raw string from the hidden input.
     * @returns {{timeText: string, location: string, examPeriodId: string|null}}
     */
    function parseAllDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') {
            return { timeText: 'غير محدد', location: 'غير محدد', examPeriodId: null };
        }

        let loc = 'غير محدد';
        let examId = null;
        let timeText = 'غير محدد';

        // Extract location
        const locMatch = detailsRaw.match(/@r(.*?)(?:@n|@t|$)/);
        if (locMatch && locMatch[1] && locMatch[1].trim() !== '') {
            loc = locMatch[1].trim();
        }

        // Extract time details
        if (detailsRaw.includes('@t')) {
            const dayMap = { '1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس', '6': 'الجمعة', '7': 'السبت' };
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const segments = part.split('@t');
                if (segments.length < 2) return null;
                const days = segments[0].trim().split(/\s+/).map(d => dayMap[d] || d).join(' ');
                const timeStr = segments[1].replace(/@r.*$/, '').trim();
                return `${days}: ${timeStr}`;
            }).filter(Boolean);

            if (timeParts.length > 0) {
                timeText = timeParts.join('<br>');
            }
        }
        
        // Extract Exam Period ID from the same raw string, as it's sometimes embedded.
        // The value is often at the end after the location.
        // Example: "1 @t 10:00 ص - 11:40 ص @r 40"
        const examMatch = detailsRaw.match(/@r\s*.*?\s*(\d+)$/);
        if (examMatch && examMatch[1]) {
            examId = examMatch[1].trim();
        }

        return { timeText, location: loc, examPeriodId: examId };
    }

    /**
     * Extracts course data from the table rows.
     * @param {NodeListOf<Element>} rows - The table rows to process.
     * @returns {Array<Object>}
     */
    function extractCourses(rows) {
        console.log("Extracting data with robust selectors...");
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
                let hours = getVal(row, 'الساعات');
                let type = getVal(row, 'النشاط');
                const status = getVal(row, 'الحالة');
                const campus = getVal(row, 'المقر');

                const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
                const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();
                
                // Primary method to get examPeriodId from its own hidden input
                let examPeriodId = row.querySelector('input[type="hidden"][id$=":examPeriod"]')?.value.trim();

                const parsedDetails = parseAllDetails(detailsRaw);

                // If the primary method failed, try the secondary method from the parsed string
                if (!examPeriodId && parsedDetails.examPeriodId) {
                    examPeriodId = parsedDetails.examPeriodId;
                }
                
                const isPractical = type && (type.includes('عملي') || type.includes('تدريب') || type.includes('تمارين'));
                
                if (isPractical && (!hours || hours.trim() === '0' || hours.trim() === '') && lastTheoreticalCourse && lastTheoreticalCourse.code === code) {
                    hours = lastTheoreticalCourse.hours;
                    if (!examPeriodId) { // Only inherit if not found
                        examPeriodId = lastTheoreticalCourse.examPeriodId;
                    }
                }
                
                const courseInfo = {
                    code,
                    name,
                    section,
                    time: parsedDetails.timeText,
                    location: parsedDetails.location,
                    instructor: instructor || 'غير محدد',
                    examPeriodId: examPeriodId || null,
                    hours: hours || '0',
                    type: type || 'نظري',
                    status: status || 'غير معروف',
                    campus: campus || 'غير معروف'
                };
                coursesData.push(courseInfo);

                if (!isPractical) {
                    lastTheoreticalCourse = { code: courseInfo.code, hours: courseInfo.hours, examPeriodId: examPeriodId };
                }
            }
        });
        return coursesData;
    }

    setTimeout(() => {
        const courseRows = document.querySelectorAll('tr.ROW1, tr.ROW2');
        let courses = [];

        if (courseRows.length > 0) {
            courses = extractCourses(courseRows);
        }

        if (courses && courses.length > 0) {
            console.log(`🎉 Success! Found ${courses.length} sections.`);
            console.log("Sample extracted data:", courses[0]);
            
            sessionStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(courses));
            const viewerWindow = window.open(VIEWER_URL, 'QU_Schedule_Viewer');

            if (!viewerWindow || viewerWindow.closed || typeof viewerWindow.closed === 'undefined') {
                alert("فشل فتح نافذة العارض.\n\nالرجاء السماح بالنوافذ المنبثقة (Pop-ups) لهذا الموقع والمحاولة مرة أخرى.");
                sessionStorage.removeItem(TEMP_STORAGE_KEY);
                return;
            }

            const messageHandler = (event) => {
                if (event.source !== viewerWindow) return;

                if (event.data === 'request_schedule_data') {
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
            alert("فشل استخراج البيانات.\n\nلم يتم العثور على أي مقررات.\n\nتأكد من أنك في صفحة 'المقررات المطروحة' وأن المواد ظاهرة أمامك بالكامل، ثم حاول تحديث الصفحة وتشغيل الأداة مرة أخرى.");
        }
    }, 1000);
})();
