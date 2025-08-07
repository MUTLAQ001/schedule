// extractor.js - النسخة النهائية الشاملة v11 (كمبيوتر + جوال)
(function() {
    'use strict';
    console.clear();
    console.log("🚀 أداة الاستخراج الشاملة v11 بدأت...");

    // مكتبة ضغط LZString مدمجة
    var LZString = (function() { var o = { _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", compressToEncodedURIComponent: function(e) { return null == e ? "" : o._compress(e, 6, function(e) { return o._keyStr.charAt(e) }) }, _compress: function(e, r, t) { if (null == e) return ""; var n, i, s, a = {}, o = {}, u = "", l = "", c = "", p = 2, f = 3, h = 2, d = [], g = 0, m = 0; for (s = 0; s < e.length; s += 1) if (u = e.charAt(s), Object.prototype.hasOwnProperty.call(a, u) || (a[u] = f++, o[u] = !0), l = c + u, Object.prototype.hasOwnProperty.call(a, l)) c = l; else { if (Object.prototype.hasOwnProperty.call(o, c)) { if (c.charCodeAt(0) < 256) { for (n = 0; n < h; n++) g <<= 1, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++; for (i = c.charCodeAt(0), n = 0; n < 8; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } else { for (i = 1, n = 0; n < h; n++) g = g << 1 | i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i = 0; for (i = c.charCodeAt(0), n = 0; n < 16; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } p--, 0 == p && (p = Math.pow(2, h), h++), delete o[c] } else for (i = a[c], n = 0; n < h; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1; p--, 0 == p && (p = Math.pow(2, h), h++), a[l] = f++, c = String(u) } if ("" !== c) { if (Object.prototype.hasOwnProperty.call(o, c)) { if (c.charCodeAt(0) < 256) { for (n = 0; n < h; n++) g <<= 1, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++; for (i = c.charCodeAt(0), n = 0; n < 8; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } else { for (i = 1, n = 0; n < h; n++) g = g << 1 | i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i = 0; for (i = c.charCodeAt(0), n = 0; n < 16; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1 } p--, 0 == p && (p = Math.pow(2, h), h++), delete o[c] } else for (i = a[c], n = 0; n < h; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1; p--, 0 == p && (p = Math.pow(2, h), h++) } for (i = 2, n = 0; n < h; n++) g = g << 1 | 1 & i, m == r - 1 ? (m = 0, d.push(t(g)), g = 0) : m++, i >>= 1; for (;;) { if (g <<= 1, m == r - 1) { d.push(t(g)); break } m++ } return d.join("") } }; return o })();

    function extractFromDesktop() {
        console.log("🖥️ تم اكتشاف وضع الكمبيوتر. بدء الاستخراج...");
        const courseRows = document.querySelectorAll('tr[class^="ROW"]');
        if (courseRows.length === 0) return [];

        const coursesData = [];
        courseRows.forEach(row => {
            const code = row.querySelector('td[data-th="رمز المقرر"]')?.textContent.trim();
            const name = row.querySelector('td[data-th="اسم المقرر"]')?.textContent.trim();
            const section = row.querySelector('td[data-th^="الشعبة"]')?.textContent.trim();
            const instructor = row.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
            const detailsRaw = row.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();

            if (name && code && section) {
                let time = 'غير محدد';
                if (detailsRaw && detailsRaw.includes('@t')) {
                    const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                        const subParts = part.split('@t');
                        if (subParts.length < 2) return null;
                        let dayPart = subParts[0].trim();
                        let timePart = subParts[1].replace(/@r.*$/, '').trim();
                        const dayMapping = {'1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس'};
                        const translatedDays = dayPart.split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                        return `${translatedDays}: ${timePart}`;
                    }).filter(Boolean);
                    if (timeParts.length > 0) time = timeParts.join('<br>');
                } else if (detailsRaw && detailsRaw.trim() !== '') {
                    time = detailsRaw;
                }
                coursesData.push({ code, name, section, time, instructor: instructor || 'غير محدد' });
            }
        });
        return coursesData;
    }

    function extractFromMobile() {
        console.log("📱 تم اكتشاف وضع الجوال. بدء الاستخراج...");
        
        // !!! --- هذا الجزء يحتاج إلى إكمال بعد تحليل كود الجوال --- !!!
        // 1. يجب أن نجد العنصر الرئيسي الذي يحتوي على كل "بطاقات" المقررات
        const courseCards = document.querySelectorAll('.PLACEHOLDER_FOR_MOBILE_COURSE_CARD');
        
        if (courseCards.length === 0) return [];
        console.log(`تم العثور على ${courseCards.length} بطاقة مقرر في وضع الجوال.`);

        const coursesData = [];
        courseCards.forEach(card => {
            // 2. من داخل كل بطاقة، يجب أن نجد العناصر التي تحتوي على البيانات
            // هذه مجرد أمثلة تخمينية لما قد تكون عليه الأسماء
            const code = card.querySelector('.course-code-selector')?.textContent.trim();
            const name = card.querySelector('.course-name-selector')?.textContent.trim();
            const section = card.querySelector('.section-selector')?.textContent.trim();
            
            // البيانات المخفية قد تكون موجودة أيضاً بنفس الطريقة
            const instructor = card.querySelector('input[type="hidden"][id$=":instructor"]')?.value.trim();
            const detailsRaw = card.querySelector('input[type="hidden"][id$=":section"]')?.value.trim();

            // ... سنقوم بتكييف نفس منطق تحليل الوقت هنا ...
            let time = 'غير محدد'; // ...

            coursesData.push({ code, name, section, time, instructor: instructor || 'غير محدد' });
        });
        return coursesData;
    }

    // --- المنطق الرئيسي ---
    setTimeout(function() {
        let courses = [];
        
        // التحقق الذكي: هل نحن في وضع الكمبيوتر؟
        if (document.querySelector('tr[class^="ROW"]')) {
            courses = extractFromDesktop();
        } 
        // تحقق بديل: هل نحن في وضع الجوال؟ (هذا مجرد تخمين الآن)
        // else if (document.querySelector('.PLACEHOLDER_FOR_MOBILE_CONTAINER')) {
        //     courses = extractFromMobile();
        // }
        
        // حل مؤقت: إذا فشل استخراج الكمبيوتر، سنفترض أننا في الجوال ونحاول
        else {
             courses = extractFromMobile();
        }


        if (courses && courses.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${courses.length} مقررًا.`);
            const jsonString = JSON.stringify(courses);
            const compressedData = LZString.compressToEncodedURIComponent(jsonString);
            const viewerURL = `https://mutlaq001.github.io/schedule/?data=${compressedData}`;
            
            console.log("📨 جار التوجيه إلى صفحة العرض مع البيانات...");
            window.open(viewerURL, '_blank');
            
        } else {
            alert("فشل الاستخراج. لم يتم العثور على أي مقررات. تأكد من أن الصفحة محملة بالكامل، أو قد لا يكون وضع الجوال مدعومًا بعد.");
        }

    }, 1500);
})();
