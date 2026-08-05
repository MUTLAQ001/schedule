

Ran 3 commands, used 4 tools
Found it — the button was rendering in Arial instead of the site font, which is what made it a different height:


Ran 2 commands, used 3 tools
صار بنفس الحجم بالضبط:

العنصر	الارتفاع
شرائح الإحصائيات	32.19 px
شريحة الساعات	32.22 px
زر «حل التعارض»	32.19 px
السبب الحقيقي للفرق لم يكن الحشو — الزر كان يرسم نصه بخط Arial بدل خط الموقع. عناصر <button> لا ترث font-family تلقائياً، والقاعدة الأساسية للزر ما كانت تحدده، فالنص العربي كان يطلع بخط مختلف وارتفاع سطر أقصر.

التعديلان:

font-family: inherit على .view-conflicts-btn — أصلح الخط والارتفاع معاً، وينطبق كذلك على نسخة الزر في تذييل الجوال اللي كانت تعاني نفس المشكلة.
ضبط الحشو والوزن والحدود داخل شريط الإحصائيات ليطابق .stat-chip تماماً، مع إلغاء الظل الثقيل والارتفاع عند المرور.
الملف الوحيد اللي تغيّر: css/styles.css — بدون تعليقات، ولا أخطاء في الـ console.

و تاكد ان ما فيه اي كومنت بالكود وحتى ب اللي سويناه قبل


Created scan.py, ran a command
+138
-0
Zero found — but let me verify the scanner actually detects comments before trusting that:

Validated the comment scanner on known samples
Scanner validated — it catches all 5 comment types and correctly ignores URLs, regexes, strings, template literals, and division. Now confirming coverage:

Listed scanned files vs all repo files
نظيف تماماً — صفر تعليقات في كامل المشروع.

التغطية: ٢٥ ملف كود (٢١ جافاسكربت + ٢ CSS + ٢ HTML). الملفات الباقية إما صور أو فيديو أو manifest.json (JSON أصلاً ما يقبل تعليقات) أو README.md.

الفحص شمل:

تعليقات السطر //
تعليقات الكتلة /* */
تعليقات HTML <!-- -->
تعليقات داخل وسوم <script> المضمّنة في index.html و tutorial.html
تحققت من الفاحص نفسه قبل ما أثق بنتيجته — جرّبته على ملفات فيها تعليقات معروفة:

ما يجب أن يكتشفه	النتيجة
// تعليق سطر	✅ اكتشفه
/* تعليق كتلة */	✅ اكتشفه
/* تعليق CSS */	✅ اكتشفه
<!-- تعليق HTML -->	✅ اكتشفه
// داخل <script>	✅ اكتشفه
ما يجب أن يتجاهله	النتيجة
https://example.com	✅ تجاهله
/a\/b/g (تعبير نمطي)	✅ تجاهله
"not // a comment" (نص)	✅ تجاهله
`/* not */` (قالب نصي)	✅ تجاهله
3 / 4 (قسمة)	✅ تجاهله
url("http://x/y.png")	✅ تجاهله
يعني ٥ من ٥ اكتشاف صحيح، و٦ من ٦ تجاهل صحيح — فنتيجة الصفر على مشروعك موثوقة، وتشمل كل شي عدّلناه من أول الجلسة: tools.js، schedule-ui.js، settings.js، core.js، styles.css، و sw.js.

شوف ما فيه رقم اكب من خمسه و اذا كتب مثل  432 يصير 4.32 زي كذا و ما ابي الاسهم


Ran a command, edited and read tools.js
+14
-3
Now hiding the spinner arrows in CSS as a belt-and-braces measure:


Ran 4 commands, used 5 tools
الثلاث طلبات تمّت. غيّرت الحقل من type="number" إلى type="text" مع inputmode="decimal" — هذا شال الأسهم نهائياً (وخلّى لوحة المفاتيح الرقمية تظهر بالجوال)، وأضفت تنسيق تلقائي أثناء الكتابة.

نتائج التجربة الفعلية بالكتابة حرف حرف:

يكتب	يظهر	يُحفظ
432	4.32	4.32
375	3.75	3.75
3.75	3.75	3.75
6	5	5
55	5	5
1234	1.23	1.23
05	0.5	0.5
(فارغ)	—	بدون تحديد
كيف يشتغل: يأخذ الأرقام فقط ويتجاهل أي شي ثاني، أول رقم يصير الصحيح والباقي كسور (حد أقصى رقمين بعد الفاصلة)، وإذا الناتج تجاوز ٥ يُثبّت على ٥ فوراً.

الأسهم: انشالت لأن حقول النص ما ترسم عدّاد أصلاً. وأضفت كذلك قواعد ::-webkit-inner-spin-button و appearance: textfield كطبقة احتياطية لو رجع أي حقل number مستقبلاً.

المسح: الحذف يشتغل طبيعي — 4.32 ← 4.3 ← 4 ← فارغ، وعند الفراغ يرجع الحد لـ ٢٠ ويختفي أثر المعدل.

الملفان المعدّلان: js/app/tools.js و css/styles.css — أعدت فحص المشروع كامل: صفر تعليقات، ولا أخطاء في الـ console.



                <span class="cch-label">ساعة معتمدة</span>
                <i class="ph ph-caret-left cch-caret"></i>
              </button>`;
          }
          const over = st.state === 'over';
          const diff = over ? st.total - st.max : st.min - st.total;
          const termWord = st.summer ? 'الفصل الصيفي' : 'الفصل العادي';
          const title = over ? `تجاوزت الحد الأعلى ${this._hoursTextBi(diff)}` : `أقل من الحد الأدنى ${this._hoursTextBi(diff)}`;
          const sub = over
            ? `مسجّل ${this._hoursText(st.total)}، والمسموح لك ${this._hoursText(st.max)} في ${termWord}.`
            : `مسجّل ${this._hoursText(st.total)}، والحد الأدنى ${this._hoursText(st.min)} — التسجيل ممكن، لكن اطّلع على التوضيح.`;
          return `<div class="credit-alert ${over ? 'over' : 'under'}" role="status">
              <span class="ca-icon"><i class="ph-fill ${over ? 'ph-warning-octagon' : 'ph-info'}"></i></span>
              <div class="ca-body">
                <div class="ca-title">${title}</div>
                <p class="ca-sub">${sub}</p>
                ${this._creditMeterHTML(st)}
              </div>
              <button type="button" class="ca-btn" id="${id}"><i class="ph-fill ph-sliders-horizontal"></i><span>التفاصيل</span><i class="ph ph-caret-left ca-btn-caret"></i></button>
            </div>`;
        },
        _creditRulesHTML() {
          const regular = [
            ['الحد الأعلى — معدل 2.76 فأعلى', '20'],
            ['الحد الأعلى — معدل 2.00 إلى 2.75', '16'],
            ['الحد الأعلى — معدل 1.99 فأقل', '14'],
            ['الحد الأعلى للمتوقع تخرجه', '23'],
            ['الحد الأعلى لغير الخريج', '20'],
            ['الحد الأدنى', '12']
          ];
          const summer = [
            ['الحد الأعلى لغير الخريج', '10'],
            ['الحد الأعلى للمتوقع تخرجه', '13'],
            ['الحد الأدنى', 'لا يوجد']
          ];
          const rows = list => list.map(r => `<div class="crl-row"><span class="crl-label">${r[0]}</span><span class="crl-val">${r[1]}</span></div>`).join('');
          return `<div class="credit-rules">
              <div class="crl-card"><div class="crl-head"><i class="ph ph-books"></i> الفصل العادي</div>${rows(regular)}</div>
              <div class="crl-card"><div class="crl-head"><i class="ph ph-sun"></i> الفصل الصيفي</div>${rows(summer)}</div>
            </div>`;
        },
        _creditHeroHTML(st) {
          const label = st.state === 'over' ? 'تجاوزت الحد' : st.state === 'under' ? 'أقل من الحد الأدنى' : 'ضمن المسموح';
          const range = st.min > 0 ? `${st.min} — ${st.max}` : `حتى ${st.max}`;
          let gpaNote;
          if (st.summer) gpaNote = st.grad ? 'حد المتوقع تخرجه في الصيفي: 13 ساعة.' : 'الحد في الفصل الصيفي لا يتأثر بالمعدل.';
          else if (st.gpa === null) gpaNote = `لم تُدخل معدلك — الحد محسوب على ${st.max} ساعة.`;
          else if (st.grad && st.gpaCap < 20) gpaNote = `معدلك (${st.gpa}) يحدّك بـ ${st.gpaCap} ساعة، وهو يغلب حد المتوقع تخرجه.`;
          else gpaNote = `حدّك حسب معدلك (${st.gpa}) هو ${st.gpaCap} ساعة${st.grad && st.max > st.gpaCap ? `، ومرفوع إلى ${st.max} كمتوقع تخرجه` : ''}.`;
          return `<div class="credit-hero ${st.state}">
              <div class="chr-top">
                <div class="chr-nums"><b>${st.total}</b><span>/ ${st.max}</span></div>
                <span class="chr-badge">${label}</span>
              </div>
              ${this._creditMeterHTML(st)}
              <div class="chr-foot"><span>المسموح لك: <b>${range}</b> ساعة</span><span class="chr-note">${gpaNote}</span></div>
            </div>`;
        },
        _showCreditLimitsModal(totalCredits) {
          const s = this.state.userSettings;
          const summer = s.creditTermType === 'summer';
          const html = `<div id="credit-modal-content" class="custom-scrollbar">
              <div id="credit-hero-slot">${this._creditHeroHTML(this._creditStatus(totalCredits))}</div>
              <div class="credit-form">
                <div class="crf-row">
                  <div class="crf-label"><span>نوع الفصل</span><small>يحدد الحد الأعلى والأدنى.</small></div>
                  <div class="mode-toggle" id="credit-term-toggle"><button type="button" class="mode-btn ${summer ? '' : 'active'}" data-term="regular">عادي</button><button type="button" class="mode-btn ${summer ? 'active' : ''}" data-term="summer">صيفي</button></div>
                </div>
                <div class="crf-row">
                  <div class="crf-label"><span>متوقع التخرج</span><small>يرفع الحد الأعلى إلى 23 في العادي و13 في الصيفي.</small></div>
                  <label class="toggle-switch"><input type="checkbox" id="credit-grad-toggle" ${s.creditGraduating ? 'checked' : ''}><span class="slider"></span></label>
                </div>
                <div class="crf-row">
                  <div class="crf-label"><span>المعدل التراكمي</span><small>اتركه فارغاً إذا ما تبي تحدده.</small></div>
                  <input type="text" class="crf-input" id="credit-gpa-input" inputmode="decimal" maxlength="4" autocomplete="off" placeholder="مثال: 3.75" value="${this._formatGpa(s.creditGpa)}">
                </div>
              </div>
              ${this._creditRulesHTML()}
              <div class="credit-notes">
                <div class="crn-head"><i class="ph-fill ph-info"></i> توضيح الحد الأدنى</div>
                <ul>
                  <li>وقت الحذف والإضافة الموقع ما يعطيك حد أدنى، وتقدر تضيف أقل منه.</li>
                  <li>بعض الكليات ممكن تجبرك على زيادة ساعاتك.</li>
                  <li>إذا ساعاتك 12 فأقل ما راح تقدر تعتذر عن مقرر أثناء الفصل إلا بعذر تقبله الكلية.</li>
                </ul>
              </div>
            </div>`;
          Swal.fire({
            title: 'حدود الساعات المسموحة', html, confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup wide-swal credit-swal' },
            didOpen: (popup) => {
              const slot = popup.querySelector('#credit-hero-slot');
              const refresh = () => {
                this._saveSettings();
                slot.innerHTML = this._creditHeroHTML(this._creditStatus(totalCredits));
                this.updateCalendarAndConflicts();
              };
              popup.querySelector('#credit-term-toggle').addEventListener('click', (e) => {
                const btn = e.target.closest('.mode-btn');
                if (!btn) return;
                this.state.userSettings.creditTermType = btn.dataset.term;
                popup.querySelectorAll('#credit-term-toggle .mode-btn').forEach(b => b.classList.toggle('active', b === btn));
                refresh();
              });
              popup.querySelector('#credit-grad-toggle').addEventListener('change', (e) => {
                this.state.userSettings.creditGraduating = e.target.checked;
                refresh();
              });
              const gpaInput = popup.querySelector('#credit-gpa-input');
              gpaInput.addEventListener('input', () => {
                const formatted = this._formatGpa(gpaInput.value);
                if (gpaInput.value !== formatted) {
                  gpaInput.value = formatted;
                  try { gpaInput.setSelectionRange(formatted.length, formatted.length); } catch (e) { }
                }
                const v = parseFloat(formatted);
                this.state.userSettings.creditGpa = (formatted === '' || !isFinite(v)) ? null : v;
                refresh();
              });
            }
          });
        },
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
  <div class="guide-contact">
    <span class="gct-icon"><i class="ph-fill ph-question"></i></span>
    <div class="gct-body"><div class="gct-line">إذا واجهتك مشكلة</div><div class="gct-note">لا تنسَ ذكر نوع جهازك والمتصفح ليسهل حل المشكلة.</div></div>
    <a class="gct-btn" href="https://t.me/Mutlaq_ai_bot" target="_blank" rel="noopener noreferrer"><i class="ph ph-telegram-logo"></i> للتواصل</a>
  </div>
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
        _updateBookmarkletCode() {
          const code = `javascript:!function(){var e=document.createElement('script');e.src='https://mutlaq001.github.io/schedule/extractor.js?v='+Date.now(),document.head.appendChild(e)}();`;
          const container = this.dom.installSectionContainer;
          const demoBtn = `<button class="data-btn" id="demo-mode-btn"><i class="ph ph-eye"></i> ألقِ نظرة</button>`;
          const guideBtn = `<button class="data-btn" id="guide-videos-btn"><i class="ph ph-monitor-play"></i> مقاطع الشرح</button>`;
          if (isMobile) { container.innerHTML = `<div id="install-header"><i class="ph ph-device-mobile"></i><h2>التثبيت على الجوال</h2></div><div id="install-section-mobile"><ol><li data-step="1">اضغط على زر "نسخ الكود" بالأسفل.</li><li data-step="2">اذهب لصفحة "المقررات المطروحة" في موقع الجامعة.</li><li data-step="3">الصق الكود في شريط العنوان ثم اضغط "اذهب".</li></ol><div class="install-actions"><button id="copy-code-btn"><i class="ph ph-clipboard-text"></i> نسخ الكود</button><div class="or-divider">أو</div><div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">${demoBtn}${guideBtn}<button class="data-btn" id="features-btn"><i class="ph ph-sparkle"></i> المميزات</button><a href="tutorial.html" class="tutorial-cta"><i class="ph-fill ph-play-circle"></i> شرح تفاعلي</a></div></div><div class="js-warning">قد يحذف المتصفح <code>javascript:</code> تأكد من إعادتها يدوياً.</div></div>`; const copyBtn = container.querySelector('#copy-code-btn'); copyBtn.addEventListener('click', (e) => { e.preventDefault(); navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم نسخ الكود بنجاح!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); }); }
          else { container.innerHTML = `<div id="install-header"><i class="ph ph-arrows-out-cardinal"></i><h2>التثبيت على الكمبيوتر</h2></div><p>اسحب هذا الزر إلى شريط الإشارات المرجعية في متصفحك، ثم اضغط عليه وأنت في صفحة المقررات المطروحة.</p><div class="install-actions"><a class="bookmarklet-button" href="${code}" onclick="Swal.fire({title:'خطأ!', text:'لا تضغط على الزر، بل قم بسحبه إلى شريط الإشارات المرجعية.', icon:'error'}); return false;"><i class="ph ph-magic-wand"></i> QU Schedule</a><div class="or-divider">أو</div><div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">${demoBtn}<button class="data-btn" id="tablet-mode-btn"><i class="ph ph-device-tablet"></i> للوحيات</button>${guideBtn}<button class="data-btn" id="features-btn"><i class="ph ph-sparkle"></i> المميزات</button><a href="tutorial.html" class="tutorial-cta"><i class="ph-fill ph-play-circle"></i> شرح تفاعلي</a></div></div>`; container.querySelector('#tablet-mode-btn')?.addEventListener('click', () => { navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم نسخ كود اللوحيات بنجاح!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); }); }
          document.getElementById('demo-mode-btn')?.addEventListener('click', () => this._startDemoMode());
          document.getElementById('features-btn')?.addEventListener('click', () => this._showFeaturesModal());
          document.getElementById('guide-videos-btn')?.addEventListener('click', () => this._showGuideModal());
        },
      });
