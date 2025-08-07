(function() {
    'use strict';
    console.clear();
    console.log("🚀 أداة الاستخراج الذكية بدأت العمل (نسخة v3)...");
    alert("🔍 جاري البحث عن جدول المقررات، الرجاء الانتظار 3 ثوانٍ...");

    // انتظر 3 ثوانٍ لإعطاء الصفحة فرصة كاملة لتحميل كل شيء، بما في ذلك الإطارات الداخلية
    setTimeout(findAndParseCourses, 3000);

    function findAndParseCourses() {
        const courseRowSelector = 'tr[class^="ROW"]';
        let courseRows = [];
        let searchContext = document; // ابدأ البحث في الصفحة الرئيسية

        // --- محرك البحث الذكي ---
        // 1. ابحث في الصفحة الرئيسية
        courseRows = Array.from(searchContext.querySelectorAll(courseRowSelector));
        console.log(`[بحث في الصفحة الرئيسية]: تم العثور على ${courseRows.length} صف.`);

        // 2. إذا لم تجد شيئًا، ابحث داخل كل <iframe>
        if (courseRows.length === 0) {
            console.log("لم يتم العثور على شيء في الصفحة الرئيسية، جاري البحث داخل الإطارات <iframe>...");
            const frames = document.querySelectorAll('iframe');
            console.log(`تم العثور على ${frames.length} إطار (iframe) في الصفحة.`);

            for (let i = 0; i < frames.length; i++) {
                try {
                    const frameDoc = frames[i].contentDocument || frames[i].contentWindow.document;
                    if (frameDoc) {
                        const rowsInFrame = frameDoc.querySelectorAll(courseRowSelector);
                        console.log(`[بحث في الإطار رقم ${i+1}]: تم العثور على ${rowsInFrame.length} صف.`);
                        if (rowsInFrame.length > 0) {
                            courseRows = Array.from(rowsInFrame);
                            searchContext = frameDoc; // حدد أن هذا هو المكان الصحيح للبحث
                            console.log(`✅ تم تحديد الإطار رقم ${i+1} كمصدر للبيانات!`);
                            break; // اخرج من الحلقة بمجرد العثور على البيانات
                        }
                    }
                } catch (e) {
                    console.error(`لا يمكن الوصول إلى الإطار رقم ${i+1} بسبب سياسة الأمان (cross-origin). هذا طبيعي ومتوقع لبعض الإطارات.`);
                }
            }
        }

        // --- الآن، ابدأ عملية الاستخراج ---
        if (courseRows.length === 0) {
            alert("فشل العثور على جدول المقررات. قد تكون في الصفحة الخطأ، أو أن بنية الصفحة معقدة جدًا. حاول إعادة تحميل الصفحة والضغط على الأداة مرة أخرى.");
            return;
        }

        const coursesData = [];
        courseRows.forEach(row => {
            if (row.style.display === 'none') return;

            const getCellData = (dataTh) => {
                const cell = row.querySelector(`td[data-th="${dataTh}"]`);
                return cell ? cell.textContent.trim() : null;
            };
            const getHiddenInputData = (idEndsWith) => {
                const input = row.querySelector(`input[type="hidden"][id$="${idEndsWith}"]`);
                return input ? input.value.trim() : null;
            };

            const code = getCellData('رمز المقرر');
            const name = getCellData('اسم المقرر');
            const section = getCellData('الشعبة&nbsp;');
            const instructor = getHiddenInputData(':instructor');
            const detailsRaw = getHiddenInputData(':section');

            if (!name || !code || !section) return;

            let time = 'غير محدد';
            if (detailsRaw && detailsRaw.includes('@t')) {
                const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                    const subParts = part.split('@t');
                    if (subParts.length > 1) {
                        const dayPart = subParts[0].trim();
                        const timePart = subParts[1].replace('@r', '').trim();
                        const dayMapping = {'1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس'};
                        const translatedDays = dayPart.split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                        return `${translatedDays}: ${timePart}`;
                    }
                    return null;
                }).filter(Boolean);
                if (timeParts.length > 0) time = timeParts.join('<br>');
            } else if (detailsRaw && detailsRaw.trim() !== '') {
                time = detailsRaw;
            }

            coursesData.push({ code, name, section, time, instructor: instructor || 'غير محدد' });
        });

        if (coursesData.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${coursesData.length} مقررًا.`);
            localStorage.setItem('myUniversityCourses', JSON.stringify(coursesData));
            window.open('https://mutlaq001.github.io/schedule/', '_blank');
        } else {
            alert("لم يتم استخراج أي بيانات بنجاح من الصفوف الظاهرة. تأكد من أن الجدول محمل بالكامل.");
        }
    }
})();
