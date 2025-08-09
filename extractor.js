javascript:(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v29 (Corrected & Improved) Initialized...");

    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";
    const TEMP_STORAGE_KEY = 'temp_qu_schedule_data';

    /**
     * Parses the time and location details from the raw section string.
     * @param {string} detailsRaw - The raw string from the hidden input.
     * @returns {{timeText: string, location: string}}
     */
    function parseTimeDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') return { timeText: 'غير محدد', location: 'غير محدد' };
        let loc = 'غير محدد';
        // Extract location first
        if (detailsRaw.includes('@r')) {
            const locMatch = detailsRaw.match(/@r(.*?)(?:@n|@t|$)/);
            if (locMatch && locMatch[1] && locMatch[1].trim() !== '') {
                loc = locMatch[1].trim();
            }
        }
        // Extract time details
        if (detailsRaw.includes('@t')) {
            const dayMap = { '1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس', '6': 'الجمعة', '7': 'السبت' };
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const segments = part.split('@t');
                if (segments.length < 2) return null;
                const days = segments[0].trim().split(/\s+/).map(d => dayMap[d] || d).join(' ');
                // Clean the time part by removing the location info
                const timeStr = segments[1].replace(/@r.*$/, '').trim();
                return `${days}: ${timeStr}`;
            }).filter(Boolean);
            const timeText = timeParts.length > 0 ? timeParts.join('<br>') : 'غير محدد';
            return { timeText, location: loc };
        }
        // Fallback if no @t found
        return { timeText: 'غير محدد', location: loc };
    }

    /**
     * Extracts course data from the table rows.
     * @param {NodeListOf<Element>} rows - The table rows to process.
     * @returns {Array<Object>}
     */
    function extractCourses(rows) {
        console.log("Extracting data using robust selectors...");
        const coursesData = [];
        let lastTheoreticalCourse = null;

        /**
         * A robust function to get cell value by header text, trying multiple selectors.
         * @param {Element} row - The table row element.
         * @param {string} th - The header text (e.g., 'اسم المقرر').
         * @returns {string} The trimmed text content of the cell.
         */
        const getVal = (row, th) => {
            // Most common case from observation: non-breaking spaces
            let cell = row.querySelector(`td[data-th=" ${th} "]`); // Note: These are non-breaking spaces (Alt+0160)
            if (!cell) {
                // Try exact match
                cell = row.querySelector(`td[data-th="${th}"]`);
            }
            if (!cell) {
                // Fallback to contains selector, this is the most flexible
                cell = row.querySelector(`td[data-th*="${th}"]`);
            }
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

                // Extract data from hidden inputs
                const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
                const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();
                let examPeriodId = row.querySelector('input[type="hidden"][id$=":examPeriod"]')?.value.trim();

                const isPractical = type && (type.includes('عملي') || type.includes('تدريب') || type.includes('تمارين'));
                
                // If the current section is a practical part and has no hours, inherit from the last theoretical course with the same code.
                if (isPractical && (!hours || hours.trim() === '0' || hours.trim() === '') && lastTheoreticalCourse && lastTheoreticalCourse.code === code) {
                    hours = lastTheoreticalCourse.hours;
                    examPeriodId = lastTheoreticalCourse.examPeriodId; // Also inherit exam period
                }
                
                const timeDetails = parseTimeDetails(detailsRaw);

                const courseInfo = {
                    code,
                    name,
                    section,
                    time: timeDetails.timeText,
                    location: timeDetails.location,
                    instructor: instructor || 'غير محدد',
                    examPeriodId: examPeriodId || null, // Pass the ID directly
                    hours: hours || '0',
                    type: type || 'نظري',
                    status: status || 'غير معروف',
                    campus: campus || 'غير معروف'
                };
                coursesData.push(courseInfo);

                // If this is a theoretical course, store it for potential practical sections that follow.
                if (!isPractical) {
                    lastTheoreticalCourse = { code: courseInfo.code, hours: courseInfo.hours, examPeriodId: examPeriodId };
                }
            }
        });
        return coursesData;
    }

    setTimeout(() => {
        // The most reliable selector for course rows in the university portal
        const courseRows = document.querySelectorAll('tr.ROW1, tr.ROW2');
        let courses = [];

        if (courseRows.length > 0) {
            courses = extractCourses(courseRows);
        }

        if (courses && courses.length > 0) {
            console.log(`🎉 Success! Found ${courses.length} sections.`);
            console.log("Sample extracted data:", courses[0]);
            
            // Use sessionStorage to avoid cluttering localStorage permanently
            sessionStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(courses));
            const viewerWindow = window.open(VIEWER_URL, 'QU_Schedule_Viewer');

            if (!viewerWindow || viewerWindow.closed || typeof viewerWindow.closed === 'undefined') {
                alert("فشل فتح نافذة العارض.\n\nالرجاء السماح بالنوافذ المنبثقة (Pop-ups) لهذا الموقع والمحاولة مرة أخرى.");
                sessionStorage.removeItem(TEMP_STORAGE_KEY);
                return;
            }

            // A listener to send data once the viewer is ready. This is more reliable.
            const messageHandler = (event) => {
                // Ensure the message is from the viewer window we opened
                if (event.source !== viewerWindow) return;

                if (event.data === 'request_schedule_data') {
                    const storedData = sessionStorage.getItem(TEMP_STORAGE_KEY);
                    if (storedData) {
                        // Send data to the viewer window
                        viewerWindow.postMessage({ type: 'universityCoursesData', data: JSON.parse(storedData) }, new URL(VIEWER_URL).origin);
                        
                        // Clean up
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
