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
                const applied = this._applyNewCoursesData(courses);
                this._toggleSettingsModal(false);
                this._afterDataUpdate(applied);
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
              { i: 'ph-gauge', t: 'حدود الساعات المسموحة', d: 'تنبيه في «جدولي» إذا تجاوزت الحد الأعلى أو نزلت عن الأدنى، محسوب من معدلك ونوع الفصل وحالة التخرج.' },
              { i: 'ph-arrow-counter-clockwise', t: 'التراجع عن الأخطاء', d: 'Ctrl + Z يرجّع أي إضافة أو حذف أو مسح للجدول، حتى ٣٠ خطوة للخلف.' },
              { i: 'ph-magic-wand', t: 'إنشاء الجدول الذكي', d: 'توليد تلقائي لجدول بلا تعارض حسب نمطك، أيام إجازتك، ودكاترتك المفضلين، أو بالوضع السريع بضغطة وحدة.' },
              { i: 'ph-squares-four', t: 'معاينة الجدول المقترح', d: 'شوف كل تركيبة مقترحة على شكل جدول أسبوعي وتنقّل بينها قبل ما تعتمد أي واحد.' },
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
              { i: 'ph-git-diff', t: 'ما الذي تغيّر؟', d: 'عند كل تحديث للبيانات: تقرير بما فُتح وأُغلق وتغيّرت مواعيده أو محاضروه، ومقرراتك أنت في المقدمة — مع الحفاظ على جدولك.' },
              { i: 'ph-chart-bar', t: 'تحليل الوقت', d: 'ساعات الحضور، الفراغات، وأيام الإجازة في لمحة واحدة.' },
              { i: 'ph-note-pencil', t: 'ملاحظات المقررات', d: 'دوّن رابط قروب المقرر أو تغيير القاعة أو أي تفصيلة، وتبقى محفوظة مع الجدول.' },
              { i: 'ph-eye', t: 'وضع المعاينة', d: 'جرّب الموقع ببيانات تجريبية كاملة قبل تثبيت الأداة.' }
            ]},
            { icon: 'ph-graduation-cap', title: 'الشرح وسهولة الوصول', items: [
              { i: 'ph-monitor-play', t: 'مقاطع الشرح', d: 'ثلاثة مقاطع قصيرة لتثبيت الأداة على الجوال واللوحي والكمبيوتر، تُعرض داخل الموقع مباشرة.' },
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
        _totalCreditsOf(selectedCourses) {
          let total = 0; const seen = new Set();
          (selectedCourses || []).forEach(c => { if (!seen.has(c.code)) { total += parseInt(c.hours, 10) || 0; seen.add(c.code); } });
          return total;
        },
        _hoursText(n) {
          if (n === 1) return 'ساعة واحدة';
          if (n === 2) return 'ساعتان';
          if (n >= 3 && n <= 10) return `${n} ساعات`;
          return `${n} ساعة`;
        },
        _formatGpa(raw) {
          const digits = String(raw === null || raw === undefined ? '' : raw).replace(/\D/g, '').slice(0, 3);
          if (!digits) return '';
          const out = digits.length === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
          return parseFloat(out) > 5 ? '5' : out;
        },
        _hoursTextBi(n) {
          if (n === 1) return 'بساعة واحدة';
          if (n === 2) return 'بساعتين';
          if (n >= 3 && n <= 10) return `بـ ${n} ساعات`;
          return `بـ ${n} ساعة`;
        },
        _creditLimits() {
          const s = this.state.userSettings;
          const raw = parseFloat(s.creditGpa);
          const gpa = isFinite(raw) && raw > 0 ? raw : null;
          const summer = s.creditTermType === 'summer';
          const grad = !!s.creditGraduating;
          if (summer) return { summer, grad, gpa, gpaCap: null, min: 0, max: grad ? 13 : 10 };
          const gpaCap = gpa === null ? 20 : (gpa >= 2.76 ? 20 : gpa >= 2.00 ? 16 : 14);
          return { summer, grad, gpa, gpaCap, min: 12, max: gpaCap >= 20 ? (grad ? 23 : 20) : gpaCap };
        },
        _creditStatus(totalCredits) {
          const limits = this._creditLimits();
          const total = parseInt(totalCredits, 10) || 0;
          let state = 'ok';
          if (total > limits.max) state = 'over';
          else if (limits.min > 0 && total < limits.min) state = 'under';
          return Object.assign({}, limits, { total, state });
        },
        _creditMeterHTML(st) {
          const span = Math.max(st.max, st.total, 1);
          const pct = Math.max(2, Math.min(100, Math.round((st.total / span) * 100)));
          const maxPct = Math.max(0, Math.min(100, Math.round((st.max / span) * 100)));
          const minPct = st.min > 0 ? Math.max(0, Math.min(100, Math.round((st.min / span) * 100))) : -1;
          const minMark = minPct >= 0 ? `<span class="cam-mark cam-min" style="inset-inline-start:${minPct}%"></span>` : '';
          return `<div class="ca-meter"><span class="cam-fill" style="width:${pct}%"></span><span class="cam-mark cam-max" style="inset-inline-start:${maxPct}%"></span>${minMark}</div>`;
        },
        _buildCreditAlert(totalCredits, idPrefix) {
          const st = this._creditStatus(totalCredits);
          const id = `${idPrefix}-credit-btn`;
          if (st.state === 'ok') {
            return `<button type="button" class="credit-chip" id="${id}" title="حدود الساعات المسموحة">
                <i class="ph-fill ph-gauge"></i>
                <span class="cch-nums"><b>${st.total}</b><span class="cch-sep">/</span>${st.max}</span>
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
        _bookmarkletCode() {
          return `javascript:!function(){var e=document.createElement('script');e.src='https://mutlaq001.github.io/schedule/extractor.js?v='+Date.now(),document.head.appendChild(e)}();`;
        },
        _updateBookmarkletCode() {
          const code = this._bookmarkletCode();
          const container = this.dom.installSectionContainer;
          const demoBtn = `<button class="data-btn" id="demo-mode-btn"><i class="ph ph-eye"></i> ألقِ نظرة</button>`;
          const guideBtn = `<button class="data-btn" id="guide-videos-btn"><i class="ph ph-monitor-play"></i> مقاطع الشرح</button>`;
          const issuesBtn = `<button class="data-btn" id="common-issues-btn"><i class="ph ph-lifebuoy"></i> مشاكل شائعة</button>`;
          if (isMobile) { container.innerHTML = `<div id="install-header"><i class="ph ph-device-mobile"></i><h2>التثبيت على الجوال</h2></div><div id="install-section-mobile"><ol><li data-step="1">اضغط على زر "نسخ الكود" بالأسفل.</li><li data-step="2">اذهب لصفحة "المقررات المطروحة" في موقع الجامعة.</li><li data-step="3">الصق الكود في شريط العنوان ثم اضغط "اذهب".</li></ol><div class="install-actions"><button id="copy-code-btn"><i class="ph ph-clipboard-text"></i> نسخ الكود</button><div class="or-divider">أو</div><div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">${demoBtn}${guideBtn}<button class="data-btn" id="features-btn"><i class="ph ph-sparkle"></i> المميزات</button><a href="tutorial.html" class="tutorial-cta"><i class="ph-fill ph-play-circle"></i> شرح تفاعلي</a>${issuesBtn}</div></div><div class="js-warning">قد يحذف المتصفح <code>javascript:</code> تأكد من إعادتها يدوياً.</div></div>`; const copyBtn = container.querySelector('#copy-code-btn'); copyBtn.addEventListener('click', (e) => { e.preventDefault(); navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم نسخ الكود بنجاح!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); }); }
          else { container.innerHTML = `<div id="install-header"><i class="ph ph-arrows-out-cardinal"></i><h2>التثبيت على الكمبيوتر</h2></div><p>اسحب هذا الزر إلى شريط الإشارات المرجعية في متصفحك، ثم اضغط عليه وأنت في صفحة المقررات المطروحة.</p><div class="install-actions"><a class="bookmarklet-button" href="${code}" onclick="Swal.fire({title:'خطأ!', text:'لا تضغط على الزر، بل قم بسحبه إلى شريط الإشارات المرجعية.', icon:'error'}); return false;"><i class="ph ph-magic-wand"></i> QU Schedule</a><div class="or-divider">أو</div><div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">${demoBtn}<button class="data-btn" id="tablet-mode-btn"><i class="ph ph-device-tablet"></i> للوحيات</button>${guideBtn}<button class="data-btn" id="features-btn"><i class="ph ph-sparkle"></i> المميزات</button><a href="tutorial.html" class="tutorial-cta"><i class="ph-fill ph-play-circle"></i> شرح تفاعلي</a>${issuesBtn}</div></div>`; container.querySelector('#tablet-mode-btn')?.addEventListener('click', () => { navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم نسخ كود اللوحيات بنجاح!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); }); }
          document.getElementById('demo-mode-btn')?.addEventListener('click', () => this._startDemoMode());
          document.getElementById('features-btn')?.addEventListener('click', () => this._showFeaturesModal());
          document.getElementById('guide-videos-btn')?.addEventListener('click', () => this._showGuideModal());
          document.getElementById('common-issues-btn')?.addEventListener('click', () => this._showIssuesModal());
        },
      });
