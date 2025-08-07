(function() {
    'use strict';

    // المحدد الذي يمثل كل صف مقرر
    const courseRowSelector = 'tr[class^="ROW"]';

    // دوال مساعدة لاستخراج البيانات
    function getCourseData(row, dataTh) {
        const cell = row.querySelector(`td[data-th="${dataTh}"]`);
        return cell ? cell.textContent.trim() : null;
    }

    function getHiddenData(row, idEndsWith) {
        const input = row.querySelector(`input[type="hidden"][id$="${idEndsWith}"]`);
        return input ? input.value.trim() : null;
    }

    // --- بداية البرنامج ---
    console.log("🚀 أداة استخراج المقررات بدأت العمل...");
    const courseRows = document.querySelectorAll(courseRowSelector);
    
    if (courseRows.length === 0) {
        alert("لم يتم العثور على أي مقررات في الصفحة. تأكد من أنك في الصفحة الصحيحة.");
        return;
    }

    const coursesData = [];

    courseRows.forEach(row => {
        // تحديث: تجاهل الصفوف المخفية
        if (row.style.display === 'none') {
            return; // انتقل إلى الصف التالي
        }

        const code = getCourseData(row, 'رمز المقرر');
        const name = getCourseData(row, 'اسم المقرر');
        const section = getCourseData(row, 'الشعبة&nbsp;');
        const instructor = getHiddenData(row, ':instructor');
        const detailsRaw = getHiddenData(row, ':section');

        if (!name || !code || !section) {
            return;
        }

        let time = 'غير محدد';
        
        // تحديث: معالجة الأوقات المتعددة والمفردة
        if (detailsRaw && detailsRaw.includes('@t')) {
            const timeParts = detailsRaw.split(/@n\s*/).map(part => {
                const subParts = part.split('@t');
                if (subParts.length > 1) {
                    let dayPart = subParts[0].trim();
                    let timePart = subParts[1].replace('@r', '').trim();
                    
                    // تحويل أرقام الأيام إلى أسماء عربية
                    const dayMapping = {'1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس'};
                    const translatedDays = dayPart.split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                    
                    return `${translatedDays}: ${timePart}`;
                }
                return null;
            }).filter(Boolean);

            if (timeParts.length > 0) {
                // استخدم <br> للفصل بين الأوقات للعرض في HTML
                time = timeParts.join('<br>'); 
            }
        } else if (detailsRaw && detailsRaw.trim() !== '') {
            time = detailsRaw;
        }

        coursesData.push({
            code,
            name,
            section,
            time,
            instructor: instructor || 'غير محدد'
        });
    });

    if (coursesData.length > 0) {
        console.log(`✅ تم استخراج ${coursesData.length} مقرر بنجاح.`);
        console.log(coursesData);
        
        localStorage.setItem('myUniversityCourses', JSON.stringify(coursesData));
        
        // فتح صفحة العرض
        window.open('https://mutlaq001.github.io/schedule/', '_blank');

    } else {
        alert("لم يتم استخراج أي بيانات. قد تكون هناك مشكلة في الصفحة أو أن جميع المقررات الظاهرة لا تحتوي على البيانات المطلوبة.");
    }
})();
