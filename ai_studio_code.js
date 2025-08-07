(function() {
    'use strict';

    // =========================================================================
    // --- 🔴 هذه هي المنطقة الوحيدة التي تحتاج إلى تعديلها 🔴 ---
    // استبدل هذه المحددات (Selectors) لتطابق بنية صفحة جامعتك بالضبط.
    // يمكنك استخدام اسم الكلاس (مثل '.course-name') أو ترتيب الخلية (مثل 'td:nth-of-type(3)')
    
    // المحدد الذي يمثل كل صف أو عنصر يحتوي على بيانات مقرر واحد
    const courseRowSelector = 'tr.courserow';

    // المحددات الخاصة بكل معلومة تريدها داخل صف المقرر
    const courseNameSelector = 'td:nth-of-type(3)';
    const courseCodeSelector = 'td:nth-of-type(2)';
    const sectionNumberSelector = 'td:nth-of-type(4)';
    const daysSelector = 'td:nth-of-type(7)';
    const timeSelector = 'td:nth-of-type(8)';
    const instructorSelector = 'td:nth-of-type(11)';

    // ضع هنا رابط صفحة العرض (ملف index.html) بعد رفعها على GitHub.
    // مثال: 'https://username.github.io/repo-name/'
    const viewerPageUrl = 'ضع هنا رابط صفحة العرض بعد رفعها';
    // =========================================================================

    function run() {
        if (viewerPageUrl === 'ضع هنا رابط صفحة العرض بعد رفعها') {
            alert("خطأ في الإعداد: الرجاء تعديل ملف extractor.js ووضع رابط صفحة العرض الصحيح.");
            return;
        }

        console.log("🚀 أداة استخراج المقررات بدأت العمل...");
        const courseRows = document.querySelectorAll(courseRowSelector);
        
        if (courseRows.length === 0) {
            alert("❌ لم يتم العثور على أي مقررات في الصفحة.\n\nتأكد من:\n1. أنك في الصفحة الصحيحة (صفحة الجدول أو تسجيل المقررات).\n2. أن المحدد 'courseRowSelector' في الكود صحيح.");
            return;
        }

        const coursesData = Array.from(courseRows).map(row => {
            const getText = (selector) => row.querySelector(selector)?.textContent.trim() || '';
            
            return {
                name: getText(courseNameSelector),
                code: getText(courseCodeSelector),
                section: getText(sectionNumberSelector),
                days: getText(daysSelector),
                time: getText(timeSelector),
                instructor: getText(instructorSelector),
            };
        }).filter(course => course.name && course.code); // تصفية أي صفوف فارغة

        if (coursesData.length > 0) {
            console.log(`✅ تم استخراج ${coursesData.length} مقرر بنجاح.`);
            localStorage.setItem('myUniversityCourses', JSON.stringify(coursesData));
            window.open(viewerPageUrl, '_blank');
        } else {
            alert("لم يتم استخراج أي بيانات. قد تكون هناك مشكلة في محددات العناصر (selectors). راجع الكود.");
        }
    }

    run();
})();