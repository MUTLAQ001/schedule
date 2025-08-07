(function() {
    'use strict';
    console.clear();
    console.log("🚀 أداة الاستخراج الذكية v9 (مزدوجة المنطق) بدأت...");

    function extractFromDesktop() {
        console.log("🖥️ تم اكتشاف وضع الكمبيوتر. بدء الاستخراج...");
        // هنا نضع الكود الحالي الخاص بك بالكامل كما هو
        const courseRows = document.querySelectorAll('tr[class^="ROW"]');
        // ... باقي منطق الاستخراج للكمبيوتر
        return coursesData; 
    }

    function extractFromMobile() {
        console.log("📱 تم اكتشاف وضع الجوال. بدء الاستخراج...");
        // !!! هذا الجزء الذي سأقوم بكتابته بعد أن تزودني بكود الجوال !!!
        // سيبحث عن بطاقات <div> بدلاً من صفوف <tr>
        const courseCards = document.querySelectorAll('.mobile-course-card-selector'); // مثال
        // ... منطق استخراج مخصص لبطاقات الجوال
        return coursesData;
    }

    setTimeout(function() {
        let extractedData = [];
        
        // التحقق الذكي: هل نحن في وضع الكمبيوتر؟
        if (document.querySelector('tr[class^="ROW"]')) {
            extractedData = extractFromDesktop();
        } 
        // إذا لم نكن في وضع الكمبيوتر، فغالباً نحن في وضع الجوال
        else if (document.querySelector('.some-mobile-container-selector')) { // سنحدد هذا بعد تحليل الكود
            extractedData = extractFromMobile();
        }

        if (extractedData.length > 0) {
            console.log(`🎉 نجاح! تم استخراج بيانات ${extractedData.length} مقررًا.`);
            // ... باقي منطق إرسال البيانات إلى صفحة العرض
            const viewerWindow = window.open('https://mutlaq001.github.io/schedule/', '_blank');
            // ... إلخ
        } else {
            alert("فشل الاستخراج. لم يتم العثور على أي مقررات في وضع الكمبيوتر أو الجوال. تأكد من أن الصفحة محملة بالكامل.");
        }

    }, 2000);
})();
