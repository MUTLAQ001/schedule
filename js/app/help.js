Object.assign(QU_ScheduleApp, {
        _guideClips() {
          return [
            { id: 'mobile', icon: 'ph-device-mobile', label: 'جوال', file: 'guide-mobile.mp4', ratio: '592 / 1200', portrait: true, title: 'التثبيت على الجوال', desc: 'انسخ الكود، افتح صفحة المقررات المطروحة، ثم الصقه في شريط العنوان.' },
            { id: 'tablet', icon: 'ph-device-tablet', label: 'جهاز لوحي', file: 'guide-tablet.mp4', ratio: '1920 / 1216', portrait: false, title: 'التثبيت على الجهاز اللوحي', desc: 'الصفحة تفتح بشكل الكمبيوتر، فانسخ الكود من زر «للوحيات» ثم الصقه في شريط العنوان.' },
            { id: 'desktop', icon: 'ph-desktop', label: 'كمبيوتر', file: 'guide-desktop.mp4', ratio: '2874 / 1798', portrait: false, title: 'التثبيت على الكمبيوتر', desc: 'اسحب زر QU Schedule إلى شريط الإشارات المرجعية، ثم اضغطه داخل صفحة المقررات المطروحة.' }
          ];
        },
        _guessDevice() {
          const isTouch = window.matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window) || window.innerWidth < 760;
          if (!isTouch) return 'desktop';
          return Math.min(window.innerWidth, window.innerHeight) >= 600 ? 'tablet' : 'mobile';
        },
        _showGuideModal(preferred) {
          const clips = this._guideClips();
          const active = clips.some(c => c.id === preferred) ? preferred : this._guessDevice();
          const tabs = clips.map(c => `<button type="button" class="guide-tab${c.id === active ? ' active' : ''}" data-clip="${c.id}"><i class="ph ${c.icon}"></i><span>${c.label}</span></button>`).join('');
          const html = `<div id="guide-modal-content">
  <div class="guide-tabs" role="tablist">${tabs}</div>
  <div class="guide-stage" id="guide-stage">
    <video id="guide-video" controls playsinline preload="metadata" controlsList="nodownload" disablepictureinpicture></video>
  </div>
  <div class="guide-caption"><div class="gc-title" id="guide-title"></div><div class="gc-desc" id="guide-desc"></div></div>
  ${this._supportContactHTML('إذا واجهتك مشكلة')}
</div>`;
          Swal.fire({
            title: 'مقاطع الشرح', html, confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup wide-swal guide-swal' },
            didOpen: (popup) => {
              const video = popup.querySelector('#guide-video');
              const stage = popup.querySelector('#guide-stage');
              const titleEl = popup.querySelector('#guide-title');
              const descEl = popup.querySelector('#guide-desc');
              const select = (id) => {
                const clip = clips.find(c => c.id === id) || clips[0];
                popup.querySelectorAll('.guide-tab').forEach(b => b.classList.toggle('active', b.dataset.clip === clip.id));
                video.pause();
                video.style.aspectRatio = clip.ratio;
                stage.classList.toggle('portrait', clip.portrait);
                video.src = `${clip.file}#t=0.1`;
                video.load();
                titleEl.textContent = clip.title;
                descEl.textContent = clip.desc;
              };
              popup.querySelectorAll('.guide-tab').forEach(btn => btn.addEventListener('click', () => select(btn.dataset.clip)));
              video.addEventListener('error', () => { stage.classList.add('failed'); });
              video.addEventListener('loadeddata', () => { stage.classList.remove('failed'); });
              select(active);
            },
            willClose: (popup) => { const v = popup.querySelector('#guide-video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); } }
          });
        },
        _supportContactHTML(line) {
          return `<div class="guide-contact">
  <span class="gct-icon"><i class="ph-fill ph-question"></i></span>
  <div class="gct-body"><div class="gct-line">${line}</div><div class="gct-note">لا تنسَ ذكر نوع جهازك والمتصفح ليسهل حل المشكلة.</div></div>
  <a class="gct-btn" href="https://t.me/Mutlaq_ai_bot" target="_blank" rel="noopener noreferrer"><i class="ph ph-telegram-logo"></i> للتواصل</a>
</div>`;
        },
        _chromeLogoSVG() {
          return `<svg class="brand-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#4caf50" d="M44,24c0,11.044-8.956,20-20,20S4,35.044,4,24S12.956,4,24,4S44,12.956,44,24z"/><path fill="#ffc107" d="M24,4v20l8,4l-8.843,16C23.438,43.994,23.718,44,24,44c11.046,0,20-8.954,20-20S35.046,4,24,4z"/><path fill="#f44336" d="M41.84,15H24v13l-3-1L7.16,13.26H7.14C10.68,7.69,16.91,4,24,4C31.8,4,38.55,8.48,41.84,15z"/><path fill="#dd2c00" d="M7.158,13.264l8.843,14.862L21,27L7.158,13.264z"/><path fill="#558b2f" d="M23.157,44l8.934-16.059L28,25L23.157,44z"/><path fill="#f9a825" d="M41.865,15H24l-1.579,4.58L41.865,15z"/><path fill="#fff" d="M33,24c0,4.969-4.031,9-9,9s-9-4.031-9-9s4.031-9,9-9S33,19.031,33,24z"/><path fill="#2196f3" d="M31,24c0,3.867-3.133,7-7,7s-7-3.133-7-7s3.133-7,7-7S31,20.133,31,24z"/></svg>`;
        },
        _browserSupportHTML(device) {
          const isDesk = device === 'desktop';
          const rows = [
            { ok: false, name: 'Safari', note: isDesk ? 'المتصفح الافتراضي في الماك' : 'متصفح آيفون / آيباد', ico: `<i class="ph-fill ph-compass"></i>` },
            { ok: false, name: 'Edge', note: isDesk ? 'المتصفح الافتراضي في ويندوز' : 'متصفح مايكروسوفت', ico: `<i class="ph ph-globe-hemisphere-west"></i>` },
            { ok: false, name: isDesk ? 'بحث Google' : 'تطبيق Google', note: isDesk ? 'محرك البحث نفسه' : 'صفحة البحث داخل التطبيق', ico: `<i class="ph ph-google-logo"></i>` },
            { ok: true, name: 'Chrome', note: 'المتصفح المطلوب', ico: this._chromeLogoSVG() }
          ].map(b => `<div class="bs-item ${b.ok ? 'good' : 'bad'}"><span class="bs-ico">${b.ico}</span><span class="bs-body"><span class="bs-name">${b.name}</span><span class="bs-note">${b.note}</span></span><span class="bs-state"><i class="ph-fill ${b.ok ? 'ph-check-circle' : 'ph-x-circle'}"></i> ${b.ok ? 'تعمل' : 'لا تعمل'}</span></div>`).join('');
          const foot = isDesk
            ? 'سفاري هو المتصفح الافتراضي في الماك، و<b>Edge</b> هو الافتراضي في ويندوز — نزّل <b>Chrome</b> وافتح فيه صفحة المقررات المطروحة قبل ما تسحب الزر.'
            : 'لو فتحت الموقع من رابط داخل تويتر أو واتساب، اضغط قائمة (⋯) واختر <b>«فتح في Chrome»</b>.';
          return `<details class="issue-alert">
  <summary class="ia-head">
    <span class="ia-badge"><i class="ph-fill ph-warning"></i></span>
    <span class="ia-headings">
      <span class="ia-title">تنبيه مهم جداً</span>
      <span class="ia-sub">الأداة تعمل على متصفح <b>Chrome</b> — وما تشتغل على غيره</span>
    </span>
    <span class="ia-brand">${this._chromeLogoSVG()}</span>
    <i class="ph ph-caret-down ia-caret"></i>
  </summary>
  <div class="ia-content">
    <p class="ia-body">إذا فتحت صفحة المقررات المطروحة من متصفح <b>Safari</b> أو <b>Edge</b> أو من داخل <b>${isDesk ? 'بحث Google' : 'تطبيق Google'}</b> (محرك البحث)، فالكود ما راح يشتغل ولا راح تنتقل مقرراتك. افتح الرابط في <b>Chrome</b> وأعد المحاولة من البداية.</p>
    <div class="ia-browsers">${rows}</div>
    <div class="ia-msg"><span class="iam-tag"><i class="ph-fill ph-x-circle"></i> الرسالة اللي تطلع لك</span><span class="iam-title">لا يمكن / يتعذر تشغيل البرنامج النصي</span><span class="iam-text">يتعذر على <b>Safari</b> — أو <b>Edge</b> — تشغيل البرنامج النصي لأنه غير مسموح باستخدام JavaScript بهذه الطريقة.</span></div>
    <p class="ia-body">إذا شفت هذي الرسالة فأنت في <b>سفاري أو Edge</b> — ما فيه إعداد تقدر تغيّره عشان تشتغل، الحل الوحيد إنك تفتح الصفحة في <b>Chrome</b>.</p>${isDesk ? '' : this._issueShotHTML('issue-safari-mobile.jpg', 'الرسالة في متصفح Safari') + this._issueShotHTML('issue-edge-mobile.jpg', 'ونفس الرسالة في متصفح Edge')}
    <div class="ia-foot"><i class="ph ph-info"></i> <span>${foot}</span></div>
  </div>
</details>`;
        },
        _openImageLightbox(src, caption) {
          document.getElementById('img-lightbox')?.remove();
          const box = document.createElement('div');
          box.id = 'img-lightbox';
          box.className = 'img-lightbox';
          box.innerHTML = `<button type="button" class="ilb-close" aria-label="إغلاق"><i class="ph ph-x"></i></button><img src="${src}" alt="${caption || ''}">${caption ? `<div class="ilb-cap">${caption}</div>` : ''}`;
          const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
          const close = () => {
            document.removeEventListener('keydown', onKey, true);
            box.classList.remove('open');
            setTimeout(() => box.remove(), 200);
          };
          box.addEventListener('click', close);
          document.addEventListener('keydown', onKey, true);
          document.body.appendChild(box);
          requestAnimationFrame(() => box.classList.add('open'));
        },
        _addressBarCompareHTML() {
          const code = this._bookmarkletCode();
          const pageUrl = `https://stu-gate.qu.edu.sa/qu/ui/student/offeredCourses/index/offeredCoursesIndex.faces`;
          return `<div class="fix-rows">
  <div class="fix-row bad">
    <span class="fx-tag"><i class="ph-fill ph-x-circle"></i> هذا اللي يصير عندك</span>
    <div class="fx-bar" dir="ltr"><i class="ph ph-globe-simple"></i><span class="fx-text"><span class="fx-code">${code}</span><span class="fx-extra">${pageUrl}</span></span></div>
    <div class="fx-note"><i class="ph ph-arrow-bend-down-left"></i> رابط الصفحة باقٍ بعد الكود — هذا سبب المشكلة</div>
  </div>
  <div class="fix-row good">
    <span class="fx-tag"><i class="ph-fill ph-check-circle"></i> المفروض يكون كذا</span>
    <div class="fx-bar" dir="ltr"><i class="ph ph-globe-simple"></i><span class="fx-text"><span class="fx-code">${code}</span></span></div>
    <div class="fx-note"><i class="ph ph-check"></i> الكود لحاله، ما بعده ولا حرف</div>
  </div>
</div>`;
        },
        _suggestChoiceHTML() {
          return `<div class="choice-rows">
  <div class="bs-item good"><span class="bs-ico"><i class="ph ph-globe-simple"></i></span><span class="bs-body"><span class="bs-name">فتح العنوان مباشرة</span><span class="bs-note">الخيار اللي فيه أيقونة الكوكب</span></span><span class="bs-state"><i class="ph-fill ph-check-circle"></i> اضغط هذا</span></div>
  <div class="bs-item bad"><span class="bs-ico"><i class="ph ph-magnifying-glass"></i></span><span class="bs-body"><span class="bs-name">انتقال — بحث في Google</span><span class="bs-note">الخيار اللي فيه أيقونة العدسة</span></span><span class="bs-state"><i class="ph-fill ph-x-circle"></i> لا تضغطه</span></div>
</div>`;
        },
        _jsPrefixCompareHTML() {
          const body = this._bookmarkletCode().replace(/^javascript:/, '');
          return `<div class="fix-rows">
  <div class="fix-row bad">
    <span class="fx-tag"><i class="ph-fill ph-x-circle"></i> هذا اللي يصير عندك</span>
    <div class="fx-bar" dir="ltr"><i class="ph ph-magnifying-glass"></i><span class="fx-text"><span class="fx-gap">javascript:</span><span class="fx-code">${body}</span></span></div>
    <div class="fx-note"><i class="ph ph-arrow-bend-down-left"></i> المتصفح حذف <b>javascript:</b> فصار الكود مجرد نص — ويوديك لنتائج بحث Google</div>
  </div>
  <div class="fix-row good">
    <span class="fx-tag"><i class="ph-fill ph-check-circle"></i> المفروض يكون كذا</span>
    <div class="fx-bar" dir="ltr"><i class="ph ph-globe-simple"></i><span class="fx-text"><span class="fx-need">javascript:</span><span class="fx-code">${body}</span></span></div>
    <div class="fx-note"><i class="ph ph-check"></i> <b>javascript:</b> مكتوبة في البداية ومعها النقطتان الرأسيتان</div>
  </div>
</div>`;
        },
        _issueShotHTML(src, caption, ratio) {
          const crop = ratio ? ' crop' : '';
          const style = ratio ? ` style="aspect-ratio:${ratio}"` : '';
          return `<figure class="ic-shot${crop}" hidden>
  <button type="button" class="ics-btn" aria-label="تكبير الصورة"><img src="${src}" alt="${caption}" decoding="async"${style}><span class="ics-zoom"><i class="ph ph-magnifying-glass-plus"></i> اضغط للتكبير</span></button>
  <figcaption>${caption} — اضغط الصورة لعرضها كاملة</figcaption>
</figure>`;
        },
        _commonIssues() {
          const pasteUrl = {
            icon: 'ph-link-break',
            title: 'لصقت الكود ومعه رابط الصفحة',
            body: `<p>لما تلصق الكود في شريط العنوان، أحياناً <b>ما ينمسح رابط الصفحة القديم</b> فيصير الكود ملصوقاً بعده. المتصفح هنا ما يفهم الأمر، فما ينقلك للأداة ولا ينتقل شيء — <b>تبقى بنفس الصفحة اللي أنت فيها</b> وكأن ما صار شيء.</p>${this._addressBarCompareHTML()}${this._issueShotHTML('issue-url-mobile.jpg', 'مثال من جهاز فعلي — لاحظ رابط الصفحة الظاهر بعد الكود', '589 / 400')}<div class="ic-fix"><span class="icf-badge"><i class="ph-fill ph-wrench"></i> الحل</span><span>امسح رابط الصفحة اللي بعد الكود (اضغط مطولاً في شريط العنوان ← <b>تحديد الكل</b> ثم الصق من جديد، أو امسحه بزر الحذف)، وخلّ <b>الكود لحاله فقط</b>، وبعدها اضغط على الخيار اللي فيه <b>أيقونة الكوكب</b> وبتشتغل معك.</span></div>`
          };
          const popupBlocked = {
            icon: 'ph-browser',
            title: 'طلعت لك «تم حظر النوافذ المنبثقة»',
            body: `<p>الأداة تفتح QU Schedule في نافذة جديدة، والمتصفح أحياناً يحظرها. وقتها تطلع لك رسالة <b>«فشل فتح نافذة العارض — الرجاء السماح بالنوافذ المنبثقة (Pop-ups) لهذا الموقع»</b>، وفوق عند شريط العنوان يظهر تنبيه <b>«تم حظر النوافذ المنبثقة»</b> ومعه زر <b>«الإظهار دائمًا»</b>.</p><div class="pop-bar" aria-hidden="true"><span class="pb-ico"><i class="ph ph-browser"></i></span><span class="pb-text">تم حظر النوافذ المنبثقة (1)</span><span class="pb-btn">الإظهار دائمًا</span></div><p class="pop-hint"><i class="ph ph-hand-tap"></i> هذا هو الزر اللي تضغطه</p>${this._issueShotHTML('issue-popup-mobile.jpg', 'رسالة حظر النوافذ المنبثقة كما تظهر على الجوال')}<div class="ic-steps"><div class="ics-row"><span class="icsr-num">1</span><span>اضغط <b>«الإظهار دائمًا»</b> في التنبيه اللي فوق.</span></div><div class="ics-row"><span class="icsr-num">2</span><span>راح ينقلك للأداة، لكن <b>بدون مقرراتك في المرة الأولى</b> — وهذا طبيعي ولا يعني إن فيه خطأ.</span></div><div class="ics-row"><span class="icsr-num">3</span><span>ارجع لصفحة المقررات المطروحة و<b>أعد الخطوة مرة ثانية</b> (الصق الكود من جديد) — وهالمرة بتنتقل مقرراتك معك.</span></div></div>`
          };
          const bookmarksBar = {
            icon: 'ph-bookmarks-simple',
            title: 'ما يظهر عندي شريط الإشارات المرجعية',
            body: `<p>عشان تسحب زر <b>QU Schedule</b> لازم يكون <b>شريط الإشارات المرجعية</b> (Bookmarks bar) ظاهراً فوق في المتصفح — وأغلب المتصفحات تخفيه افتراضياً. أظهره بهذا الاختصار، وبعدها اسحب الزر:</p><div class="kb-rows"><div class="kb-row"><span class="kb-os"><i class="ph ph-windows-logo"></i> ويندوز</span><span class="kb-keys"><span class="kbd">Ctrl</span><b>+</b><span class="kbd">Shift</span><b>+</b><span class="kbd">B</span></span></div><div class="kb-row"><span class="kb-os"><i class="ph ph-apple-logo"></i> ماك</span><span class="kb-keys"><span class="kbd">⌘</span><b>+</b><span class="kbd">Shift</span><b>+</b><span class="kbd">B</span></span></div></div><div class="ic-fix"><span class="icf-badge"><i class="ph-fill ph-info"></i> ملاحظة</span><span>نفس الاختصار يخفي الشريط مرة ثانية. وإذا ما ضبط معك، افتح قائمة المتصفح ← <b>عرض (View)</b> ← <b>إظهار شريط الإشارات المرجعية</b>.</span></div>`
          };
          const jsPrefix = {
            icon: 'ph-magnifying-glass',
            title: 'راح بك لبحث Google بدل الأداة',
            body: `<p>أغلب المتصفحات <b>تحذف كلمة <span dir="ltr">javascript:</span> تلقائياً</b> وقت اللصق — حماية منها. فيصير اللي لصقته مجرد نص عادي، والمتصفح يعتبره كلمة بحث ويوديك لصفحة <b>نتائج بحث Google</b> بدل ما يشغّل الأداة.</p>${this._jsPrefixCompareHTML()}${this._issueShotHTML('issue-jsprefix-mobile.jpg', 'المتصفح ودّاك لبحث Google لأن javascript: انحذفت')}<div class="ic-fix"><span class="icf-badge"><i class="ph-fill ph-wrench"></i> الحل</span><span>بعد ما تلصق الكود، روح <b>لبداية السطر</b> واكتب <b><span dir="ltr">javascript:</span></b> بيدك — ولا تنسَ <b>النقطتين الرأسيتين ( : )</b> في آخرها — وبعدها اضغط على الخيار اللي فيه <b>أيقونة الكوكب</b>.</span></div>${this._suggestChoiceHTML()}<p class="pop-hint"><i class="ph ph-warning-circle"></i> خيار «انتقال» اللي فيه أيقونة العدسة راح يوديك لبحث Google ولن ينقل مقرراتك</p>`
          };
          const noData = (device) => ({
            icon: 'ph-calendar-x',
            title: 'طلعت لك «فشل استخراج البيانات»',
            body: `<p>هذي الرسالة معناها إن الأداة اشتغلت تمام، لكن <b>ما لقت جدول مقررات تقرأه في الصفحة</b>. وأغلب الأحيان السبب إنك محدد <b>فصلاً دراسياً ماضياً</b> أو فصلاً <b>ما فيه مقررات مطروحة</b>.</p><div class="ia-msg"><span class="iam-tag"><i class="ph-fill ph-x-circle"></i> الرسالة اللي تطلع لك</span><span class="iam-title">فشل استخراج البيانات</span><span class="iam-text">لم يتم العثور على بيانات يمكن قراءتها في الجدول.<br>أو: لم يتم العثور على أي مقررات — تأكد من أنك في صفحة «المقررات المطروحة» بعد أن تقوم بالبحث.</span></div>${device === 'desktop' ? '' : this._issueShotHTML('issue-nodata-mobile.jpg', 'رسالة «فشل استخراج البيانات» كما تظهر على الجوال')}<div class="ic-steps"><div class="ics-row"><span class="icsr-num">1</span><span>تأكد إنك داخل صفحة <b>«المقررات المطروحة وفق الخطة»</b> — مو الصفحة الرئيسية للبوابة ولا أي صفحة ثانية.</span></div><div class="ics-row"><span class="icsr-num">2</span><span>من قائمة الفصل الدراسي، اختر <b>الفصل الحالي</b> اللي فيه مقررات مطروحة — لا تختار فصلاً ماضياً.</span></div><div class="ics-row"><span class="icsr-num">3</span><span>وبعدها شغّل الأداة من جديد — وبتنتقل مقرراتك.</span></div></div><div class="ic-fix"><span class="icf-badge"><i class="ph-fill ph-info"></i> ملاحظة</span><span>إذا الجدول ظاهر عندك وفيه مقررات ومع ذلك تطلع نفس الرسالة، تواصل معنا وأرفق نوع جهازك والمتصفح.</span></div>`
          });
          return {
            mobile: [{ kind: 'browsers' }, pasteUrl, jsPrefix, popupBlocked, noData('mobile')],
            tablet: [{ kind: 'browsers' }, pasteUrl, jsPrefix, popupBlocked, noData('tablet')],
            desktop: [{ kind: 'browsers' }, bookmarksBar, noData('desktop')]
          };
        },
        _renderIssueItems(items, device) {
          if (!items || !items.length) {
            return `<div class="issues-empty"><i class="ph ph-wrench"></i><div><div class="ie-title">قريباً</div><div class="ie-desc">نجهّز المشاكل الشائعة لهذا الجهاز. حالياً شاهد مقطع الشرح بالأعلى.</div></div></div>`;
          }
          return items.map(it => {
            if (it.kind === 'browsers') return this._browserSupportHTML(device);
            return `<details class="issue-card">
  <summary class="ic-head">
    <span class="ic-ico"><i class="ph ${it.icon || 'ph-question'}"></i></span>
    <span class="ic-title">${it.title || ''}</span>
    <i class="ph ph-caret-down ic-caret"></i>
  </summary>
  <div class="ic-body">${it.body || ''}</div>
</details>`;
          }).join('');
        },
        _showIssuesModal(preferred) {
          const clips = this._guideClips();
          const issues = this._commonIssues();
          const active = clips.some(c => c.id === preferred) ? preferred : this._guessDevice();
          const tabs = clips.map(c => `<button type="button" class="guide-tab${c.id === active ? ' active' : ''}" data-clip="${c.id}"><i class="ph ${c.icon}"></i><span>${c.label}</span></button>`).join('');
          const html = `<div id="issues-modal-content" class="custom-scrollbar">
  <div class="guide-tabs" role="tablist">${tabs}</div>
  <div class="issues-panel" id="issues-panel"></div>
  ${this._supportContactHTML('واجهت مشكلة مختلفة؟')}
</div>`;
          Swal.fire({
            title: 'مشاكل شائعة', html, confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup wide-swal issues-swal' },
            didOpen: (popup) => {
              const panel = popup.querySelector('#issues-panel');
              const select = (id) => {
                const clip = clips.find(c => c.id === id) || clips[0];
                popup.querySelectorAll('.guide-tab').forEach(b => b.classList.toggle('active', b.dataset.clip === clip.id));
                panel.innerHTML = `<button type="button" class="issue-video" data-clip="${clip.id}">
  <span class="iv-ico"><i class="ph-fill ph-play-circle"></i></span>
  <span class="iv-body"><span class="iv-title">شاهد مقطع شرح ${clip.label}</span><span class="iv-desc">${clip.desc}</span></span>
  <span class="iv-go"><i class="ph ph-arrow-left"></i></span>
</button>${this._renderIssueItems(issues[clip.id], clip.id)}`;
                panel.querySelector('.issue-video')?.addEventListener('click', () => this._showGuideModal(clip.id));
                panel.querySelectorAll('.ic-shot').forEach(fig => {
                  const img = fig.querySelector('img');
                  if (!img) return;
                  img.addEventListener('load', () => { fig.hidden = false; });
                  img.addEventListener('error', () => { fig.hidden = true; });
                  if (img.complete && img.naturalWidth) fig.hidden = false;
                  fig.querySelector('.ics-btn')?.addEventListener('click', () => {
                    const cap = fig.querySelector('figcaption');
                    this._openImageLightbox(img.getAttribute('src'), cap ? cap.textContent : '');
                  });
                });
              };
              popup.querySelectorAll('.guide-tab').forEach(btn => btn.addEventListener('click', () => select(btn.dataset.clip)));
              select(active);
            }
          });
        },
});
