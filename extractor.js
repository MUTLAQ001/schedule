// --- تم ضبط هذه المحددات بناءً على الـ HTML الذي أرسلته ---
// المحدد الذي يمثل كل صف مقرر (يستهدف الصفوف التي تبدأ بـ class="ROW")
const courseRowSelector = 'tr[class^="ROW"]'; 

// --- دوال مساعدة لاستخراج البيانات من داخل الصف ---
function getCourseData(row, dataTh) {
    // نبحث عن الخلية التي لها السمة data-th المطابقة
    const cell = row.querySelector(`td[data-th="${dataTh}"]`);
    // نرجع النص الموجود داخلها بعد تنظيفه من الفراغات
    return cell ? cell.textContent.trim() : null;
}

function getHiddenData(row, idEndsWith) {
    // نبحث عن حقل الإدخال المخفي الذي ينتهي بـ id معين
    const input = row.querySelector(`input[type="hidden"][id$="${idEndsWith}"]`);
    // نرجع القيمة الموجودة فيه
    return input ? input.value : null;
}

function parseCourses() {
    console.log("🚀 أداة استخراج المقررات بدأت العمل...");
    const courseRows = document.querySelectorAll(courseRowSelector);
    
    if (courseRows.length === 0) {
        alert("لم يتم العثور على أي مقررات في الصفحة. تأكد من أنك في الصفحة الصحيحة.");
        return;
    }

    const coursesData = [];

    courseRows.forEach(row => {
        const code = getCourseData(row, 'رمز المقرر');
        const name = getCourseData(row, 'اسم المقرر');
        const section = getCourseData(row, 'الشعبة&nbsp;');
        
        // استخراج البيانات المخفية
        const details = getHiddenData(row, ':section'); // مثال للقيمة: " 4 @t 10:00 ص - 11:40 ص @r "
        const instructor = getHiddenData(row, ':instructor');
        
        // تنظيف ومعالجة بيانات الأيام والوقت
        let days = 'غير محدد';
        let time = 'غير محدد';
        if (details) {
            // سنقوم بتقسيم النص بناءً على الرمز "@t"
            const parts = details.split('@t');
            if (parts.length > 1) {
                // الجزء الأول للأيام، والثاني للوقت
                days = parts[0].trim();
                time = parts[1].replace('@r', '').trim();
            }
        }

        // تأكد من وجود بيانات أساسية قبل إضافتها
        if (name && code && section) {
            coursesData.push({
                code,
                name,
                section,
                days,
                time,
                instructor: instructor ? instructor.trim() : 'غير محدد'
            });
        }
    });

    if (coursesData.length > 0) {
        console.log(`✅ تم استخراج ${coursesData.length} مقرر بنجاح.`);
        console.log(coursesData);
        
        // حفظ البيانات في التخزين المؤقت للمتصفح لنقلها للصفحة التالية
        localStorage.setItem('myUniversityCourses', JSON.stringify(coursesData));
        
        // افتح صفحة العرض في نافذة جديدة
        window.open('ضع هنا رابط صفحة العرض بعد رفعها', '_blank');

    } else {
        alert("لم يتم استخراج أي بيانات. قد تكون هناك مشكلة في الصفحة.");
    }
}

// ابدأ التنفيذ
parseCourses();
