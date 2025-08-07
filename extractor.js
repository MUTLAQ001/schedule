// --- تم ضبط هذه المحددات بناءً على الـ HTML الذي ترسله الجامعات المشابهة ---
const courseRowSelector = 'tr[class^="ROW"]'; 

// --- دوال مساعدة لاستخراج البيانات من داخل الصف ---
function getCourseData(row, dataTh) {
    const cell = row.querySelector(`td[data-th="${dataTh}"]`);
    return cell ? cell.textContent.trim() : null;
}

function getHiddenData(row, idEndsWith) {
    const input = row.querySelector(`input[type="hidden"][id$="${idEndsWith}"]`);
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
        
        const details = getHiddenData(row, ':section');
        const instructor = getHiddenData(row, ':instructor');
        
        let days = 'غير محدد';
        let time = 'غير محدد';
        if (details) {
            const parts = details.split('@t');
            if (parts.length > 1) {
                days = parts[0].trim();
                time = parts[1].replace('@r', '').trim();
            }
        }

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
        
        localStorage.setItem('myUniversityCourses', JSON.stringify(coursesData));
        
        // --- هذا هو السطر الذي تم تحديثه ليعمل مع رابطك ---
        window.open('https://mutlaq001.github.io/schedule/', '_blank');

    } else {
        alert("لم يتم استخراج أي بيانات. قد تكون هناك مشكلة في الصفحة.");
    }
}

// ابدأ التنفيذ
parseCourses();
