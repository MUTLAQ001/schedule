(function() {
    'use strict';

    // =========================================================================
    // --- 🔴 تم تحديث هذه المنطقة خصيصاً لتناسب بوابة جامعة القصيم 🔴 ---
    
    // 1. رابط صفحة العرض الخاص بك (تم وضعه تلقائياً)
    const VIEWER_PAGE_URL = 'https://mutlaq001.github.io/schedule/';

    // 2. تم وضع النطاق الصحيح لجامعة القصيم
    const VALID_DOMAINS = [
        'stu-gate.qu.edu.sa'
    ];

    // 3. المحددات (Selectors) الصحيحة لصفحة "المقررات المطروحة" بجامعة القصيم
    const courseRowSelector = '.rich-table-row'; // المحدد الصحيح لصفوف المقررات
    
    // تم تصحيح ترتيب الأعمدة بناءً على هيكل الموقع
    const courseCodeSelector = 'td:nth-of-type(1)';      // العمود الأول: رمز المقرر
    const courseNameSelector = 'td:nth-of-type(2)';      // العمود الثاني: اسم المقرر
    const sectionNumberSelector = 'td:nth-of-type(4)';   // العمود الرابع: رقم الشعبة
    
    // ملاحظة: الأيام والوقت والمحاضر غير موجودة في هذه الصفحة، لذا ستكون فارغة.
    const daysSelector = 'td:nth-of-type(99)'; // رقم وهمي ليبقى الحقل فارغاً
    const timeSelector = 'td:nth-of-type(99)'; // رقم وهمي ليبقى الحقل فارغاً
    const instructorSelector = 'td:nth-of-type(99)'; // رقم وهمي ليبقى الحقل فارغاً
    // =========================================================================


    // --- بقية الكود يعمل كما هو (لا تحتاج لتعديله) ---

    function createOverlay(innerHTML) {
        const overlay = document.createElement('div');
        overlay.id = 'my-tool-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8); z-index: 999999; display: flex;
            align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            direction: rtl;
        `;
        overlay.innerHTML = innerHTML;
        document.body.appendChild(overlay);
        return overlay;
    }

    function removeOverlay() {
        const overlay = document.getElementById('my-tool-overlay');
        if (overlay) overlay.remove();
    }
    
    function showLoading() {
        const loadingHTML = `
            <div style="text-align: center; background: white; padding: 30px; border-radius: 10px; color: #333; min-width: 300px;">
                <div style="font-size: 18px; margin-bottom: 15px;">🎓 أداة جدولي</div>
                <div style="font-size: 14px; margin-bottom: 20px;">جاري استخراج بيانات المقررات...</div>
                <div style="width: 100%; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                    <div id="my-progress-bar" style="width: 0%; height: 4px; background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        createOverlay(loadingHTML);
    }
    
    function updateProgress(percent) {
        const progressBar = document.getElementById('my-progress-bar');
        if (progressBar) progressBar.style.width = percent + '%';
    }

    function showError(message) {
        const errorHTML = `
            <div style="text-align: center; background: white; padding: 30px; border-radius: 10px; color: #333; min-width: 300px;">
                <div style="font-size: 18px; margin-bottom: 15px;">❌ خطأ</div>
                <div style="font-size: 14px; margin-bottom: 20px; color: #e74c3c;">${message}</div>
                <button onclick="document.getElementById('my-tool-overlay').remove()"
                        style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    إغلاق
                </button>
            </div>
        `;
        const overlay = document.getElementById('my-tool-overlay');
        if(overlay) overlay.innerHTML = errorHTML; else createOverlay(errorHTML);
    }

    function isValidPage() {
        const hostname = window.location.hostname.toLowerCase();
        return VALID_DOMAINS.some(domain => hostname.includes(domain));
    }
    
    function startExtraction() {
        try {
            showLoading();
            updateProgress(20);

            const courseRows = document.querySelectorAll(courseRowSelector);
            
            if (courseRows.length === 0) {
                throw new Error("لم يتم العثور على أي مقررات. تأكد من أنك في صفحة 'المقررات المطروحة' وأن الجدول معروض أمامك.");
            }
            updateProgress(50);

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
            }).filter(course => course.name && course.code);

            if (coursesData.length === 0) {
                throw new Error("تم العثور على هيكل الجدول ولكن لم يتم استخراج بيانات. قد يكون هناك تحديث على تصميم الموقع.");
            }
            
            updateProgress(80);
            localStorage.setItem('myUniversityCourses', JSON.stringify(coursesData));
            updateProgress(100);

            setTimeout(() => {
                window.open(VIEWER_PAGE_URL, '_blank');
                removeOverlay();
            }, 500);

        } catch (error) {
            console.error('Extraction Error:', error);
            showError(error.message || 'حدث خطأ غير متوقع.');
        }
    }
    
    if (!isValidPage()) {
        const currentDomain = window.location.hostname;
        let errorMessage = '⚠️ هذه الأداة تعمل فقط على بوابة جامعة القصيم!\n\n' +
                           '📍 الموقع الحالي: ' + currentDomain;
        alert(errorMessage);
        return;
    }

    const termsHTML = `
        <div style="background: white; border-radius: 15px; max-width: 450px; width: 90%; color: #333; padding: 25px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 22px; margin-bottom: 10px;">🎓 أداة جدولي (جامعة القصيم)</div>
                <div style="font-size: 16px; color: #667eea; font-weight: 600;">استخراج المقررات المطروحة</div>
            </div>
            <p style="font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 25px;">
                ستقوم الأداة بقراءة المقررات المعروضة في هذه الصفحة وفتحها في جدول جديد.
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="tool-accept" style="background: #4caf50; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                    موافق ومتابعة
                </button>
                <button id="tool-decline" style="background: #e74c3c; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                    إلغاء
                </button>
            </div>
        </div>
    `;
    createOverlay(termsHTML);
    document.getElementById('tool-accept').onclick = () => { removeOverlay(); startExtraction(); };
    document.getElementById('tool-decline').onclick = () => { removeOverlay(); };
})();
