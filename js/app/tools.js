Object.assign(QU_ScheduleApp, {
        _handleExportICS() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) { this._showToast('error', 'الجدول فارغ!'); return; }
          const secs = Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const pad = n => String(n).padStart(2, '0');
          const now = new Date();
          const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
          const nextDate = (dayIdx) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((dayIdx - d.getDay() + 7) % 7)); return d; };
          const fmt = (d, hms) => { const p = hms.split(':'); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(parseInt(p[0], 10))}${pad(parseInt(p[1], 10))}00`; };
          const esc = t => String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
          const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QU Schedule//AR//', 'CALSCALE:GREGORIAN'];
          secs.forEach(sec => (sec.timeSlots || []).forEach((slot, k) => {
            const d = nextDate(slot.day);
            lines.push('BEGIN:VEVENT', `UID:${sec.uniqueId}-${k}@qu-schedule`, `DTSTAMP:${dtstamp}`, `DTSTART:${fmt(d, slot.start)}`, `DTEND:${fmt(d, slot.end)}`, 'RRULE:FREQ=WEEKLY;COUNT=15', `SUMMARY:${esc(sec.name)} (${esc(sec.code)})`);
            if (sec.location) lines.push(`LOCATION:${esc(sec.location)}`);
            lines.push(`DESCRIPTION:${esc('شعبة ' + sec.section + (sec.instructor ? ' — ' + sec.instructor : ''))}`, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:تذكير محاضرة', 'END:VALARM', 'END:VEVENT');
          }));
          lines.push('END:VCALENDAR');
          const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'qu_schedule.ics'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          this._showToast('success', 'تم تصدير ملف التقويم (.ics).');
        },
        _handleTimeAnalysis() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) { this._showToast('error', 'الجدول فارغ!'); return; }
          const secs = Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const byDay = {}; let totalMin = 0;
          secs.forEach(s => (s.timeSlots || []).forEach(t => { (byDay[t.day] = byDay[t.day] || []).push(t); totalMin += this._toMin(t.end) - this._toMin(t.start); }));
          const activeDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);
          if (activeDays.length === 0) { this._showToast('info', 'لا توجد محاضرات ذات مواعيد محددة.'); return; }
          let totalGap = 0;
          const fmtM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          const rows = activeDays.map(d => {
            const slots = byDay[d].slice().sort((a, b) => this._toMin(a.start) - this._toMin(b.start));
            const first = this._toMin(slots[0].start), last = this._toMin(slots[slots.length - 1].end);
            let gap = 0; for (let i = 1; i < slots.length; i++) { const g = this._toMin(slots[i].start) - this._toMin(slots[i - 1].end); if (g > 0) gap += g; }
            totalGap += gap;
            return `<div class="analysis-day-row"><span class="d-name">${dayNames[d]}</span><span class="d-info">${fmtM(first)} - ${fmtM(last)} · ${slots.length} محاضرة${gap > 0 ? ` · فراغ ${Math.round(gap / 6) / 10}س` : ''}</span></div>`;
          }).join('');
          const hrs = m => Math.round(m / 6) / 10;
          const offDays = 5 - activeDays.filter(d => d < 5).length;
          const html = `<div class="analysis-grid"><div class="analysis-card"><div class="a-value">${hrs(totalMin)}</div><div class="a-label">ساعات الحضور</div></div><div class="analysis-card"><div class="a-value">${activeDays.length}</div><div class="a-label">أيام دراسية</div></div><div class="analysis-card"><div class="a-value">${hrs(totalGap)}</div><div class="a-label">ساعات الفراغات</div></div><div class="analysis-card"><div class="a-value">${offDays < 0 ? 0 : offDays}</div><div class="a-label">إجازة (أحد-خميس)</div></div></div><div class="analysis-days">${rows}</div>`;
          Swal.fire({ title: 'تحليل الوقت', html, confirmButtonText: 'تم' });
        },
        _handleImportPaste() {
          Swal.fire({
            title: 'استيراد باللصق',
            html: `<p style="text-align:center;color:var(--color-text-muted);font-size:0.85rem;margin-bottom:0.5rem;">الصق محتوى ملف جدول مُصدَّر (JSON)، أو مصفوفة بيانات المقررات.</p><textarea id="paste-import-area" class="custom-textarea" placeholder="الصق هنا..." style="min-height:140px;"></textarea>`,
            showCancelButton: true, confirmButtonText: 'استيراد', cancelButtonText: 'إلغاء',
            preConfirm: () => { const v = (document.getElementById('paste-import-area').value || '').trim(); if (!v) { Swal.showValidationMessage('الحقل فارغ'); return false; } try { return JSON.parse(v); } catch (e) { Swal.showValidationMessage('صيغة JSON غير صالحة'); return false; } }
          }).then(res => {
            if (!res.isConfirmed || !res.value) return;
            const data = res.value;
            try {
              if (Array.isArray(data)) {
                const courses = this._sanitizeCourses(data);
                this.state.isDemoMode = false;
                localStorage.setItem(this.constants.STORAGE_KEYS.COURSES, JSON.stringify(courses));
                this._markDataUpdated();
                this.state.schedules = []; this._addSchedule(null, true); this.state.activeScheduleIndex = 0; this._saveSchedules();
                this._processAndDisplayData(courses); this.updateFullUI(); this._toggleSettingsModal(false);
                this._showToast('success', `تم تحميل ${courses.length} شعبة.`);
              } else if (data && Array.isArray(data.schedule)) {
                if (this.state.allCoursesData.length === 0) { this._showToast('error', 'حمّل بيانات المقررات أولاً.'); return; }
                const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                this._addSchedule(`مستورد ${time}`, false); const ns = this.state.schedules[this.state.schedules.length - 1];
                data.schedule.forEach(id => { if (this.state.allCoursesData.some(c => c.uniqueId === id)) ns.sections.add(id); });
                if (data.linked && Array.isArray(data.linked)) ns.linkedSections = new Map(data.linked.map(([k, v]) => [k, new Set(v)]));
                this.state.activeScheduleIndex = this.state.schedules.length - 1;
                this.updateFullUI(); this._toggleSettingsModal(false); this._showToast('success', 'تم استيراد الجدول.');
              } else { this._showToast('error', 'محتوى غير معروف.'); }
            } catch (e) { this._showToast('error', 'تعذّر الاستيراد.'); }
          });
        },
        _handleTabClick(button) {
          const parentSidebar = button.closest('.sidebar');
          parentSidebar.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); button.classList.add('active');
          parentSidebar.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active')); document.getElementById(button.dataset.tab).classList.add('active');
          if (button.dataset.tab === 'courses-tab') {
            this.dom.quickVisibilityWrapper.style.display = 'block';
          } else {
            this.dom.quickVisibilityWrapper.style.display = 'none';
          }
        },
        _handleMobileNav(button) {
          const view = button.dataset.view;
          this.dom.mobileNavButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active');
          this.dom.mobileViewContents.forEach(content => { content.style.display = 'none'; content.classList.remove('active'); });
          const targetView = document.getElementById(view); if (targetView) { targetView.style.display = 'flex'; targetView.classList.add('active'); }
          this._updateMobileHeader(); if (view === 'mobile-calendar-view') { setTimeout(() => { if (this.state.calendar) this.state.calendar.updateSize() }, 50); }
        },
        _showFeaturesModal() {
          const groups = [
            { icon: 'ph-calendar-plus', title: 'بناء الجدول', items: [
              { i: 'ph-calendar-blank', t: 'تقويم تفاعلي', d: 'عرض محاضراتك على تقويم أسبوعي حي مع الشعبة والدكتور والقاعة.' },
              { i: 'ph-stack', t: 'جداول متعددة', d: 'أنشئ أكثر من جدول، قارن بينها، وبدّل بضغطة واحدة.' },
              { i: 'ph-cursor-click', t: 'بطاقة المحاضرة', d: 'اضغط أي محاضرة في التقويم لعرض تفاصيلها، تبديل شعبتها، نسخ رقمها، أو إزالتها.' },
              { i: 'ph-warning-octagon', t: 'كشف التعارضات', d: 'بطاقة توضح المقرر المتعارض واليوم والوقت المتداخل ومدته، مع أداة لحل التعارضات دفعة واحدة.' },
              { i: 'ph-arrow-counter-clockwise', t: 'التراجع عن الأخطاء', d: 'Ctrl + Z يرجّع أي إضافة أو حذف أو مسح للجدول، حتى ٣٠ خطوة للخلف.' },
              { i: 'ph-magic-wand', t: 'إنشاء الجدول الذكي', d: 'توليد تلقائي لجدول بلا تعارض حسب نمطك، أيام إجازتك، ودكاترتك المفضلين.' },
              { i: 'ph-file-text', t: 'جدول الاختبارات', d: 'مواعيد الاختبارات النهائية لموادك، بالفترات أو بالتواريخ الهجرية والميلادية.' }
            ]},
            { icon: 'ph-magnifying-glass', title: 'البحث والترشيح', items: [
              { i: 'ph-magnifying-glass', t: 'بحث فوري', d: 'ابحث بالاسم أو الرمز أو رقم الشعبة، مع اختصار ( / ) للوصول السريع.' },
              { i: 'ph-funnel', t: 'ترشيح الشعب', d: 'رشّح حسب الأيام أو الفترة الصباحية والمسائية، أو اعرض ما لا يتعارض مع جدولك فقط.' },
              { i: 'ph-star', t: 'الدكاترة المفضلون', d: 'ضع نجمة على من تفضّلهم لتظهر شعبهم مميزة، ويعتمدها الجدول الذكي في التوليد.' },
              { i: 'ph-eye-slash', t: 'تنظيف القائمة', d: 'أخفِ الشعب المغلقة أو المقررات التي لا تخصك لتبقى القائمة مرتبة.' }
            ]},
            { icon: 'ph-share-network', title: 'التسجيل والمشاركة', items: [
              { i: 'ph-clipboard-text', t: 'نسخ أرقام الشعب', d: 'انسخ أرقام شعب جدولك (CRN) بضغطة واحدة للتسجيل السريع.' },
              { i: 'ph-lightning', t: 'مُعِدّ أداة التعبئة', d: 'أداة تعبئ أرقام شعبك تلقائياً في صفحة التسجيل بموقع الجامعة.' },
              { i: 'ph-qr-code', t: 'مشاركة برابط أو QR', d: 'شارك جدولك مع زملائك برابط مباشر أو رمز QR.' },
              { i: 'ph-users-three', t: 'مقارنة مع الأصدقاء', d: 'ألصق أرقام شعب زملائك لتعرفوا الأوقات الفارغة المشتركة بينكم.' }
            ]},
            { icon: 'ph-download-simple', title: 'التصدير والحفظ', items: [
              { i: 'ph-calendar-check', t: 'تصدير للتقويم (.ics)', d: 'افتح جدولك في تقويم Google أو Apple مع تنبيهات قبل المحاضرة.' },
              { i: 'ph-image', t: 'حفظ كصورة', d: 'صدّر جدولك كصورة عالية الجودة جاهزة للمشاركة أو خلفية للشاشة.' },
              { i: 'ph-cloud-arrow-down', t: 'نسخ احتياطي', d: 'تصدير واستيراد جدولك كملف JSON أو باللصق المباشر.' },
              { i: 'ph-floppy-disk', t: 'حفظ تلقائي', d: 'كل تغييراتك تُحفظ في جهازك فوراً وتبقى بعد إغلاق الصفحة.' }
            ]},
            { icon: 'ph-palette', title: 'تخصيص المظهر', items: [
              { i: 'ph-moon-stars', t: 'وضع ليلي وفاتح', d: 'بدّل بين الوضعين مع حفظ اختيارك تلقائياً.' },
              { i: 'ph-paint-brush', t: 'ألوانك المفضلة', d: 'غيّر اللون الأساسي للموقع وخصص لوناً مميزاً لكل مقرر.' },
              { i: 'ph-calendar', t: 'عرض مرن', d: 'إظهار أو إخفاء عطلة نهاية الأسبوع، وتغيير موضع محور الوقت.' },
              { i: 'ph-gauge', t: 'وضع الأداء العالي', d: 'إلغاء التأثيرات البصرية لتجربة أسرع على الأجهزة الضعيفة.' }
            ]},
            { icon: 'ph-sparkle', title: 'أدوات ذكية', items: [
              { i: 'ph-chart-bar', t: 'تحليل الوقت', d: 'ساعات الحضور، الفراغات، وأيام الإجازة في لمحة واحدة.' },
              { i: 'ph-note-pencil', t: 'ملاحظات المقررات', d: 'دوّن رابط قروب المقرر أو تغيير القاعة أو أي تفصيلة، وتبقى محفوظة مع الجدول.' },
              { i: 'ph-eye', t: 'وضع المعاينة', d: 'جرّب الموقع ببيانات تجريبية كاملة قبل تثبيت الأداة.' }
            ]},
            { icon: 'ph-graduation-cap', title: 'الشرح وسهولة الوصول', items: [
              { i: 'ph-play-circle', t: 'شرح تفاعلي', d: 'صفحة شرح كاملة تمشي معك خطوة بخطوة من تثبيت الأداة حتى تسجيل جدولك.' },
              { i: 'ph-compass', t: 'جولة إرشادية', d: 'جولة داخل الموقع تعرّفك على كل زر عند أول استخدام، ويمكنك إعادتها متى شئت.' },
              { i: 'ph-keyboard', t: 'اختصارات لوحة المفاتيح', d: 'اختصارات سريعة للبحث والجدول الذكي والتنقل بين جداولك، اضغط ( ؟ ) لعرضها.' },
              { i: 'ph-device-mobile', t: 'تثبيت كتطبيق', d: 'ثبّت الموقع على شاشتك الرئيسية وافتح جدولك حتى بدون إنترنت.' },
              { i: 'ph-devices', t: 'يعمل على كل الأجهزة', d: 'تصميم متجاوب للجوال والتابلت والكمبيوتر، مع دعم التنقل بلوحة المفاتيح وقارئات الشاشة.' }
            ]}
          ];
          const html = `<div id="features-modal-content" class="custom-scrollbar">${groups.map(g => `<div class="features-group"><div class="features-group-header"><span class="fg-icon"><i class="ph ${g.icon}"></i></span><h4>${g.title}</h4></div><div class="features-items">${g.items.map(f => `<div class="feature-item"><i class="ph ${f.i}"></i><div><div class="f-title">${f.t}</div><div class="f-desc">${f.d}</div></div></div>`).join('')}</div></div>`).join('')}</div>`;
          Swal.fire({ title: 'مميزات QU Schedule', html, confirmButtonText: 'رائع!', customClass: { popup: 'swal2-popup wide-swal' } });
        },
        _updateBookmarkletCode() {
          const code = `javascript:!function(){var e=document.createElement('script');e.src='https://mutlaq001.github.io/schedule/extractor.js?v='+Date.now(),document.head.appendChild(e)}();`;
          const container = this.dom.installSectionContainer;
          const demoBtn = `<button class="data-btn" id="demo-mode-btn"><i class="ph ph-eye"></i> ألقِ نظرة</button>`;
          const helpBtnStyle = `text-decoration: none;`;
          if (isMobile) { container.innerHTML = `<div id="install-header"><i class="ph ph-device-mobile"></i><h2>التثبيت على الجوال</h2></div><div id="install-section-mobile"><ol><li data-step="1">اضغط على زر "نسخ الكود" بالأسفل.</li><li data-step="2">اذهب لصفحة "المقررات المطروحة" في موقع الجامعة.</li><li data-step="3">الصق الكود في شريط العنوان ثم اضغط "اذهب".</li></ol><div class="install-actions"><button id="copy-code-btn"><i class="ph ph-clipboard-text"></i> نسخ الكود</button><div class="or-divider">أو</div><div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">${demoBtn}<a href="https://t.me/zalam_0/66" target="_blank" class="data-btn" style="${helpBtnStyle}"><i class="ph ph-question"></i> شرح</a><button class="data-btn" id="features-btn"><i class="ph ph-sparkle"></i> المميزات</button><a href="tutorial.html" class="tutorial-cta"><i class="ph-fill ph-play-circle"></i> شرح تفاعلي</a></div></div><div class="js-warning">قد يحذف المتصفح <code>javascript:</code> تأكد من إعادتها يدوياً.</div></div>`; const copyBtn = container.querySelector('#copy-code-btn'); copyBtn.addEventListener('click', (e) => { e.preventDefault(); navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم نسخ الكود بنجاح!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); }); }
          else { container.innerHTML = `<div id="install-header"><i class="ph ph-arrows-out-cardinal"></i><h2>التثبيت على الكمبيوتر</h2></div><p>اسحب هذا الزر إلى شريط الإشارات المرجعية في متصفحك، ثم اضغط عليه وأنت في صفحة المقررات المطروحة.</p><div class="install-actions"><a class="bookmarklet-button" href="${code}" onclick="Swal.fire({title:'خطأ!', text:'لا تضغط على الزر، بل قم بسحبه إلى شريط الإشارات المرجعية.', icon:'error'}); return false;"><i class="ph ph-magic-wand"></i> QU Schedule</a><div class="or-divider">أو</div><div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">${demoBtn}<button class="data-btn" id="tablet-mode-btn"><i class="ph ph-device-tablet"></i> للأوحيات</button><a href="https://t.me/Qassim_QU/202" target="_blank" class="data-btn" style="${helpBtnStyle}"><i class="ph ph-question"></i> شرح</a><button class="data-btn" id="features-btn"><i class="ph ph-sparkle"></i> المميزات</button><a href="tutorial.html" class="tutorial-cta"><i class="ph-fill ph-play-circle"></i> شرح تفاعلي</a></div></div>`; container.querySelector('#tablet-mode-btn')?.addEventListener('click', () => { navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم نسخ كود الأوحيات بنجاح!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); }); }
          document.getElementById('demo-mode-btn')?.addEventListener('click', () => this._startDemoMode());
          document.getElementById('features-btn')?.addEventListener('click', () => this._showFeaturesModal());
        },
      });
