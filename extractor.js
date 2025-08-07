// extractor.js - النسخة النهائية الشاملة v13 (كمبيوتر + جوال + فترة الاختبار)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 أداة الاستخراج الشاملة v13 بدأت...");

    const SELECTORS = {
        desktop: {
            container: 'div.data-table-container',
            courseRow: 'tr[class^="ROW"]',
            code: 'td[data-th="رمز المقرر"]',
            name: 'td[data-th="اسم المقرر"]',
            section: 'td[data-th^="الشعبة"]',
            instructor: 'input[type="hidden"][id$=":instructor"]',
            details: 'input[type="hidden"][id$=":section"]',
            // --- START: التحسين ---
            // إضافة محدد جديد لفترة الاختبار
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
            // --- END: التحسين ---
        },
        mobile: {
            container: 'div.ui-content',
            courseCard: 'div.row-xs',
            code: 'div[data-th="رمز المقرر"] span.value',
            name: 'div[data-th="اسم المقرر"] span.value',
            section: 'div[data-th^="الشعبة"] span.value',
            instructor: 'input[type="hidden"][id$=":instructor"]',
            details: 'input[type="hidden"][id$=":section"]',
            // --- START: التحسين ---
            // إضافة محدد فترة الاختبار للجوال (تخميني)
            examPeriod: 'input[type="hidden"][id$=":examPeriod"]'
            // --- END: التحسين ---
        }
    };

    // مكتبة ضغط LZString مدمجة (بدون تغيير)
    var LZString = (function() { var o = { _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234456789+/=", compressToEncodedURIComponent: function(e) { return null == e ? "" : o._compress(e, 6, function(e) { return o._keyStr.charAt(e) }) }, _compress: function(e, r, t) { if (null == e) return ""; var n, i, s, a = {}, o = {}, u = "", l = "", c = "", p = 2, f = 3, h = 2, d = [], g = 0, m = 0; for (s = 0; s < e.length; s += 1) if (u = e.charAt(s), Object.prototype.hasOwnProperty.call(a, u) || (a[u] = f++, o[u] = !0), l = c + u, Object.prototype.hasOwnProperty.call(a, l)) c = l; else { if (Object.prototype.hasOwnProperty.call(o, c)) { if (c.charCodeAt(0) < 256) { for (n = 0; n < h; n++) g <<= 1, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++; for (i = c.charCodeAt(0), n = 0; n < 8; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } else { for (i = 1, n = 0; n < h; n++) g = g << 1 | i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i = 0; for (i = c.charCodeAt(0), n = 0; n < 16; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } p--, 0 == p && (p = Math.pow(2, h), h++), delete o[c] } else for (i = a[c], n = 0; n < h; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1; p--, 0 == p && (p = Math.pow(2, h), h++), a[l] = f++, c = String(u) } if ("" !== c) { if (Object.prototype.hasOwnProperty.call(o, c)) { if (c.charCodeAt(0) < 256) { for (n = 0; n < h; n++) g <<= 1, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++; for (i = c.charCodeAt(0), n = 0; n < 8; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } else { for (i = 1, n = 0; n < h; n++) g = g << 1 | i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i = 0; for (i = c.charCodeAt(0), n = 0; n < 16; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } p--, 0 == p && (p = Math.pow(2, h), h++), delete o[c] } else for (i = a[c], n = 0; n < h; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1; p--, 0 == p && (p = Math.pow(2, h), h++) } for (i = 2, n = 0; n < h; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1; for (;;) { if (g <<= 1, m == r - 1) { d.push(t(g)); break } m++ } return d.join("") } }; return o })();

    function parseTimeDetails(detailsRaw) {
        if (!detailsRaw || detailsRaw.trim() === '') return 'غير محدد';
        if (detailsRaw.includes('@t')) {
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const subParts = part.split('@t');
                if (subParts.length < 2) return null;
                let dayPart = subParts[0].trim();
                let timePart = subParts[1].replace(/@r.*$/, '').trim();
                const dayMapping = {'1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس'};
                const translatedDays = dayPart.split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                return `${translatedDays}: ${timePart}`;
            }).filter(Boolean);
            return timeParts.length > 0 ? timeParts.join('<br>') : 'غير محدد';
        }
        return detailsRaw.trim();
    }

    function extractFromDesktop() {
        console.log("🖥️ تم اكتشاف وضع الكمبيوتر. بدء الاستخراج...");
        const s = SELECTORS.desktop;
        const courseRows = document.querySelectorAll(s.courseRow);
        if (courseRows.length === 0) return [];

        const coursesData = [];
        courseRows.forEach(row => {
            const code = row.querySelector(s.code)?.textContent.trim();
            const name = row.querySelector(s.name)?.textContent.trim();
            const section = row.querySelector(s.section)?.textContent.trim();
            const instructor = row.querySelector(s.instructor)?.value.trim();
            const detailsRaw = row.querySelector(s.details)?.value.trim();
            // --- START: التحسين ---
            const examPeriod = row.querySelector(s.examPeriod)?.value.trim();
            // --- END: التحسين ---

            if (name && code && section) {
                const time = parseTimeDetails(detailsRaw);
                // --- START: التحسين ---
                coursesData.push({ code, name, section, time, instructor: instructor || 'غير محدد', examPeriod: examPeriod || null });
                // --- END: التحسين ---
            }
        });
        return coursesData;
    }

    function extractFromMobile() {
        console.log("📱 تم اكتشاف وضع الجوال. بدء الاستخراج...");
        const s = SELECTORS.mobile;
        const courseCards = document.querySelectorAll(s.courseCard);
        if (courseCards.length === 0) return [];

        const coursesData = [];
        courseCards.forEach(card => {
            const code = card.querySelector(s.code)?.textContent.trim();
            const name = card.querySelector(s.name)?.textContent.trim();
            const section = card.querySelector(s.section)?.textContent.trim();
            const instructor = card.querySelector(s.instructor)?.value.trim();
            const detailsRaw = card.querySelector(s.details)?.value.trim();
            // --- START: التحسين ---
            const examPeriod = card.querySelector(s.examPeriod)?.value.trim();
            // --- END: التحسين ---

            if (name && code && section) {
                const time = parseTimeDetails(detailsRaw);
                // --- START: التحسين ---
                coursesData.push({ code, name, section, time, instructor: instructor || 'غير محدد', examPeriod: examPeriod || null });
                // --- END: التحسين ---
            }
        });
        return coursesData;
    }

    // --- المنطق الرئيسي ---
    setTimeout(function() {
        let courses = [];
        const isDesktop = document.querySelector(SELECTORS.desktop.container);
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
