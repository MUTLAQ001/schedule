// extractor.js - QU Schedule v19 (Final & Robust Extraction)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v19 Initialized...");

    // More flexible selectors using attribute "contains" to avoid issues with non-breaking spaces (&nbsp;)
    const SELECTORS = {
        desktop: {
            courseRow: 'tr[class^="ROW"]',
            code: 'td[data-th="رمز المقرر"]',
            name: 'td[data-th="اسم المقرر"]',
            section: 'td[data-th*="الشعبة"]',
            hours: 'td[data-th*="الساعات"]',
            type: 'td[data-th*="النشاط"]',
            detailsCell: 'td[data-th="التفاصيل"]'
        },
        mobile: {
            courseCard: 'div.row-xs',
            code: 'div[data-th="رمز المقرر"] span.value',
            name: 'div[data-th="اسم المقرر"] span.value',
            section: 'div[data-th*="الشعبة"] span.value',
            hours: 'div[data-th*="الساعات"] span.value',
            type: 'div[data-th*="النشاط"] span.value',
            detailsCell: 'div[data-th="التفاصيل"]'
        }
    };
    
    function findDetailInput(row, selector, attributeSuffix) {
        const detailsContainer = row.querySelector(selector);
        return detailsContainer ? detailsContainer.querySelector(`input[type="hidden"][id$=":${attributeSuffix}"]`) : null;
    }

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
            try {
                const code = row.querySelector(s.code)?.textContent.trim();
                const name = row.querySelector(s.name)?.textContent.trim();
                const section = row.querySelector(s.section)?.textContent.trim();
                const hours = row.querySelector(s.hours)?.textContent.trim();
                const type = row.querySelector(s.type)?.textContent.trim();

                const instructorInput = findDetailInput(row, s.detailsCell, 'instructor');
                const detailsInput = findDetailInput(row, s.detailsCell, 'section');
                const examPeriodInput = findDetailInput(row, s.detailsCell, 'examPeriod');

                const instructor = instructorInput?.value.trim();
                const detailsRaw = detailsInput?.value.trim();
                const examPeriod = examPeriodInput?.value.trim();

                if (name && code && section) {
                    coursesData.push({ 
                        code, 
                        name, 
                        section, 
                        hours: hours || '0',
                        type: type || 'غير محدد',
                        time: parseTimeDetails(detailsRaw || ''), 
                        instructor: instructor || 'غير محدد', 
                        examPeriod: examPeriod || null,
                    });
                }
            } catch (e) {
                console.error("Error processing a row, skipping. Error:", e);
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
            alert("فشل الاستخراج. لم يتم العثور على مقررات. الرجاء التأكد من أن صفحة المقررات المطروحة قد تم تحميلها بالكامل.");
        }

    }, 1500);
})();
