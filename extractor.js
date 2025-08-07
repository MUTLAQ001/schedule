// extractor.js - QU Schedule v16 (localStorage Method)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v16 Initialized...");

    const SELECTORS = {
        desktop: {
            container: 'div.data-table-container', courseRow: 'tr[class^="ROW"]', code: 'td[data-th="رمز المقرر"]',
            name: 'td[data-th="اسم المقرر"]', section: 'td[data-th^="الشعبة"]',
            instructor: 'input[type="hidden"][id$=":instructor"]', details: 'input[type="hidden"][id$=":section"]',
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
        },
        mobile: {
            container: 'div.ui-content', courseCard: 'div.row-xs', code: 'div[data-th="رمز المقرر"] span.value',
            name: 'div[data-th="اسم المقرر"] span.value', section: 'div[data-th^="الشعبة"] span.value',
            instructor: 'input[type="hidden"][id$=":instructor"]', details: 'input[type="hidden"][id$=":section"]',
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
        }
    };

    function parseTimeDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') return 'غير محدد';
        if (detailsRaw.includes('@t')) {
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const subParts = part.split('@t');
                if (subParts.length < 2) return null;
                const dayMapping = {'1':'الأحد','2':'الاثنين','3':'الثلاثاء','4':'الأربعاء','5':'الخميس','6':'الجمعة','7':'السبت'};
                const translatedDays = subParts[0].trim().split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                return `${translatedDays}: ${subParts[1].replace(/@r.*$/, '').trim()}`;
            }).filter(Boolean);
            return timeParts.length > 0 ? timeParts.join('<br>') : 'غير محدد';
        }
        return detailsRaw.trim();
    }

    function extractCourses(s, rows) {
        const coursesData = [];
        rows.forEach(row => {
            const code = row.querySelector(s.code)?.textContent.trim();
            const name = row.querySelector(s.name)?.textContent.trim();
            const section = row.querySelector(s.section)?.textContent.trim();
            const instructor = row.querySelector(s.instructor)?.value.trim();
            const detailsRaw = row.querySelector(s.details)?.value.trim();
            const examPeriod = row.querySelector(s.examPeriod)?.value.trim();
            if (name && code && section) {
                coursesData.push({ 
                    code, name, section, 
                    time: parseTimeDetails(detailsRaw), 
                    instructor: instructor || 'غير محدد', 
                    examPeriod: examPeriod || null 
                });
            }
        });
        return coursesData;
    }

    setTimeout(() => {
        let courses = [];
        if (document.querySelector(SELECTORS.desktop.container)) {
            console.log("🖥️ Desktop view detected. Extracting...");
            courses = extractCourses(SELECTORS.desktop, document.querySelectorAll(SELECTORS.desktop.courseRow));
        } else if (document.querySelector(SELECTORS.mobile.container)) {
            console.log("📱 Mobile view detected. Extracting...");
            courses = extractCourses(SELECTORS.mobile, document.querySelectorAll(SELECTORS.mobile.courseCard));
        } else {
             console.log("🕵️ No specific view detected. Trying desktop then mobile...");
             courses = extractCourses(SELECTORS.desktop, document.querySelectorAll(SELECTORS.desktop.courseRow));
             if (courses.length === 0) {
                 courses = extractCourses(SELECTORS.mobile, document.querySelectorAll(SELECTORS.mobile.courseCard));
             }
        }
        
        if (courses.length > 0) {
            console.log(`🎉 Success! Extracted ${courses.length} sections.`);
            const dataToStore = JSON.stringify({
                timestamp: Date.now(),
                data: courses
            });
            
            // Store data in localStorage on the university domain
            localStorage.setItem('temp_qu_schedule_data', dataToStore);
            
            const viewerURL = `https://mutlaq001.github.io/schedule/`;
            
            console.log("📨 Opening QU Schedule. It will request data automatically.");
            const viewerWindow = window.open(viewerURL, 'QU_Schedule_Viewer');

            // Listen for a request from the viewer app
            window.addEventListener('message', function(event) {
                if (event.source === viewerWindow && event.data === 'request_schedule_data') {
                    console.log("Viewer is ready, sending data...");
                    const storedData = localStorage.getItem('temp_qu_schedule_data');
                    if (storedData) {
                        viewerWindow.postMessage({
                            type: 'universityCoursesData',
                            data: JSON.parse(storedData).data
                        }, 'https://mutlaq001.github.io');
                        localStorage.removeItem('temp_qu_schedule_data'); // Clean up
                    }
                }
            }, { once: true });

        } else {
            alert("Extraction failed. No courses found. Please make sure the courses page is fully loaded.");
        }

    }, 1500);
})();
