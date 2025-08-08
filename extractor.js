// extractor.js - QU Schedule v18 (Professional Data Inheritance)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v18 Initialized...");

    const SELECTORS = {
        desktop: {
            container: 'div.data-table-container',
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
            container: 'div.ui-content',
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
        let lastTheoreticalCourse = null; // Variable to store the last seen theoretical course

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
                
                // If it's a practical/lab section and hours are missing, inherit from the last theoretical course
                if (isPractical && (!hours || hours === '') && lastTheoreticalCourse && lastTheoreticalCourse.code === code) {
                    hours = lastTheoreticalCourse.hours;
                    examPeriod = lastTheoreticalCourse.examPeriod;
                }
                
                const courseInfo = { 
                    code, 
                    name, 
                    section, 
                    time: parseTimeDetails(detailsRaw), 
                    instructor: instructor || 'غير محدد', 
                    examPeriod: examPeriod || null,
                    hours: hours || '0',
                    type: type || 'نظري'
                };

                coursesData.push(courseInfo);

                // If this course is theoretical, save it as the last one seen
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

        if (desktopRows.length > 0) {
            console.log("🖥️ Desktop view detected. Extracting...");
            courses = extractCourses(SELECTORS.desktop, desktopRows);
        } else if (mobileRows.length > 0) {
            console.log("📱 Mobile view detected. Extracting...");
            courses = extractCourses(SELECTORS.mobile, mobileRows);
        } else {
             console.log("🕵️ No specific view detected.");
        }
        
        if (courses.length > 0) {
            console.log(`🎉 Success! Extracted ${courses.length} sections.`);
            const dataToStore = JSON.stringify({
                timestamp: Date.now(),
                data: courses
            });
            
            localStorage.setItem('temp_qu_schedule_data', dataToStore);
            
            const viewerURL = `https://mutlaq001.github.io/schedule/`;
            
            console.log("📨 Opening QU Schedule. It will request data automatically.");
            const viewerWindow = window.open(viewerURL, 'QU_Schedule_Viewer');

            window.addEventListener('message', function(event) {
                if (event.source === viewerWindow && event.data === 'request_schedule_data') {
                    console.log("Viewer is ready, sending data...");
                    const storedData = localStorage.getItem('temp_qu_schedule_data');
                    if (storedData) {
                        viewerWindow.postMessage({
                            type: 'universityCoursesData',
                            data: JSON.parse(storedData).data
                        }, 'https://mutlaq001.github.io');
                        localStorage.removeItem('temp_qu_schedule_data');
                    }
                }
            }, { once: true });

        } else {
            alert("Extraction failed. No courses found. Please make sure the courses page is fully loaded.");
        }

    }, 1500);
})();
