javascript:(function() {
    'use strict';
    const VIEWER_URL = "https://mutlaq001.github.io/schedule/";
    const DATA_KEY = 'qu_full_data_sync';
    const STATE_KEY = 'qu_extraction_state';

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

    function extractCurrent(semVal) {
        const rows = document.querySelectorAll('tr.ROW1, tr.ROW2');
        const coursesData = [];
        let lastTheoretical = null;
        rows.forEach(row => {
            const getVal = (th) => (row.querySelector(`td[data-th*="${th}"]`)?.textContent.trim() || '');
            const code = getVal('رمز المقرر');
            const name = getVal('اسم المقرر');
            const section = getVal('الشعبة');
            if (name && code && section) {
                let hours = getVal('الساعات');
                let type = getVal('النشاط');
                const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
                const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();
                let examPeriodId = row.querySelector('input[type="hidden"][id$=":examPeriod"]')?.value.trim();
                const isPractical = type && (type.includes('عملي') || type.includes('تدريب') || type.includes('تمارين'));
                if (isPractical && (!hours || hours === '0') && lastTheoretical && lastTheoretical.code === code) {
                    hours = lastTheoretical.hours;
                    examPeriodId = lastTheoretical.examPeriodId;
                }
                const timeDetails = parseTimeDetails(detailsRaw);
                const courseInfo = { semester: semVal, code, name, section, time: timeDetails.timeText, location: timeDetails.location, instructor: instructor || 'غير محدد', examPeriodId: examPeriodId || null, hours: hours || '0', type: type || 'نظري', status: getVal('الحالة') || 'غير معروف' };
                coursesData.push(courseInfo);
                if (!isPractical) lastTheoretical = { code: courseInfo.code, hours: courseInfo.hours, examPeriodId: examPeriodId };
            }
        });
        return coursesData;
    }

    const select = document.getElementById('myForm:semesterSelect');
    if (!select) {
        alert("تأكد من وجودك في صفحة المقررات المطروحة.");
        return;
    }

    const state = JSON.parse(sessionStorage.getItem(STATE_KEY) || '{"step": 1, "data": []}');
    const options = Array.from(select.options);

    if (state.step === 1) {
        const currentData = extractCurrent(select.value);
        const nextIdx = select.selectedIndex === 0 ? 1 : 0;
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ step: 2, data: currentData, firstSem: select.value }));
        select.selectedIndex = nextIdx;
        const event = new Event('change', { bubbles: true });
        select.dispatchEvent(event);
        if (typeof onChangeSemester === 'function') onChangeSemester();
    } else {
        const secondData = extractCurrent(select.value);
        const fullData = state.data.concat(secondData);
        sessionStorage.removeItem(STATE_KEY);
        sessionStorage.setItem(DATA_KEY, JSON.stringify(fullData));
        const vWin = window.open(VIEWER_URL, 'QU_Schedule_Viewer');
        window.addEventListener('message', function h(e) {
            if (e.source === vWin && e.data === 'request_schedule_data') {
                vWin.postMessage({ type: 'universityCoursesData', data: fullData }, '*');
                sessionStorage.removeItem(DATA_KEY);
                window.removeEventListener('message', h);
            }
        });
    }
})();
