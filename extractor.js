javascript:(function() {
    'use strict';
    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";
    const STATE_KEY = 'qu_extraction_state_v2';

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

    function extractCourses(rows, semVal, semName) {
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
                if (lastTheoreticalCourse && code !== lastTheoreticalCourse.code) {
                    lastTheoreticalCourse = null;
                }
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
                const courseInfo = {
                    semester: semVal,
                    semesterName: semName,
                    code, name, section,
                    time: timeDetails.timeText,
                    location: timeDetails.location,
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

    const select = document.getElementById('myForm:semesterSelect');
    if (!select) {
        alert("تأكد من وجودك في صفحة المقررات المطروحة.");
        return;
    }

    const allOptions = Array.from(select.options);
    const currentIndex = select.selectedIndex;
    const currentOption = allOptions[currentIndex];
    
    const state = JSON.parse(sessionStorage.getItem(STATE_KEY) || '{"data": []}');
    
    const courseRows = document.querySelectorAll('tr.ROW1, tr.ROW2');
    const currentData = extractCourses(courseRows, currentOption.value, currentOption.text);
    const newData = state.data.concat(currentData);

    if (currentIndex < allOptions.length - 1) {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ data: newData }));
        select.selectedIndex = currentIndex + 1;
        const event = new Event('change', { bubbles: true });
        select.dispatchEvent(event);
        if (typeof onChangeSemester === 'function') onChangeSemester();
    } else {
        sessionStorage.removeItem(STATE_KEY);
        const viewerWindow = window.open(VIEWER_URL, 'QU_Schedule_Viewer');
        const messageHandler = (event) => {
            if (event.source === viewerWindow && event.data === 'request_schedule_data') {
                viewerWindow.postMessage({ type: 'universityCoursesData', data: newData }, '*');
                window.removeEventListener('message', messageHandler);
            }
        };
        window.addEventListener('message', messageHandler);
    }
})();
