// extractor.js - QU Schedule v14 (كمبيوتر + جوال + فترة الاختبار)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v14 Initialized...");

    // --- START: LZString Compression Library ---
    var LZString=function(){var f={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",compressToEncodedURIComponent:function(a){return null==a?"":f._compress(a,6,function(a){return f._keyStr.charAt(a)})},_compress:function(a,g,b){if(null==a)return"";var h,d,c,e={},f={},k="",l="",m="",n=2,p=3,q=2,r=[],s=0,t=0;for(c=0;c<a.length;c+=1)if(k=a.charAt(c),!Object.prototype.hasOwnProperty.call(e,k)&&(e[k]=p++,f[k]=!0),l=m+k,Object.prototype.hasOwnProperty.call(e,l))m=l;else{if(Object.prototype.hasOwnProperty.call(f,m)){if(m.charCodeAt(0)<256){for(h=0;h<q;h++)s<<=1,t==g-1?(t=0,r.push(b(s)),s=0):t++;for(d=m.charCodeAt(0),h=0;h<8;h++)s=s<<1|1&d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d>>=1}else{for(d=1,h=0;h<q;h++)s=s<<1|d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d=0;for(d=m.charCodeAt(0),h=0;h<16;h++)s=s<<1|1&d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d>>=1}n--,0==n&&(n=Math.pow(2,q),q++),delete f[m]}else for(d=e[m],h=0;h<q;h++)s=s<<1|1&d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d>>=1;n--,0==n&&(n=Math.pow(2,q),q++),e[l]=p++,m=String(k)}if(""!==m){if(Object.prototype.hasOwnProperty.call(f,m)){if(m.charCodeAt(0)<256){for(h=0;h<q;h++)s<<=1,t==g-1?(t=0,r.push(b(s)),s=0):t++;for(d=m.charCodeAt(0),h=0;h<8;h++)s=s<<1|1&d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d>>=1}else{for(d=1,h=0;h<q;h++)s=s<<1|d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d=0;for(d=m.charCodeAt(0),h=0;h<16;h++)s=s<<1|1&d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d>>=1}n--,0==n&&(n=Math.pow(2,q),q++),delete f[m]}else for(d=e[m],h=0;h<q;h++)s=s<<1|1&d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d>>=1;n--,0==n&&(n=Math.pow(2,q),q++)}for(d=2,h=0;h<q;h++)s=s<<1|1&d,t==g-1?(t=0,r.push(b(s)),s=0):t++,d>>=1;for(;;){if(s<<=1,t==g-1){r.push(b(s));break}t++}return r.join("")}};return f}();
    // --- END: LZString ---

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
            const jsonString = JSON.stringify(courses);
            const compressedData = LZString.compressToEncodedURIComponent(jsonString);
            const viewerURL = `https://mutlaq001.github.io/schedule/?data=${compressedData}`;
            
            console.log("📨 Opening QU Schedule with data...");
            window.open(viewerURL, '_blank');
        } else {
            alert("Extraction failed. No courses found. Please make sure the courses page is fully loaded.");
        }

    }, 1500);
})();        const isDesktop = document.querySelector(SELECTORS.desktop.container);
        const isMobile = document.querySelector(SELECTORS.mobile.container);

        if (isDesktop) {
            courses = extractFromDesktop();
        } else if (isMobile) {
            courses = extractFromMobile();
        } else {
            courses = extractFromDesktop();
            if (courses.length === 0) {
                courses = extractFromMobile();
            }
        }

        if (courses && courses.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${courses.length} مقررًا.`);
            const jsonString = JSON.stringify(courses);
            const compressedData = LZString.compressToEncodedURIComponent(jsonString);
            const viewerURL = `https://mutlaq001.github.io/schedule/?data=${compressedData}`;
            
            console.log("📨 جار التوجيه إلى صفحة العرض مع البيانات...");
            window.open(viewerURL, '_blank');
            
        } else {
            alert("فشل الاستخراج. لم يتم العثور على أي مقررات. تأكد من أن الصفحة محملة بالكامل.");
        }

    }, 1500);
})();
