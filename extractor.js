// extractor.js - QU Schedule v15 (Fixed)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 QU Schedule Extractor v15 Initialized...");

    // --- START: LZString Compression Library (Corrected Version) ---
    var LZString = (function() {
        var f = Object.create(null),
            i = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".split("");
        f.compressToEncodedURIComponent = function(o) {
            if (null == o) return "";
            var r = f._compress(o, 6, function(o) {
                return i[o]
            });
            return r
        };
        f._compress = function(o, r, n) {
            if (null == o) return "";
            var t, e, s, u = Object.create(null),
                p = Object.create(null),
                a = "",
                l = "",
                c = "",
                d = 2,
                h = 3,
                g = 2,
                v = [],
                _ = 0,
                m = 0;
            for (s = 0; s < o.length; s += 1)
                if (a = o.charAt(s), u[a] || (u[a] = h++, p[a] = !0), l = c + a, u[l]) c = l;
                else {
                    if (p[c]) {
                        if (c.charCodeAt(0) < 256) {
                            for (t = 0; t < g; t++) _ <<= 1, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++;
                            for (e = c.charCodeAt(0), t = 0; t < 8; t++) _ = _ << 1 | 1 & e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e >>= 1
                        } else {
                            for (e = 1, t = 0; t < g; t++) _ = _ << 1 | e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e = 0;
                            for (e = c.charCodeAt(0), t = 0; t < 16; t++) _ = _ << 1 | 1 & e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e >>= 1
                        }
                        d--, 0 == d && (d = Math.pow(2, g), g++), delete p[c]
                    } else
                        for (e = u[c], t = 0; t < g; t++) _ = _ << 1 | 1 & e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e >>= 1;
                    d--, 0 == d && (d = Math.pow(2, g), g++), u[l] = h++, c = String(a)
                }
            if ("" !== c) {
                if (p[c]) {
                    if (c.charCodeAt(0) < 256) {
                        for (t = 0; t < g; t++) _ <<= 1, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++;
                        for (e = c.charCodeAt(0), t = 0; t < 8; t++) _ = _ << 1 | 1 & e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e >>= 1
                    } else {
                        for (e = 1, t = 0; t < g; t++) _ = _ << 1 | e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e = 0;
                        for (e = c.charCodeAt(0), t = 0; t < 16; t++) _ = _ << 1 | 1 & e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e >>= 1
                    }
                    d--, 0 == d && (d = Math.pow(2, g), g++), delete p[c]
                } else
                    for (e = u[c], t = 0; t < g; t++) _ = _ << 1 | 1 & e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e >>= 1;
                d--, 0 == d && (d = Math.pow(2, g), g++)
            }
            for (e = 2, t = 0; t < g; t++) _ = _ << 1 | 1 & e, m == r - 1 ? (m = 0, v.push(n(_)), _ = 0) : m++, e >>= 1;
            for (;;) {
                if (_ <<= 1, m == r - 1) {
                    v.push(n(_));
                    break
                }
                m++
            }
            return v.join("")
        };
        return f
    })();
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
})();
