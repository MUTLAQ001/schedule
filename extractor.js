(function() {
    'use strict';
    console.clear(); // مسح الـ Console لبداية نظيفة
    console.log("🚀 أداة التشخيص المتقدمة بدأت...");

    // انتظر قليلاً (2 ثانية) لإعطاء الصفحة فرصة لتحميل المحتوى الديناميكي
    setTimeout(function() {
        console.log("🔍 جاري البحث عن صفوف المقررات بعد ثانيتين...");

        const courseRowSelector = 'tr[class^="ROW"]';
        const courseRows = document.querySelectorAll(courseRowSelector);
        
        console.log(`🔎 تم العثور على ${courseRows.length} صفًا يطابق المحدد '${courseRowSelector}'.`);

        if (courseRows.length === 0) {
            alert(`لم يتم العثور على أي صفوف للمقررات. \n\nجرّب الانتظار حتى يتم تحميل الصفحة بالكامل ثم اضغط على الأداة مرة أخرى. إذا استمرت المشكلة، قد يكون الجدول داخل <iframe>.`);
            return;
        }

        const coursesData = [];
        console.log("-----------------------------------------");
        console.log("🕵️‍♂️ بدء عملية تحليل كل صف...");

        courseRows.forEach((row, index) => {
            // تجاهل الصفوف المخفية
            if (row.style.display === 'none') {
                console.log(`⏩ [صف رقم ${index + 1}] تم تجاهله لأنه مخفي (style="display: none;").`);
                return;
            }

            console.log(`\n📄 [تحليل صف رقم ${index + 1}]`);

            function getCourseData(dataTh) {
                const cell = row.querySelector(`td[data-th="${dataTh}"]`);
                const value = cell ? cell.textContent.trim() : "❌ لم يُعثر عليه";
                console.log(`   - ${dataTh}: ${value}`);
                return cell ? cell.textContent.trim() : null;
            }
            
            function getHiddenData(idEndsWith) {
                const input = row.querySelector(`input[type="hidden"][id$="${idEndsWith}"]`);
                const value = input ? input.value.trim() : "❌ لم يُعثر عليه";
                console.log(`   - الحقل المخفي [${idEndsWith}]: ${value}`);
                return input ? input.value.trim() : null;
            }

            const code = getCourseData('رمز المقرر');
            const name = getCourseData('اسم المقرر');
            const section = getCourseData('الشعبة&nbsp;');
            const instructor = getHiddenData(':instructor');
            const detailsRaw = getHiddenData(':section');

            if (name && code && section) {
                coursesData.push({ name, code, section, instructor, detailsRaw });
                console.log("   ✅ تم استخراج البيانات الأساسية بنجاح من هذا الصف.");
            } else {
                console.log("   ❌ فشل استخراج البيانات الأساسية من هذا الصف. سيتم تجاهله.");
            }
        });

        console.log("-----------------------------------------");
        
        if (coursesData.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${coursesData.length} مقررًا. جاري فتح صفحة العرض...`);
            
            // معالجة البيانات النهائية قبل إرسالها
            const finalData = coursesData.map(course => {
                let time = 'غير محدد';
                if (course.detailsRaw && course.detailsRaw.includes('@t')) {
                    const timeParts = course.detailsRaw.split(/@n\s*/).map(part => {
                        const subParts = part.split('@t');
                        if (subParts.length > 1) {
                            let dayPart = subParts[0].trim();
                            let timePart = subParts[1].replace('@r', '').trim();
                            const dayMapping = {'1': 'الأحد', '2': 'الاثنين', '3': 'الثلاثاء', '4': 'الأربعاء', '5': 'الخميس'};
                            const translatedDays = dayPart.split(/\s+/).map(d => dayMapping[d] || d).join(' ');
                            return `${translatedDays}: ${timePart}`;
                        }
                        return null;
                    }).filter(Boolean);
                    if (timeParts.length > 0) { time = timeParts.join('<br>'); }
                } else if (course.detailsRaw && course.detailsRaw.trim() !== '') {
                    time = course.detailsRaw;
                }
                
                return {
                    code: course.code,
                    name: course.name,
                    section: course.section,
                    time,
                    instructor: course.instructor || 'غير محدد'
                };
            });

            localStorage.setItem('myUniversityCourses', JSON.stringify(finalData));
            window.open('https://mutlaq001.github.io/schedule/', '_blank');
        } else {
            alert("لم يتم استخراج أي بيانات بنجاح من الصفوف الظاهرة. تحقق من نافذة الـ Console (F12) لرؤية تقرير التشخيص.");
        }

    }, 2000); // انتظر 2000 ملي ثانية = 2 ثانية
})();
